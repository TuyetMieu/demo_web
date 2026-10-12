"""Sinh dữ liệu "code chạy từng bước" cho phần lý thuyết từ chính ví dụ minh hoạ của bài.

Vì sao có file này: màn giải thích hiện là đoạn văn + khối code tĩnh. Mỗi bài đã có sẵn
`step_1.code.source` (ví dụ minh hoạ, kind = 'demo') — thứ cần để dựng hoạt hình "dòng nào đang
chạy, biến nào vừa đổi, in ra gì" là chạy ví dụ đó và ghi lại trạng thái sau mỗi dòng. Không ai
phải viết thêm chữ nào; đổi giáo trình thì chạy lại file này.

Vì sao sinh lúc dựng bài chứ không chạy lúc học: vết này tất định, nhỏ (vài KB/bài), không cần
nạp Pyodide ~10 MB chỉ để xem một màn lý thuyết, và không đụng tới content_json trong DB nên
không phải seed lại. Frontend tải `public/static/motion/<khoá>.json` (cùng origin, nằm trong
`script-src/connect-src 'self'`).

Vì sao khoá theo `sort_order` mà vẫn chép `code` vào từng mục: frontend so `code` với
`step_1.code.source` của bài đang mở; lệch (giáo trình đã được viết lại, chưa chạy lại file
này) thì bỏ qua hoạt hình thay vì chiếu một vết sai.

Chạy:  py scripts/pe-v3/motion.py          (sau build.py / build_advanced.py)
"""
from __future__ import annotations

import ast
import io
import json
import sys
import types
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEST = ROOT.parent.parent / 'frontend' / 'public' / 'static' / 'motion'
SOURCES = {
    'python': ROOT / 'out' / 'lessons',
    'python_advanced': ROOT / 'out-advanced' / 'lessons',
}

# Mức "tối đa 5 bước" của diagram-design áp cho một ý; ví dụ cả bài thì nhiều hơn một chút.
MAX_STEPS = 16
# Vòng lặp: mỗi dòng chỉ giữ tối đa chừng này lần ghé, còn lại cắt (trạng thái vẫn đầy đủ).
MAX_VISITS = 3
MAX_RAW_EVENTS = 2000
MAX_ITEMS = 8
MAX_TEXT = 14

# Những thứ Pyodide/trình duyệt không chạy được hoặc không có ý nghĩa để minh hoạ từng dòng.
UNSUPPORTED = ('import ', 'open(', 'input(', 'fork', 'Thread', '_exit')

PRIMS = (bool, int, float, str, type(None))
AUG_OPS = {ast.Add: '+', ast.Sub: '-', ast.Mult: '*', ast.Div: '/', ast.FloorDiv: '//', ast.Mod: '%'}


def short(v) -> str:
    if isinstance(v, str):
        text = v if len(v) <= MAX_TEXT else v[: MAX_TEXT - 1] + '…'
        return json.dumps(text, ensure_ascii=False)
    text = repr(v)
    return text if len(text) <= MAX_TEXT else text[: MAX_TEXT - 1] + '…'


def kind_of(v) -> str:
    if v is None:
        return 'None'
    return type(v).__name__ if isinstance(v, PRIMS) else 'ref'


def is_hidden(name: str, v) -> bool:
    return name.startswith('__') or isinstance(
        v, (types.FunctionType, types.ModuleType, types.BuiltinFunctionType, type, types.MethodType)
    )


def is_heap(v) -> bool:
    if isinstance(v, (list, tuple, dict, set)):
        return True
    return hasattr(v, '__dict__') and type(v).__module__ == '__main__' and not isinstance(v, type)


