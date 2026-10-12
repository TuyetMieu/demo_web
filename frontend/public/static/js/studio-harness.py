"""Bộ chấm studio-lesson/v1 — chạy BÊN TRONG Pyodide (Web Worker của trình duyệt).

studio-lesson.worker.js tải file này, exec một lần rồi gọi
`_studio_main(source, cases_json, files_json)`. scripts/pe-v3/check-pyodide.mjs
nạp CHÍNH file này để kiểm 40 bài bằng đúng runtime của trình duyệt — sửa ở
đây là sửa cho cả hai.

Vì sao cần nhiều hơn `eval(call) == eval(expect)`:

* Bài PE v3 cơ bản là SCRIPT (chưa có hàm): mỗi ca chấm phải chạy lại cả
  chương trình với dữ liệu khác. `_studio.run(vars={...})` thay vế phải của
  dòng gán cấp ngoài cùng (`year = 1991` -> `year = 2026`) bằng cây cú pháp,
  không đụng chuỗi nên học viên viết `year=1991` hay `year = 1991` đều được.
* Bài file đọc/ghi `data.txt`, `palindromes.txt`: mỗi lần chạy có thư mục
  riêng, fixture ghi sẵn, đọc lại file kết quả sau khi chạy.
* Pyodide KHÔNG có stdin: `input()` nổ ngay, nên mọi bài dạy nhập liệu đều
  chết. Thay bằng stdin CẤP SẴN (cách Python Tutor làm): client gửi
  `stdin: ["Hoa", "20"]`, mỗi lần chạy nhận một bản sao các dòng đó và
  `input()` đọc lần lượt. Hết dòng thì `EOFError` — đúng như CPython khi
  `python main.py < input.txt` mà file hết dòng. Không dùng
  SharedArrayBuffer + Atomics.wait để hỏi người dùng giữa lúc chạy: cách đó
  buộc bật COOP/COEP cho cả site và làm vỡ lớp JS legacy.
* Pyodide KHÔNG mở được thread thật (`can't start new thread`) và không có
  fork. Thread được thay bằng bản mô phỏng chạy target ngay lúc start() và ghi
  lại thứ tự tạo/start/join — đủ để chấm hợp đồng "start hết rồi join hết".
* fork được mô phỏng bằng cách CHẠY LẠI chương trình từ đầu: lần chạy thứ k
  nhận 0 ở lời gọi fork thứ k (thành child), các lời gọi trước nhận PID như
  parent. Nhờ vậy bắt được đúng các lỗi bài dạy: child quên `_exit` (chạy
  tiếp code của parent, fork thêm process cháu), parent không waitpid, đo
  thời gian trước khi chờ đủ. Đồng hồ `time.time` được cộng thêm thời gian
  ảo mỗi lần fork/chờ để chấm được "đo bao trùm vòng đời child".

Không có gì ở đây là sandbox bảo mật: mã học viên chạy trong worker dùng một
lần của chính trình duyệt học viên.
"""

import ast
import builtins
import errno
import io
import json
import linecache
import os
import sys
import threading
import time
import traceback
from contextlib import redirect_stderr, redirect_stdout

WORK_ROOT = '/tmp/studio'
PARENT_PID = 4000
CHILD_BASE = 4001
FORK_COST = 0.2   # giây ảo cộng vào đồng hồ mỗi lần fork
WAIT_COST = 0.5   # giây ảo mỗi lần parent chờ một child
MAX_DEPTH = 6
MAX_CHILDREN = 32


class _Abort(BaseException):
    """Dừng một lần chạy mô phỏng vì vi phạm (vd. child fork thêm)."""


class _Exit(BaseException):
    """os._exit() trong mô phỏng — kết thúc process hiện tại ngay."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


class StudioSetupError(Exception):
    """Ca chấm không dựng được vì mã học viên lệch khung đề (đổi tên biến…)."""


class Expr(str):
    """Giá trị thay vào phép gán dưới dạng BIỂU THỨC Python, không phải literal.

    `_studio.run(vars={'language': _studio.expr('ProgrammingLanguage("C", 1972, [])')})`
    """


# ---------------------------------------------------------------- trạng thái

_ORIG = sys.modules.get('__studio_orig__')
if _ORIG is None:
    import types

    _ORIG = types.ModuleType('__studio_orig__')
    _ORIG.time = time.time
    _ORIG.perf_counter = time.perf_counter
    _ORIG.monotonic = time.monotonic
    _ORIG.Thread = threading.Thread
    _ORIG.current_thread = threading.current_thread
    _ORIG.get_ident = threading.get_ident
    sys.modules['__studio_orig__'] = _ORIG


class _Clock:
    offset = 0.0


_STACK = []          # Ctx đang chạy, lồng nhau khi mô phỏng child
_RUN_SEQ = [0]
_SUPPORT_MODULES = set()


def _ctx():
    return _STACK[-1] if _STACK else None


class Ctx:
    """Trạng thái của MỘT process mô phỏng (một lần chạy chương trình)."""

    def __init__(self, depth=0, plan=None, memo=None, options=None, can_fork=True):
        self.depth = depth
        self.plan = plan            # lời gọi fork thứ mấy thì thành child
        self.role = 'parent'
        self.pid = PARENT_PID
        self.memo = {} if memo is None else memo
        self.options = options or {}
        self.can_fork = can_fork
        self.fork_calls = 0
        self.children = []
        self.reaped = set()         # PID child mà CHÍNH process này đã chờ
        self.waited = []
        self.timeline = []          # (loại, dữ liệu, vị trí trong out)
        self.threads = []
        self.out = io.StringIO()
        # stdin riêng của process mô phỏng này, đọc lại từ dòng đầu.
        self.stdin = _new_stdin()
        self.mark = 0              # child: vị trí out lúc tách khỏi parent
        self.exit_code = None
        self.violation = None
        self.current_thread = None
        self.clock_first_fork = None
        self.clock_last_wait = None
        self.threads_before_fork = None

    def pos(self):
        return len(self.out.getvalue())

    def log(self, kind, data=None):
        self.timeline.append((kind, data, self.pos()))


# ---------------------------------------------------------------- đồng hồ

def _time():
    return _ORIG.time() + _Clock.offset


def _perf_counter():
    return _ORIG.perf_counter() + _Clock.offset


def _monotonic():
    return _ORIG.monotonic() + _Clock.offset


# ---------------------------------------------------------------- stdin cấp sẵn

# Các dòng stdin của CẢ bài (client gửi kèm lần chạy). `_JOB['stdin']` ghi đè
# khi một ca chấm muốn chạy lại chương trình với bộ input khác
# (`_studio.run(stdin=[...])`).
_STDIN = {'lines': [], 'loose': None}


def _stdin_text(lines):
    # Client gửi MẢNG DÒNG, không phải một chuỗi: tự thêm '\n' và bỏ ký tự
    # xuống dòng lẫn trong dòng để '\r\n' của Windows không dính vào giá trị
    # input() trả về.
    return ''.join(str(line).rstrip('\r\n') + '\n' for line in lines)


def _new_stdin():
    """Luồng stdin RIÊNG cho một lần chạy.

    Mỗi lần chạy (kể cả lần chạy lại để mô phỏng fork, và mỗi `_studio.run`)
    đọc stdin từ đầu — giống như chạy lại `python main.py < input.txt`, chứ
    không phải chia nhau một con trỏ đọc duy nhất.
    """
    lines = _JOB.get('stdin')
    if lines is None:
        lines = _STDIN['lines']
    return io.StringIO(_stdin_text(lines))


def _loose_stdin():
    # Ca chấm gọi input() TRỰC TIẾP trong `call`/`expect` thì không có lần chạy
    # nào bọc ngoài; cấp một luồng dùng chung cho cả bài để nó vẫn đọc được.
    if _STDIN['loose'] is None:
        _STDIN['loose'] = io.StringIO(_stdin_text(_STDIN['lines']))
    return _STDIN['loose']


def _input(prompt=''):
    ctx = _ctx()
    stream = ctx.stdin if ctx is not None else _loose_stdin()
    # Prompt ra stdout TRƯỚC khi đọc — và vẫn ra cả khi sắp EOFError — để
    # console hiện đúng thứ tự "Nhập tên: Hoa" như terminal thật. Ghi qua
    # sys.stdout (đang bị redirect_stdout trỏ vào ctx.out) chứ không qua
    # print() để không tự thêm '\n'.
    sys.stdout.write(str(prompt))
    line = stream.readline()
    if line == '':
        # Đúng hành vi CPython khi stdin cạn. Cố ý KHÔNG trả '' hay treo máy:
        # trả '' thì chương trình sai âm thầm, còn treo thì worker bị
        # terminate() sau 5 giây và học viên không hiểu vì sao.
        raise EOFError('EOF when reading a line')
    return line[:-1] if line.endswith('\n') else line


class _redirect_stdin:
    """contextlib không có redirect_stdin, tự làm cho gọn."""

    def __init__(self, stream):
        self._stream = stream
        self._saved = None

    def __enter__(self):
        self._saved = sys.stdin
        sys.stdin = self._stream
        return self._stream

    def __exit__(self, *exc):
        sys.stdin = self._saved
        return False


# ---------------------------------------------------------------- thread mô phỏng

class _MainThreadStub:
    name = 'MainThread'
    ident = 1
    native_id = 1
    daemon = False

    def is_alive(self):
        return True

    def getName(self):
        return self.name


_MAIN_THREAD = _MainThreadStub()
_THREAD_IDS = [100]


class SimThread:
    """Thay threading.Thread: target chạy NGAY khi start(), ghi lại vòng đời.

    Trình duyệt không có thread thật, nên thứ được chấm là HỢP ĐỒNG: tạo
    Thread với target là hàm (không gọi sẵn), start mỗi worker đúng một lần,
    start hết trước khi join, join đủ.
    """

    def __init__(self, group=None, target=None, name=None, args=(), kwargs=None, *, daemon=None):
        ctx = _ctx()
        self._target = target
        # Giữ NGUYÊN như threading.Thread: args=n (thiếu dấu phẩy) chỉ hỏng khi
        # thread chạy, đúng như học viên sẽ gặp trên máy thật.
        self._args = args
        self._kwargs = {} if kwargs is None else kwargs
        self.index = len(ctx.threads) if ctx else 0
        self.name = name or 'Thread-%d' % (self.index + 1)
        self.daemon = bool(daemon)
        self.ident = None
        self.native_id = None
        self.started = False
        self.finished = False
        self.joined = False
        self.output = ''
        self.error = None
        self.pid = ctx.pid if ctx else PARENT_PID
        self.target_callable = callable(target)
        self.target_name = getattr(target, '__name__', None) if target is not None else None
        if ctx is not None:
            ctx.threads.append(self)
            ctx.log('thread', self.index)

    def start(self):
        if self.started:
            raise RuntimeError('threads can only be started once')
        ctx = _ctx()
        self.started = True
        _THREAD_IDS[0] += 1
        self.ident = self.native_id = _THREAD_IDS[0]
        if ctx is not None:
            ctx.log('start', self.index)
        prev = ctx.current_thread if ctx else None
        if ctx is not None:
            ctx.current_thread = self
        mark = ctx.pos() if ctx else 0
        try:
            self.run()
        except (_Exit, _Abort):
            raise
        except BaseException as exc:  # thread lỗi không làm sập thread chính
            self.error = exc
            print('Exception in thread %s:' % self.name, file=sys.stderr)
            print(_format_exc(exc), file=sys.stderr, end='')
        finally:
            if ctx is not None:
                ctx.current_thread = prev
                self.output = ctx.out.getvalue()[mark:]
            self.finished = True

    def run(self):
        if self._target is not None:
            self._target(*self._args, **self._kwargs)

    def join(self, timeout=None):
        if not self.started:
            raise RuntimeError('cannot join thread before it is started')
        ctx = _ctx()
        if ctx is not None and ctx.current_thread is self:
            raise RuntimeError('cannot join current thread')
        if ctx is not None:
            ctx.log('join', self.index)
        self.joined = True

    def is_alive(self):
        return self.started and not self.finished

    def getName(self):
        return self.name

    def setName(self, name):
        self.name = name

    def isDaemon(self):
        return self.daemon

    def setDaemon(self, flag):
        self.daemon = bool(flag)

    def __repr__(self):
        state = 'stopped' if self.finished else ('started' if self.started else 'initial')
        return '<Thread(%s, %s)>' % (self.name, state)


def _current_thread():
    ctx = _ctx()
    if ctx is not None and ctx.current_thread is not None:
        return ctx.current_thread
    return _MAIN_THREAD


def _get_ident():
    return _current_thread().ident


# ---------------------------------------------------------------- process mô phỏng

class ChildRecord:
    def __init__(self, k):
        self.k = k
        self.pid = CHILD_BASE + k
        self.exit_code = None
        self.exited = False         # thoát bằng os._exit / sys.exit
        self.leaked = False         # chạy hết chương trình mà không _exit
        self.error = None
        self.violation = None
        self.forced = False
        self.stdout = ''
        self.threads = []
        self.timeline = []

    # Cùng bộ câu hỏi với Result để ca chấm viết gọn.
    @property
    def thread_count(self):
        return len(self.threads)

    @property
    def starts_before_joins(self):
        return _starts_before_joins(self.timeline)

    @property
    def all_joined(self):
        return bool(self.threads) and all(t.joined for t in self.threads)

    def __repr__(self):
        return '<child pid=%s exit=%s>' % (self.pid, self.exit_code)


def _fork():
    ctx = _ctx()
    if ctx is None or not ctx.can_fork:
        raise StudioSetupError('os.fork() chỉ mô phỏng được khi chạy cả chương trình (_studio.run).')
    k = ctx.fork_calls
    ctx.fork_calls += 1
    if ctx.role == 'child':
        ctx.violation = 'grandchild'
        raise _Abort('Process con gọi os.fork() lần nữa nên sinh ra process cháu — '
                     'child phải os._exit() ngay sau khi làm xong việc.')
    if k >= MAX_CHILDREN:
        raise _Abort('Quá %d lần fork — kiểm tra vòng lặp tạo process.' % MAX_CHILDREN)
    if ctx.options.get('fail_fork_at') == k:
        raise OSError(errno.ENOMEM, 'Cannot allocate memory (fork lỗi mô phỏng)')
    if ctx.plan == k:
        ctx.role = 'child'
        ctx.pid = CHILD_BASE + k
        ctx.mark = ctx.pos()
        # Process con mới sinh: chưa có thread nào, chưa có con nào để chờ.
        ctx.threads = []
        ctx.timeline = []
        ctx.children = []
        ctx.reaped = set()
        ctx.waited = []
        return 0
    if ctx.clock_first_fork is None:
        ctx.clock_first_fork = _Clock.offset
        ctx.threads_before_fork = sum(1 for t in ctx.threads if t.started)
    rec = ctx.memo.get(k)
    if rec is None:
        rec = _simulate_child(k, ctx)
        ctx.memo[k] = rec
    ctx.children.append(rec)
    _Clock.offset += FORK_COST
    ctx.log('fork', rec.pid)
    # Child coi như chạy xong ngay sau khi tách ra: output của nó xen vào đây.
    ctx.out.write(rec.stdout)
    return rec.pid


def _simulate_child(k, parent):
    rec = ChildRecord(k)
    if parent.depth + 1 > MAX_DEPTH:
        rec.violation = 'depth'
        rec.exit_code = 1
        return rec
    sub = Ctx(depth=parent.depth + 1, plan=k, memo=parent.memo, options=parent.options)
    saved = _Clock.offset
    try:
        outcome = _execute(sub, _JOB['source'], _JOB['files'], _JOB.get('vars'), _JOB.get('entry'),
                           _JOB.get('setup'))
    finally:
        _Clock.offset = saved
    rec.threads = sub.threads
    rec.timeline = sub.timeline
    if sub.role != 'child':
        rec.violation = 'replay'
        rec.exit_code = 1
        rec.error = 'Không tái hiện được nhánh child (chương trình chạy khác nhau giữa các lần).'
        return rec
    rec.stdout = sub.out.getvalue()[sub.mark:]
    rec.violation = sub.violation
    if outcome['exit'] is not None:
        rec.exited = True
        rec.exit_code = outcome['exit']
    elif outcome['error']:
        rec.error = outcome['error']
        rec.exit_code = 1
    else:
        rec.leaked = True
        rec.exit_code = 0
    if sub.violation:
        rec.exit_code = 1
    forced = (parent.options.get('child_exit') or {}).get(k)
    if forced is not None:
        rec.exit_code = forced
        rec.forced = True
    return rec


def _waitpid(pid, options=0):
    ctx = _ctx()
    if ctx is None:
        raise ChildProcessError(errno.ECHILD, 'No child processes')
    pending = [c for c in ctx.children if c.pid not in ctx.reaped]
    if pid in (-1, 0):
        rec = pending[0] if pending else None
    else:
        rec = next((c for c in pending if c.pid == pid), None)
    if rec is None:
        raise ChildProcessError(errno.ECHILD, 'No child processes')
    ctx.reaped.add(rec.pid)
    ctx.waited.append(rec.pid)
    _Clock.offset += WAIT_COST
    ctx.clock_last_wait = _Clock.offset
    ctx.log('wait', rec.pid)
    return rec.pid, (int(rec.exit_code or 0) & 0xFF) << 8


def _wait():
    return _waitpid(-1, 0)


def _exit_now(code=0):
    ctx = _ctx()
    if ctx is not None:
        ctx.exit_code = code
    raise _Exit(code)


def _getpid():
    ctx = _ctx()
    return ctx.pid if ctx else PARENT_PID


def _getppid():
    ctx = _ctx()
    return PARENT_PID if ctx and ctx.role == 'child' else 1


def _install():
    # input() thay toàn cục giống os.fork/threading.Thread bên dưới: namespace
    # của học viên dùng chính module builtins nên không chèn riêng được.
    builtins.input = _input
    time.time = _time
    time.perf_counter = _perf_counter
    time.monotonic = _monotonic
    threading.Thread = SimThread
    threading.current_thread = _current_thread
    threading.currentThread = _current_thread
    threading.get_ident = _get_ident
    threading.main_thread = lambda: _MAIN_THREAD
    os.fork = _fork
    os.waitpid = _waitpid
    os.wait = _wait
    os._exit = _exit_now
    os.getpid = _getpid
    os.getppid = _getppid
    os.WIFEXITED = lambda status: (status & 0x7F) == 0
    os.WEXITSTATUS = lambda status: (status >> 8) & 0xFF
    os.WIFSIGNALED = lambda status: False
    os.waitstatus_to_exitcode = lambda status: (status >> 8) & 0xFF


# ---------------------------------------------------------------- chạy chương trình

_JOB = {}


def _override(tree, values):
    """Thay vế phải của phép gán CẤP NGOÀI CÙNG đầu tiên cho mỗi tên."""
    left = dict(values)
    for node in tree.body:
        target = None
        if isinstance(node, ast.Assign) and len(node.targets) == 1:
            target = node.targets[0]
        elif isinstance(node, ast.AnnAssign) and node.value is not None:
            target = node.target
        if isinstance(target, ast.Name) and target.id in left:
            value = left.pop(target.id)
            text = str(value) if isinstance(value, Expr) else repr(value)
            node.value = ast.parse(text, mode='eval').body
    if left:
        names = ', '.join(sorted(left))
        raise StudioSetupError(
            'Không tìm thấy dòng gán %s = ... ở ngoài cùng chương trình. '
            'Giữ nguyên tên biến đề bài cấp sẵn để bộ chấm thay được dữ liệu.' % names)
    return ast.fix_missing_locations(tree)


def _prepare_dir(files):
    _RUN_SEQ[0] += 1
    path = '%s/run%d' % (WORK_ROOT, _RUN_SEQ[0])
    os.makedirs(path, exist_ok=True)
    for name, content in files.items():
        if content is None:
            continue
        with open(os.path.join(path, name), 'w', encoding='utf-8', newline='') as fh:
            fh.write(content)
    return path


def _purge_support():
    for name in list(_SUPPORT_MODULES):
        sys.modules.pop(name, None)


def _format_exc(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__)
              if not f.filename.startswith(('<', '/lib/')) and 'studio-harness' not in f.filename]
    lines = ['Traceback (most recent call last):\n'] if frames else []
    for f in frames:
        lines.append('  File "%s", line %s, in %s\n' % (os.path.basename(f.filename), f.lineno, f.name))
        if f.line:
            lines.append('    %s\n' % f.line)
    lines.extend(traceback.format_exception_only(type(exc), exc))
    return ''.join(lines)


def _execute(ctx, source, files, vars=None, entry=None, setup=None):
    """Chạy cả chương trình trong một thư mục mới. Trả dict kết quả thô."""
    outcome = {'exit': None, 'error': None, 'exc': None, 'value': None, 'ns': None, 'dir': None}
    path = _prepare_dir(files)
    outcome['dir'] = path
    old_cwd = os.getcwd()
    _STACK.append(ctx)
    try:
        os.chdir(path)
        _purge_support()
        # Để traceback hiện được dòng code của học viên.
        linecache.cache['main.py'] = (len(source), None, source.splitlines(True), 'main.py')
        try:
            tree = ast.parse(source, 'main.py')
            if vars:
                tree = _override(tree, vars)
            code = compile(tree, 'main.py', 'exec')
        except SyntaxError as exc:
            outcome['error'] = type(exc).__name__
            outcome['exc'] = exc
            return outcome
        ns = {'__name__': '__main__' if entry is None else 'solution', '__builtins__': builtins}
        outcome['ns'] = ns
        with redirect_stdout(ctx.out), redirect_stderr(ctx.out), _redirect_stdin(ctx.stdin):
            try:
                exec(code, ns)
                if setup:
                    exec(compile(setup, '<setup>', 'exec'), ns)
                if entry:
                    try:
                        expr = compile(entry, '<entry>', 'eval')
                    except SyntaxError:
                        exec(compile(entry, '<entry>', 'exec'), ns)
                    else:
                        outcome['value'] = eval(expr, ns)
            except _Exit as stop:
                outcome['exit'] = stop.code if isinstance(stop.code, int) else 1
            except SystemExit as stop:
                outcome['exit'] = stop.code if isinstance(stop.code, int) else (0 if stop.code is None else 1)
            except _Abort as stop:
                ctx.violation = ctx.violation or 'abort'
                outcome['error'] = 'SimulationError'
                outcome['exc'] = stop
            except StudioSetupError:
                raise
            except BaseException as exc:
                outcome['error'] = type(exc).__name__
                outcome['exc'] = exc
    finally:
        _STACK.pop()
        os.chdir(old_cwd)
    return outcome


class Result:
    """Kết quả một lần chạy (cả chương trình hoặc một lời gọi hàm)."""

    def __init__(self, ctx, outcome):
        self._ctx = ctx
        self.stdout = ctx.out.getvalue()
        self.error = outcome['error']
        exc = outcome['exc']
        self.message = str(exc) if exc is not None else ''
        self.traceback = _format_exc(exc) if exc is not None else ''
        self.value = outcome['value']
        self.ns = outcome['ns'] or {}
        self.dir = outcome['dir']
        self.exit_code = outcome['exit']
        self.threads = ctx.threads
        self.children = ctx.children
        self.waited = ctx.waited
        self.timeline = ctx.timeline

    def file(self, name):
        """Nội dung file sau khi chạy (None nếu file không tồn tại)."""
        try:
            with open(os.path.join(self.dir, name), encoding='utf-8', newline='') as fh:
                return fh.read()
        except FileNotFoundError:
            return None

    def var(self, name):
        # Đề PE yêu cầu lưu kết quả vào biến có tên cố định (message, lines…).
        # Thiếu biến thì nói thẳng lý do — "nhận None" khiến người học tưởng
        # logic sai trong khi chỉ đặt tên khác.
        if name not in self.ns:
            raise StudioSetupError(
                'Không thấy biến `%s` sau khi chạy. Đề yêu cầu lưu kết quả vào biến tên `%s` '
                '— đổi tên biến thì bộ chấm không tìm được.' % (name, name))
        return self.ns.get(name)

    @property
    def thread_count(self):
        return len(self.threads)

    @property
    def starts_before_joins(self):
        return _starts_before_joins(self.timeline)

    @property
    def all_joined(self):
        return bool(self.threads) and all(t.joined for t in self.threads)

    @property
    def targets_callable(self):
        return bool(self.threads) and all(t.target_callable for t in self.threads)

    @property
    def reaped_all(self):
        # Chưa tạo child nào thì "đã chờ hết" là đúng một cách vô nghĩa — khung
        # trống không được qua ca này.
        return bool(self.children) and all(c.pid in self._ctx.reaped for c in self.children)

    @property
    def unreaped(self):
        return [c.pid for c in self.children if c.pid not in self._ctx.reaped]

    @property
    def grandchildren(self):
        return any(c.violation == 'grandchild' for c in self.children)

    @property
    def forks_before_waits(self):
        forks = [i for i, row in enumerate(self.timeline) if row[0] == 'fork']
        waits = [i for i, row in enumerate(self.timeline) if row[0] == 'wait']
        return bool(forks) and bool(waits) and max(forks) < min(waits)

    @property
    def threads_before_fork(self):
        return self._ctx.threads_before_fork or 0

    def after_waits(self, text):
        """`text` được parent in SAU khi đã chờ xong child cuối cùng."""
        waits = [row[2] for row in self.timeline if row[0] == 'wait']
        if not waits:
            return False
        return self.stdout.rfind(text) >= max(waits)

    @property
    def measured_lifecycle(self):
        """Giá trị trả về có bao trùm đoạn từ trước fork đầu tới sau lần chờ cuối."""
        start, end = self._ctx.clock_first_fork, self._ctx.clock_last_wait
        if not isinstance(self.value, (int, float)) or isinstance(self.value, bool):
            return False
        if start is None or end is None:
            return False
        # Đo từ trước vòng fork tới sau lần chờ cuối thì phải >= khoảng ảo này;
        # bắt đầu đo sau fork hoặc dừng đo trước waitpid sẽ hụt FORK_COST/WAIT_COST.
        return self.value >= (end - start) - 1e-6

    def __repr__(self):
        bits = ['stdout=%r' % self.stdout[:80]]
        if self.error:
            bits.append('error=%s' % self.error)
        return '<Result %s>' % ' '.join(bits)


def _starts_before_joins(timeline):
    starts = [i for i, row in enumerate(timeline) if row[0] == 'start']
    joins = [i for i, row in enumerate(timeline) if row[0] == 'join']
    return bool(starts) and bool(joins) and max(starts) < min(joins)


# ---------------------------------------------------------------- API cho ca chấm

class Studio:
    """Đối tượng `_studio` trong namespace của học viên — ca chấm gọi qua đây."""

    def __init__(self, source, files, main_dir):
        self.source = source
        self.files = files
        self.main = None
        self._main_dir = main_dir

    def run(self, vars=None, files=None, entry=None, setup=None, fail_fork_at=None, child_exit=None,
            stdin=None):
        """Chạy lại CẢ chương trình (thư mục mới), có thể thay dữ liệu đề cấp.

        `stdin=['Hoa', '20']` cho ca chấm đổi bộ input như đang đổi `vars` —
        bỏ trống thì dùng lại stdin client gửi cho cả bài.
        """
        merged = dict(self.files)
        merged.update(files or {})
        options = {'fail_fork_at': fail_fork_at, 'child_exit': child_exit or {}}
        return _run_program(self.source, merged, vars, entry, setup, options, stdin)

    def call(self, fn, *args, **kwargs):
        """Gọi một hàm, ghi lại stdout/lỗi/thread phát sinh trong lời gọi."""
        ctx = Ctx(can_fork=False)
        outcome = {'exit': None, 'error': None, 'exc': None, 'value': None, 'ns': None,
                   'dir': self._main_dir}
        _STACK.append(ctx)
        old = os.getcwd()
        try:
            os.chdir(self._main_dir)
            with redirect_stdout(ctx.out), redirect_stderr(ctx.out), _redirect_stdin(ctx.stdin):
                try:
                    outcome['value'] = fn(*args, **kwargs)
                except _Exit as stop:
                    outcome['exit'] = stop.code
                except StudioSetupError:
                    raise
                except BaseException as exc:
                    outcome['error'] = type(exc).__name__
                    outcome['exc'] = exc
        finally:
            _STACK.pop()
            os.chdir(old)
        return Result(ctx, outcome)

    def stdout(self, fn, *args, **kwargs):
        return self.call(fn, *args, **kwargs).stdout

    @staticmethod
    def expr(text):
        return Expr(text)

    def check(self, code):
        """Chạy một khối lệnh (assert...) trên bản sao namespace; đạt thì True."""
        scope = dict(self.main.ns) if self.main else {}
        old = os.getcwd()
        try:
            os.chdir(self._main_dir)
            sink = io.StringIO()
            with redirect_stdout(sink), redirect_stderr(sink):
                exec(compile(code, '<check>', 'exec'), scope)
        finally:
            os.chdir(old)
        return True

    def write(self, name, content):
        """Tạo file fixture trong thư mục của lần chạy chính, trả lại tên file."""
        with open(os.path.join(self._main_dir, name), 'w', encoding='utf-8', newline='') as fh:
            fh.write(content)
        return name

    def read(self, name):
        try:
            with open(os.path.join(self._main_dir, name), encoding='utf-8', newline='') as fh:
                return fh.read()
        except FileNotFoundError:
            return None


def _run_program(source, files, vars=None, entry=None, setup=None, options=None, stdin=None):
    saved_job = dict(_JOB)
    _JOB.clear()
    _JOB.update({'source': source, 'files': files, 'vars': vars, 'entry': entry, 'setup': setup,
                 'stdin': stdin})
    saved_clock = _Clock.offset
    # Ctx đọc _JOB['stdin'] trong __init__ nên phải dựng SAU khi _JOB đã cập
    # nhật; _simulate_child cũng dựng Ctx trong lúc _JOB còn là job này, nhờ
    # vậy child chạy lại nhận đúng bộ input đó từ dòng đầu.
    ctx = Ctx(options=options or {})
    try:
        outcome = _execute(ctx, source, files, vars, entry, setup)
    finally:
        _JOB.clear()
        _JOB.update(saved_job)
        # Đồng hồ ảo chỉ có nghĩa TRONG một lần chạy; giữ nguyên offset để
        # time.time() không chạy lùi giữa hai lần chạy liền nhau.
        _Clock.offset = max(_Clock.offset, saved_clock)
    return Result(ctx, outcome)


def _notes(result):
    """Mấy dòng tóm tắt mô phỏng, hiện mờ dưới console của học viên."""
    notes = []
    if result.threads:
        joined = sum(1 for t in result.threads if t.joined)
        line = '[mô phỏng thread] %d Thread được tạo, %d đã start, %d đã join' % (
            len(result.threads), sum(1 for t in result.threads if t.started), joined)
        if len(result.threads) > 1 and joined:
            line += ' — start hết trước khi join ✓' if result.starts_before_joins else ' — có thread join trước khi thread sau được start'
        notes.append(line)
        if any(not t.target_callable for t in result.threads):
            notes.append('[mô phỏng thread] Có Thread với target=None: target phải là tên hàm, không phải kết quả của lời gọi hàm.')
    for child in result.children:
        state = 'thoát mã %s' % child.exit_code
        if child.violation == 'grandchild':
            state = 'fork thêm process cháu ✗'
        elif child.leaked:
            state = 'không gọi os._exit — chạy tiếp code của parent ✗'
        elif child.error:
            state = 'lỗi %s' % child.error
        extra = ', %d thread' % len(child.threads) if child.threads else ''
        reaped = 'đã được chờ' if child.pid in result._ctx.reaped else 'CHƯA được parent chờ ✗'
        notes.append('[mô phỏng fork] child pid %d: %s%s, %s' % (child.pid, state, extra, reaped))
    return notes


# ---------------------------------------------------------------- điểm vào

def _studio_main(source, cases_json, files_json, stdin_json='[]'):
    # stdin_json có mặc định để check-pyodide.mjs (và mọi chỗ gọi cũ) vẫn gọi
    # được bằng 3 tham số.
    _install()
    os.makedirs(WORK_ROOT, exist_ok=True)
    _STDIN['lines'] = json.loads(stdin_json or '[]') or []
    _STDIN['loose'] = None
    files = {}
    for item in json.loads(files_json or '[]'):
        files[item['name']] = item.get('content', '')
    _SUPPORT_MODULES.clear()
    _SUPPORT_MODULES.update(name[:-3] for name in files if name.endswith('.py'))
    cases = json.loads(cases_json or '[]')
    results = []
    error = None

    main = _run_program(source, files)
    output = main.stdout
    if main.error and main.error != 'SimulationError':
        error = main.traceback
    elif main.error == 'SimulationError':
        error = 'Mô phỏng dừng: %s' % main.message
    notes = _notes(main)

    if error is None:
        studio = Studio(source, files, main.dir)
        studio.main = main
        ns = main.ns
        ns['_studio'] = studio
        for case in cases:
            name = case.get('name') or case.get('call') or 'Kiểm tra'
            old = os.getcwd()
            try:
                os.chdir(main.dir)
                sink = io.StringIO()
                with redirect_stdout(sink), redirect_stderr(sink), _redirect_stdin(_loose_stdin()):
                    actual = eval(case['call'], ns)
                    expected = eval(case['expect'], ns)
                ok = actual == expected
                detail = ('Đạt: %r' % (actual,)) if ok else ('Mong đợi %r nhưng nhận %r' % (expected, actual))
                results.append({'name': name, 'passed': bool(ok), 'detail': detail[:400]})
            except (AssertionError, StudioSetupError) as exc:
                results.append({'name': name, 'passed': False,
                                'detail': (str(exc) or 'Điều kiện kiểm tra không thỏa.')[:400]})
            except (_Exit, _Abort) as exc:
                results.append({'name': name, 'passed': False, 'detail': 'Mô phỏng dừng: %s' % exc})
            except BaseException as exc:
                results.append({'name': name, 'passed': False,
                                'detail': ('%s: %s' % (type(exc).__name__, exc))[:400]})
            finally:
                os.chdir(old)

    return json.dumps({
        'tests': results,
        'error': error,
        'output': output[:12000],
        'notes': notes,
        'version': sys.version.split()[0],
    })