class Recorder:
    def __init__(self, code: str):
        self.code = code
        self.tree = ast.parse(code)
        self.lines = code.split('\n')
        self.class_names = {n.name for n in ast.walk(self.tree) if isinstance(n, ast.ClassDef)}
        self.header_lines = {
            n.lineno
            for n in ast.walk(self.tree)
            if isinstance(n, (ast.FunctionDef, ast.ClassDef))
        }
        self.stmt: dict[int, ast.stmt] = {}
        for n in ast.walk(self.tree):
            if isinstance(n, ast.stmt) and n.lineno not in self.stmt:
                self.stmt[n.lineno] = n
        self.ids: dict[int, int] = {}
        self.keep_alive: list[object] = []  # giữ đối tượng sống để id() không bị tái dùng
        self.events: list[dict] = []
        self.buf = io.StringIO()

    # ---- mã hoá một bước
    def heap_id(self, obj) -> int:
        key = id(obj)
        if key not in self.ids:
            self.ids[key] = len(self.ids) + 1
            self.keep_alive.append(obj)
        return self.ids[key]

    def heap_entry(self, obj) -> dict:
        if isinstance(obj, dict):
            items = [f'{short(k)}: {short(v)}' for k, v in list(obj.items())[:MAX_ITEMS]]
            kind, size = 'dict', len(obj)
        elif isinstance(obj, (list, tuple, set)):
            items = [short(v) for v in list(obj)[:MAX_ITEMS]]
            kind, size = type(obj).__name__, len(obj)
        else:
            attrs = [(k, v) for k, v in vars(obj).items() if not k.startswith('__')]
            items = [f'{k}: {short(v)}' for k, v in attrs[:MAX_ITEMS]]
            kind, size = type(obj).__name__, len(attrs)
        if size > MAX_ITEMS:
            items.append('…')
        return {'id': self.heap_id(obj), 'type': kind, 'items': items, 'obj': obj}

    def snapshot(self, frame) -> tuple[list[dict], list[dict]]:
        chain = []
        f = frame
        while f is not None:
            if f.f_code.co_filename == '<demo>' and f.f_code.co_name not in self.class_names:
                chain.append(f)
            f = f.f_back
        chain.reverse()
        frames, heap = [], {}
        for f in chain:
            vars_ = []
            for name, v in list(f.f_locals.items()):
                if is_hidden(name, v):
                    continue
                if is_heap(v):
                    entry = self.heap_entry(v)
                    heap[entry['id']] = entry
                    vars_.append({'n': name, 'k': 'ref', 'ref': entry['id']})
                else:
                    vars_.append({'n': name, 'k': kind_of(v), 'v': short(v)})
            frames.append({'name': 'toàn cục' if f.f_code.co_name == '<module>' else f.f_code.co_name, 'vars': vars_})
        return frames, list(heap.values())

    # ---- chú thích tự sinh từ AST (không phải chữ giáo trình)
    def caption(self, lineno: int | None) -> tuple[str, str]:
        if lineno is None:
            return 'end', 'Kết thúc'
        node = self.stmt.get(lineno)

        def src(n) -> str:
            text = ast.unparse(n)
            return text if len(text) <= 28 else text[:27] + '…'

        if isinstance(node, ast.AugAssign):
            return 'assign', f'Cập nhật {src(node.target)} {AUG_OPS.get(type(node.op), "?")}= {src(node.value)}'
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            return 'assign', f'Gán {src(targets[0])} = {src(node.value)}' if node.value else 'Gán giá trị'
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            call = node.value
            name = ast.unparse(call.func)
            if name == 'print':
                return 'print', f'In ra: {", ".join(src(a) for a in call.args) or "dòng trống"}'
            if name.endswith('.append'):
                return 'call', f'Thêm {src(call.args[0])} vào {name[:-7]}'
            return 'call', f'Gọi {src(call)}'
        if isinstance(node, ast.If):
            return 'branch', f'Kiểm tra: {src(node.test)}'
        if isinstance(node, ast.For):
            return 'loop', f'Lặp: lấy {src(node.target)} kế tiếp trong {src(node.iter)}'
        if isinstance(node, ast.Return):
            return 'return', f'Trả về {src(node.value)}' if node.value else 'Kết thúc hàm'
        if isinstance(node, ast.Pass):
            return 'other', 'Không làm gì (pass)'
        text = self.lines[lineno - 1].strip()
        return 'other', text if len(text) <= 28 else text[:27] + '…'

    # ---- bộ ghi vết
    def tracer(self, frame, event, arg):
        if frame.f_code.co_filename != '<demo>':
            return None
        if len(self.events) > MAX_RAW_EVENTS:
            raise RuntimeError('vết quá dài')
        if frame.f_code.co_name in self.class_names:
            return None  # thân lớp: chỉ định nghĩa, không có gì để xem
        if event == 'line' and frame.f_lineno not in self.header_lines:
            self.record(frame, frame.f_lineno)
        elif event == 'return' and frame.f_code.co_name == '<module>':
            self.record(frame, None)
        return self.tracer

    def record(self, frame, lineno: int | None) -> None:
        frames, heap = self.snapshot(frame)
        kind, cap = self.caption(lineno)
        self.events.append({
            'line': lineno, 'kind': kind, 'cap': cap, 'frames': frames, 'heap': heap,
            'out': self.buf.getvalue().rstrip('\n').split('\n') if self.buf.getvalue() else [],
        })

    def run(self) -> list[dict] | None:
        glb: dict = {'__name__': '__main__'}
        try:
            compiled = compile(self.code, '<demo>', 'exec')
            sys.settrace(self.tracer)
            with redirect_stdout(self.buf):
                exec(compiled, glb)
        except Exception:
            return None
        finally:
            sys.settrace(None)
        return self.events


def to_steps(events: list[dict]) -> list[dict]:
    """Mỗi bước = một dòng VỪA chạy xong + trạng thái SAU dòng đó.

    Bộ ghi vết chụp trạng thái TRƯỚC khi dòng chạy (sự kiện 'line'); người mới học thì đọc tự
    nhiên hơn khi dòng sáng lên cùng lúc biến đổi ("dòng 2 chạy xong → founded xuất hiện"). Nên
    ghép dòng của sự kiện i với trạng thái của sự kiện i+1 (sự kiện cuối là lúc module return).
    Phải ghép TRƯỚC khi cắt vòng lặp, kẻo bước còn lại mang nhầm trạng thái của bước bị cắt.
    """
    steps = [{**events[0], 'line': None, 'kind': 'start', 'cap': 'Bắt đầu'}]
    for cur, nxt in zip(events, events[1:]):
        steps.append({**nxt, 'line': cur['line'], 'kind': cur['kind'], 'cap': cur['cap']})
    return steps


def thin(steps: list[dict]) -> list[dict]:
    """Cắt vòng lặp: mỗi (dòng, độ sâu ngăn xếp) giữ tối đa MAX_VISITS lần ghé đầu."""
    seen: dict[tuple, int] = {}
    kept = []
    for e in steps:
        if e['line'] is None:
            kept.append(e)
            continue
        key = (e['line'], len(e['frames']))
        seen[key] = seen.get(key, 0) + 1
        if seen[key] <= MAX_VISITS:
            kept.append(e)
    if kept[-1] is not steps[-1]:
        kept.append(steps[-1])  # luôn giữ trạng thái cuối
    if len(kept) > MAX_STEPS:
        kept = kept[: MAX_STEPS - 1] + [kept[-1]]
    return kept


def finish(events: list[dict]) -> list[dict]:
    """Gắn cờ 'ch' (vừa đổi so với bước trước) rồi bỏ các tham chiếu nội bộ."""
    out, prev_vars, prev_heap = [], {}, {}
    for e in events:
        cur_vars: dict = {}
        for depth, fr in enumerate(e['frames']):
            for v in fr['vars']:
                cur_vars[(depth, fr['name'], v['n'])] = (v['k'], v.get('v'), v.get('ref'))
        for depth, fr in enumerate(e['frames']):
            for v in fr['vars']:
                key = (depth, fr['name'], v['n'])
                v['ch'] = prev_vars.get(key) != cur_vars[key]
        cur_heap = {h['id']: tuple(h['items']) for h in e['heap']}
        for h in e['heap']:
            h['ch'] = prev_heap.get(h['id']) != cur_heap[h['id']]
            h.pop('obj', None)
        out.append(e)
        prev_vars, prev_heap = cur_vars, cur_heap
    return out


def build_entry(lesson: dict) -> dict:
    step1 = lesson['content_json']['step_1']
    brief = step1.get('brief') or {}
    entry: dict = {
        'code_id': lesson['lesson_code'],
        'title': brief.get('title') or lesson['title'],
        'goal': brief.get('goal') or (step1.get('context') or {}).get('title') or '',
    }
    myth = (step1.get('misconception') or {}).get('title')
    if myth:
        entry['myth'] = myth.strip().strip('"“”').strip()
    code = (step1.get('code') or {}).get('source')
    if code and not any(token in code for token in UNSUPPORTED):
        events = Recorder(code).run()
        if events and len(events) >= 3:  # >= 2 dòng chạy + sự kiện kết thúc
            entry['code'] = code
            entry['steps'] = finish(thin(to_steps(events)))
    return entry


def main() -> int:
    DEST.mkdir(parents=True, exist_ok=True)
    for course, folder in SOURCES.items():
        lessons: dict[str, dict] = {}
        for path in sorted(folder.glob('*.json')):
            lesson = json.loads(path.read_text(encoding='utf-8'))
            lessons[str(lesson['sort_order'])] = build_entry(lesson)
        (DEST / f'{course}.json').write_text(
            json.dumps({'course': course, 'lessons': lessons}, ensure_ascii=False, separators=(',', ':')) + '\n',
            encoding='utf-8',
        )
        animated = sum(1 for v in lessons.values() if 'steps' in v)
        print(f'{course}: {len(lessons)} bài, {animated} bài có hoạt hình -> {DEST / (course + ".json")}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
