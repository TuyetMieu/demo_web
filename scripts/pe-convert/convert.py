#!/usr/bin/env python3
"""Chuyển ngân hàng bài học PE_Python_v2 -> studio-lesson/v1 của Python Studio.

Đầu vào (thư mục bàn giao PE):
    lesson_bank.json, instructor_answers.json, test_criteria.json, answers/<id>/

Đầu ra (scripts/pe-convert/out/):
    lessons.json            gói đầy đủ để seed vào bảng `lessons`
    lessons/<sort>-<id>.json  từng bài, dễ đọc/diff
    curriculum-python.json  phần `CURRICULA.python.modules` cho frontend
    report.md / report.json độ phủ từng thành phần UI

Ánh xạ (chi tiết và giới hạn: xem README.md cùng thư mục):
    S1  primer + worked_example + (quiz cuối nếu bài có >= 2 quiz) + ngộ nhận
    S2  quiz còn lại + ô tự giải thích
    S3  khung lắp ghép sinh từ lời giải tham chiếu + nhật ký guided_steps
    S4  challenge_contract + code khởi tạo + lời giải + gợi ý + ca kiểm thử

Chạy:
    python scripts/pe-convert/convert.py [--pe <thư mục PE>] [--no-solutions]
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from modules import module_of  # noqa: E402
from overrides import OVERRIDES  # noqa: E402

HERE = Path(__file__).parent
DEFAULT_PE = Path('D:/workplace/USTH-PE/PE_Python_v2')
SCHEMA = 'studio-lesson/v1'

# 92 bài PE nhận sort_order 1..92 theo đúng `order` của ngân hàng: bài đầu
# tiên là bài 1, không chừa chỗ nào ở giữa.
#
# Studio dựng tay (List & Mutability, PythonStudio.tsx) trước đây chiếm số 11 —
# nó KHÔNG đọc content_json nên sẽ nuốt mất bài PE nằm ở đó. Bài dựng tay được
# đẩy xuống cuối giáo trình, số dưới đây; hằng PYTHON_LESSON_NUMBER ở
# frontend/src/lib/python-studio.ts phải khớp.
HAND_BUILT_SORT_ORDER = 93
HAND_BUILT_MODULE = 'Module 14: Bài dựng tay theo thiết kế Figma'

# Runtime chạy được bằng Pyodide trong trình duyệt (chỉ thư viện chuẩn).
BROWSER_RUNTIMES = {'PY_CORE', 'CONCEPT_REVIEW'}

# Check đụng tới những thứ này thì trình duyệt không chạy được -> bỏ, ghi vào báo cáo.
UNAVAILABLE = (
    'subprocess', 'sys.executable', 'socket', 'multiprocessing', 'curses',
    'tkinter', 'import wx', 'OpenGL', 'pyglet', 'mysql', 'sqlalchemy',
    'pandas', 'numpy', 'matplotlib', 'h5py', 'scipy', 'pyreadstat', 'PIL',
    'threading', 'requests', 'urllib', 'ctypes', 'os.fork',
)

HINT_TITLES = ['Nguyên lý', 'Cấu trúc', 'Lời giải từng phần', 'Bổ sung']


# ---------------------------------------------------------------- tiện ích

def sentences(text: str, limit: int = 4) -> list[str]:
    """Tách văn xuôi thành câu để đổ vào danh sách giải thích của S1.

    Chỉ cắt ở dấu kết câu (. ! ?). Cắt cả ở dấu `;` sẽ tạo ra mảnh câu cụt vì
    văn bản PE dùng `;` để nối hai vế trong cùng một câu.
    """
    parts = [p.strip() for p in re.split(r'(?<=[.!?])\s+', (text or '').strip()) if p.strip()]
    if len(parts) > limit:  # câu thừa dồn vào dòng cuối, không cắt mất nội dung
        parts = parts[:limit - 1] + [' '.join(parts[limit - 1:])]
    return parts


def py_literal(value) -> str:
    """Giá trị JSON của PE -> literal Python dùng được trong `expect`."""
    return repr(value)


def exec_case(source: str) -> dict:
    """Bọc một đoạn nhiều câu lệnh thành cặp call/expect.

    `call` và `expect` chỉ nhận BIỂU THỨC, trong khi ca kiểm thử của PE là
    nhiều câu lệnh (gán, vòng lặp, try/except). `exec(src, globals())` chạy
    được cả khối đó ngay trong namespace của học viên, trả None, nên
    `exec(...) or True` cho True khi mọi assert bên trong đều qua; assert hỏng
    thì worker bắt exception và hiện thông báo của chính assert đó.
    """
    return {'call': f'(exec({source!r}, globals()) or True)', 'expect': 'True'}


def one_line(node: ast.AST) -> bool:
    return getattr(node, 'end_lineno', None) == node.lineno


def self_check(solution: str | None, tests: list[dict], timeout: int = 20) -> tuple[list[dict], list[str]]:
    """Giữ lại những ca mà CHÍNH lời giải tham chiếu vượt qua.

    Bắt chước vòng chấm của studio-lesson.worker.js: exec lời giải trong một
    namespace rỗng rồi eval `call`/`expect` trong namespace đó. Ca nào hỏng ở
    đây thì trong trình duyệt cũng hỏng — ví dụ ca PE gọi hàm của bộ chấm
    (student_average, valid_boundary_cases) vốn không có trong code học viên,
    hay bài cần tệp hỗ trợ / cần input() mà Studio không cung cấp được.

    Chạy trong tiến trình con (stdin đóng, có timeout): lời giải tham chiếu là
    mã tùy ý, có bài đọc input() hoặc chờ vòng lặp.
    """
    if not tests:
        return [], []
    if not solution:
        return [], ['không có lời giải tham chiếu để tự kiểm tra ca test']

    with tempfile.TemporaryDirectory() as tmp:
        job, outcome = Path(tmp) / 'job.json', Path(tmp) / 'ket-qua.json'
        job.write_text(json.dumps({'solution': solution, 'tests': tests}, ensure_ascii=False), encoding='utf-8')
        try:
            proc = subprocess.run(
                [sys.executable, str(HERE / '_selfcheck.py'), str(job), str(outcome)],
                capture_output=True, text=True, encoding='utf-8',
                stdin=subprocess.DEVNULL, timeout=timeout, cwd=str(HERE),
            )
        except subprocess.TimeoutExpired:
            return [], [f'lời giải tham chiếu chạy quá {timeout}s ngoài lab — bỏ toàn bộ ca tự động']
        if proc.returncode != 0 or not outcome.exists():
            detail = ((proc.stderr or '').strip().splitlines() or [''])[-1][:160]
            return [], [f'không tự kiểm tra được ca test ({detail or "tiến trình con lỗi"})']
        result = json.loads(outcome.read_text(encoding='utf-8'))
    return [tests[i] for i in result['kept']], result['dropped']


# ----------------------------------------------------------- tệp kèm bài

def runnable_solution(lesson: dict, is_python: bool) -> bool:
    return is_python and lesson['runtime'] in BROWSER_RUNTIMES


def support_preamble(lesson: dict, pe_dir: Path) -> str:
    """Dựng lại `support_files` của bài thành module ngay trong code.

    Gói PE phát cho học viên các tệp rời (grading.py, metadata.py…) và lời giải
    import chúng như module thật. Studio chỉ chạy đúng MỘT file trong trình
    duyệt, không có hệ thống tệp kèm bài, nên khối này nạp nguyên văn tệp đó
    vào sys.modules trước khi dòng import của bài chạy. `@solution:XX` trong
    ngân hàng nghĩa là "dùng lời giải của bài XX".
    """
    blocks = []
    for filename, source in (lesson.get('support_files') or {}).items():
        if not filename.endswith('.py') or not isinstance(source, str):
            continue
        ref = re.fullmatch(r'@solution:(\w+)', source.strip())
        if ref:
            path = pe_dir / 'answers' / ref.group(1) / 'reference.py'
            if not path.exists():
                continue
            source = path.read_text(encoding='utf-8')
        if any(m in source for m in UNAVAILABLE):
            continue  # tệp kèm bài dùng thư viện native -> trình duyệt không nạp được
        name = filename[:-3]
        var = f'_SRC_{name.upper()}'
        # Nguồn có sẵn dấu nháy ba thì dùng repr cho chắc, không thì để nguyên
        # khối văn bản cho dễ đọc trong trình soạn thảo.
        literal = f'"""\n{source.rstrip()}\n"""' if '"""' not in source else repr(source)
        blocks.append(
            f'# --- Tệp kèm bài: {filename} '
            + '-' * max(0, 64 - len(filename))
            + f'\n# Studio chạy trong trình duyệt nên không có tệp rời; khối này dựng lại\n'
            f'# đúng {filename} của gói PE để dòng import bên dưới chạy như trong lab.\n'
            f'{var} = {literal}\n'
            f'_mod_{name} = _types.ModuleType({name!r})\n'
            f'exec({var}, _mod_{name}.__dict__)\n'
            f'_sys.modules[{name!r}] = _mod_{name}\n'
        )
    if not blocks:
        return ''
    return 'import sys as _sys, types as _types\n\n' + '\n'.join(blocks) + (
        '# ' + '-' * 74 + '\n\n'
    )


# ------------------------------------------------- ca kiểm thử từ nguồn PE

def tests_from_public(lesson: dict) -> list[dict]:
    """public_tests của PE -> ca kiểm thử Studio.

    Bỏ ca có `inputs` (kiểu script nạp sẵn biến): Studio chỉ chạy code học viên
    một lần rồi đánh giá biểu thức, không nạp lại biến được. Các bài đó dùng
    hợp đồng viết tay trong overrides.py.
    """
    out = []
    for i, test in enumerate(lesson.get('public_tests') or [], start=1):
        if test.get('inputs'):
            continue
        name = f"Ca mẫu {test.get('id') or i}"
        files = test.get('files') or {}
        expr, expected = test['expression'], test['expected']
        if files:
            # Fixture file: tạo trong hệ thống file ảo của Pyodide trước khi gọi.
            src = ''.join(
                f'with open({path!r}, "w", encoding="utf-8") as _f: _f.write({body!r})\n'
                for path, body in files.items()
            )
            src += f'_got = {expr}\nassert _got == {py_literal(expected)}, _got\n'
            out.append({'name': name, **exec_case(src)})
        else:
            out.append({'name': name, 'call': expr, 'expect': py_literal(expected)})
    return out


def tests_from_checks(lesson_id: str, criteria: dict, skipped: list[str]) -> list[dict]:
    """checks của test_criteria.json -> ca kiểm thử Studio."""
    out = []
    for check in criteria.get('checks') or []:
        body = check['body']
        hit = next((m for m in UNAVAILABLE if m in body), None)
        if hit:
            skipped.append(f"{check['id']}: cần {hit}")
            continue
        name = f"{check.get('name') or check['id']} ({check['id']})"
        try:
            tree = ast.parse(body)
        except SyntaxError:
            skipped.append(f"{check['id']}: không parse được")
            continue
        # Dạng gọn nhất: đúng một `assert X == Y` -> so sánh trực tiếp, thông
        # báo lỗi của worker sẽ in ra giá trị mong đợi và giá trị nhận được.
        if (
            len(tree.body) == 1
            and isinstance(tree.body[0], ast.Assert)
            and isinstance(tree.body[0].test, ast.Compare)
            and len(tree.body[0].test.ops) == 1
            and isinstance(tree.body[0].test.ops[0], ast.Eq)
        ):
            cmp = tree.body[0].test
            out.append({
                'name': name,
                'call': ast.unparse(cmp.left),
                'expect': ast.unparse(cmp.comparators[0]),
            })
        else:
            out.append({'name': name, **exec_case(body)})
    return out


# ------------------------------------------------------- code khởi tạo S4

def starter_from_solution(solution: str) -> str | None:
    """Giữ lại import + chữ ký hàm/lớp + docstring, bỏ phần thân."""
    try:
        tree = ast.parse(solution)
    except SyntaxError:
        return None
    lines = solution.split('\n')
    out: list[str] = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            out.append(ast.unparse(node))
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            header = lines[node.lineno - 1:node.body[0].lineno - 1]
            out.extend(l.rstrip() for l in header)
            doc = ast.get_docstring(node, clean=False)
            indent = ' ' * (len(lines[node.body[0].lineno - 1]) - len(lines[node.body[0].lineno - 1].lstrip()))
            if doc:
                out.append(f'{indent}"""{doc}"""')
            out.append(f'{indent}# Viết lời giải của bạn ở đây')
            out.append(f'{indent}pass')
        # Câu lệnh mức module (thiết lập dữ liệu mẫu…) không đưa vào code khởi tạo.
    return '\n'.join(out) + '\n' if out else None


# ----------------------------------------------------------- khung lắp ghép

# Mỗi luật đổi ĐÚNG MỘT chi tiết của đáp án thành lỗi mà chính bài học đang
# dạy: sai ranh giới, mất bản sao, nhầm view, nhầm chiều cực trị…
MUTATIONS = [
    (r'>=', '>'), (r'<=', '<'), (r'!=', '=='), (r'==', '!='),
    (r'\.copy\(\)', ''), (r'\.append\(', '.extend('), (r'\.extend\(', '.append('),
    (r'\+=', '='), (r'//', '/'), (r'\.strip\(\)', '.rstrip()'),
    (r'range\(len\(', 'range(('), (r'\bmin\(', 'max('), (r'\bmax\(', 'min('),
    (r'key=lambda k: ?\(-', 'key=lambda k:('), (r'\.items\(\)', '.keys()'),
    (r'\.keys\(\)', '.values()'), (r'\.values\(\)', '.keys()'),
    (r'\bsorted\(', 'reversed('), (r' is not ', ' is '), (r' and ', ' or '),
    (r'^return ', 'print('),
]


def same_shape(a: str, b: str) -> bool:
    """Hai dòng có cùng dạng câu lệnh (cùng là phép gán, hoặc cùng không)."""
    assign = lambda s: bool(re.match(r'^[A-Za-z_][\w\.\[\]"\' ,]*=[^=]', s))
    return assign(a) == assign(b)


def distractor(answer: str, taken: set[str], fallbacks: list[str]) -> str | None:
    """Một khối mã SAI nhưng hợp lý cho cùng slot.

    Ưu tiên biến đổi một chi tiết của chính đáp án; hết luật thì mượn một dòng
    CÙNG DẠNG trong ví dụ của bài (dòng lạc dạng nhìn là biết sai, slot đó coi
    như cho không). Không đặt nhãn `trap` cho khối sinh ra: UI in nhãn đó ra
    màn hình, gắn nhãn là lộ luôn đáp án.
    """
    for pattern, repl in MUTATIONS:
        if re.search(pattern, answer):
            cand = re.sub(pattern, repl, answer, count=1)
            if pattern == r'^return ' and cand != answer:
                cand += ')'
            if cand and cand != answer and cand not in taken:
                return cand
    for line in fallbacks:
        if line and line not in taken and len(line) <= 80 and same_shape(answer, line):
            return line
    return None


def build_scaffold(solution: str, example_code: str) -> dict | None:
    """Đục 1–3 dòng cốt lõi của lời giải thành slot lắp ghép."""
    try:
        tree = ast.parse(solution)
    except SyntaxError:
        return None
    lines = solution.split('\n')
    picks: list[int] = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Import, ast.ImportFrom)):
            continue
        lineno = getattr(node, 'lineno', None)
        if lineno is None or lineno > len(lines):
            continue
        text = lines[lineno - 1].strip()
        if not text or text.startswith('#') or text.startswith(('"""', "'''")):
            continue
        if len(text) > 80:
            continue
        if isinstance(node, (ast.Assign, ast.AugAssign, ast.Return)) and one_line(node):
            picks.append(lineno)
        elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and one_line(node):
            picks.append(lineno)  # lệnh gọi đứng riêng: print(...), append(...)
        elif isinstance(node, (ast.If, ast.For, ast.While)) and text.endswith(':') and one_line(node.test if isinstance(node, (ast.If, ast.While)) else node.iter):
            picks.append(lineno)
    picks = sorted(set(picks))
    if not picks:
        return None
    if len(picks) > 3:  # giữ 3 dòng trải đều thân hàm
        picks = [picks[0], picks[len(picks) // 2], picks[-1]]

    template_lines = list(lines)
    slots, bank = [], []
    # Nạp sẵn mọi đáp án: nhãn trong bank là React key, và một dòng vừa là đáp
    # án của slot này vừa là mồi nhử của slot kia thì UI mất nút.
    taken = {lines[n - 1].strip() for n in picks}
    fallbacks = [l.strip() for l in (example_code or '').split('\n') if l.strip()]
    for i, lineno in enumerate(picks, start=1):
        raw = lines[lineno - 1]
        answer = raw.strip()
        indent = raw[:len(raw) - len(raw.lstrip())]
        template_lines[lineno - 1] = f'{indent}{{{{slot{i}}}}}'
        slots.append({'n': i, 'placeholder': f'[Slot {i}]', 'answer': answer})
        bank.append({'label': answer, 'slot': i})
        taken.add(answer)
        wrong = distractor(answer, taken, fallbacks)
        if wrong:
            bank.append({'label': wrong, 'slot': i})
            taken.add(wrong)
    return {
        'template': '\n'.join(template_lines).rstrip() + '\n',
        'slots': slots,
        'bank': bank,
    }


# ------------------------------------------------------------ dựng 4 bước

def build_step1(lesson: dict, keys: list[dict], predict_quiz: int | None) -> dict:
    step: dict = {}
    if lesson.get('primer'):
        step['context'] = {'title': 'Ngữ cảnh', 'body': lesson['primer']}
    example = lesson.get('worked_example') or {}
    if example.get('code'):
        step['code'] = {'filename': 'example.py', 'version': 'Python 3.12', 'source': example['code']}
    if example.get('explanation'):
        step['explain'] = [
            {'n': i, 'body': text} for i, text in enumerate(sentences(example['explanation']), start=1)
        ]

    if predict_quiz is not None:
        quiz = lesson['quiz'][predict_quiz]
        key = keys[predict_quiz] if predict_quiz < len(keys) else {}
        feedback = key.get('feedback') or []
        answer = key.get('answer')
        step['predict'] = {
            'question': quiz['question'],
            'options': [
                {
                    'id': chr(97 + i),
                    'title': text,
                    'detail': feedback[i] if i < len(feedback) else None,
                    'correct': i == answer,
                }
                for i, text in enumerate(quiz['options'])
            ],
        }
        for option in step['predict']['options']:
            if option['detail'] is None:
                del option['detail']

    # Ngộ nhận: ưu tiên câu PE viết riêng cho ca kiểm thử, sau đó là phản hồi
    # của một phương án SAI trong quiz.
    misconception = next(
        (t.get('misconception_caught') for t in (lesson.get('public_tests') or []) if t.get('misconception_caught')),
        None,
    )
    if misconception:
        step['misconception'] = {'title': 'Ngộ nhận bài này hay bắt được', 'body': misconception}
    elif keys and lesson.get('quiz'):
        key, quiz = keys[0], lesson['quiz'][0]
        feedback, answer = key.get('feedback') or [], key.get('answer')
        wrong = next((i for i in range(len(quiz['options'])) if i != answer and i < len(feedback)), None)
        if wrong is not None:
            step['misconception'] = {
                'title': 'Ngộ nhận bài này hay bắt được',
                'body': f'"{quiz["options"][wrong]}" — {feedback[wrong]}',
            }
    return step


def build_step2(lesson: dict, keys: list[dict], predict_quiz: int | None) -> dict:
    step: dict = {}
    mcq = []
    for i, quiz in enumerate(lesson.get('quiz') or []):
        if i == predict_quiz:
            continue
        key = keys[i] if i < len(keys) else {}
        feedback, answer = key.get('feedback') or [], key.get('answer')
        options = []
        for j, text in enumerate(quiz['options']):
            option = {'text': text, 'correct': j == answer}
            if j < len(feedback):
                option['detail'] = feedback[j]
            options.append(option)
        item = {'question': quiz['question'], 'options': options}
        if isinstance(answer, int):
            item['correct'] = answer
            if answer < len(feedback):
                item['explanation'] = feedback[answer]
        mcq.append(item)
    if mcq:
        step['mcq'] = mcq

    explain = lesson.get('self_explanation') or {}
    if explain.get('prompt'):
        # KHÔNG kèm rubric keywords: rubric của PE là thang 0–2 do người chấm
        # đọc, không phải từ khóa. Studio lại chặn học viên đi tiếp khi chưa
        # khớp ĐỦ mọi dòng rubric, nên keywords đoán bừa sẽ khóa bài học.
        step['selfExplain'] = {
            'prompt': explain['prompt'],
            'placeholder': (explain.get('rubric') or {}).get('2', 'Nhập lời giải thích của bạn…'),
        }
    return step


def build_step3(lesson: dict, solution: str | None, override: bool = False) -> dict:
    step: dict = {}
    body = 'Đặt các khối mã còn thiếu vào đúng vị trí để dựng lại lời giải tham chiếu.'
    if override:
        # Bài override đổi vỏ script -> hàm, còn nhật ký bên dưới vẫn là các
        # bước PE mô tả trên script. Nói rõ để học viên không bối rối.
        body += (' Nhật ký thao tác bên dưới mô tả bản script gốc của PE; cách'
                 ' nghĩ giữ nguyên, chỉ khác phần vỏ hàm.')
    task = {'title': 'Luyện có hỗ trợ', 'body': body}
    if lesson.get('modification'):
        task['rule'] = f"Sau khi khung mã đúng, hãy tự thử: {lesson['modification']}"
    step['task'] = task

    # Lời giải ở đây là bản GỐC, chưa ghép khối dựng tệp kèm bài: khối đó là mã
    # hạ tầng do bộ chuyển đổi sinh ra, đục thành slot là bắt học viên lắp ghép
    # nhầm thứ.
    if solution:
        scaffold = build_scaffold(solution, (lesson.get('worked_example') or {}).get('code', ''))
        if scaffold:
            step['scaffold'] = scaffold

    guided = lesson.get('guided_steps') or []
    if guided:
        step['trace'] = {
            'steps': [{'label': f'B{i}', 'text': text} for i, text in enumerate(guided, start=1)]
        }
    return step


def build_step4(lesson: dict, solution: str | None, core_solution: str | None, preamble: str,
                tests: list[dict], override: dict | None, include_solution: bool,
                procedure: list[str] | None = None) -> dict:
    step: dict = {}
    body = (override or {}).get('task') or lesson.get('challenge_contract') or lesson.get('objective') or ''
    task = {'title': 'Thử thách độc lập', 'body': body}
    # Nhãn phải DUY NHẤT: UI dùng chính nhãn làm React key cho từng dòng I/O và
    # từng tầng gợi ý, trùng nhãn là mất dòng.
    io = []
    tests_pe = lesson.get('public_tests') or []
    for i, test in enumerate(tests_pe, start=1):
        label = 'Ví dụ' if len(tests_pe) == 1 else f'Ví dụ {i}'
        io.append({'label': label, 'value': f"{test['expression']} → {json.dumps(test['expected'], ensure_ascii=False)}"})
    manual = lesson.get('manual_checks') or []
    for i, check in enumerate(manual, start=1):
        io.append({'label': 'Người chấm xem' if len(manual) == 1 else f'Người chấm xem {i}', 'value': check})
    if io:
        task['io'] = io[:4]
    step['task'] = task

    hints = []
    for i, text in enumerate(lesson.get('hints') or []):
        title = HINT_TITLES[i] if i < len(HINT_TITLES) else f'Bổ sung {i - len(HINT_TITLES) + 2}'
        hints.append({'title': title, 'body': text})
    if hints:
        step['hints'] = hints

    if tests:
        # Code khởi tạo sinh từ lời giải GỐC rồi mới ghép khối tệp kèm bài lên
        # đầu: starter_from_solution() chỉ giữ import và chữ ký hàm, khối dựng
        # module là câu lệnh mức module nên sẽ bị bỏ mất.
        starter = (override or {}).get('starter') or (
            starter_from_solution(core_solution) if core_solution else None
        )
        if starter:
            step['starterCode'] = preamble + starter
        step['tests'] = tests
    if include_solution and solution:
        step['solutionCode'] = solution
    if procedure:
        step['procedure'] = procedure
    forbid = (override or {}).get('forbid')
    if forbid:
        step['forbid'] = forbid
    return step


# ------------------------------------------------------------------ chạy

def convert(pe_dir: Path, include_solution: bool) -> tuple[list[dict], list[dict]]:
    bank = json.loads((pe_dir / 'lesson_bank.json').read_text(encoding='utf-8'))
    answers = json.loads((pe_dir / 'instructor_answers.json').read_text(encoding='utf-8'))
    criteria = json.loads((pe_dir / 'test_criteria.json').read_text(encoding='utf-8'))
    stamp = datetime.now(timezone.utc).isoformat(timespec='seconds')

    lessons, report = [], []
    sort_order = 0
    for lesson in sorted(bank['lessons'], key=lambda x: x['order']):
        lid = lesson['lesson_id']
        answer = answers.get(lid) or {}
        override = OVERRIDES.get(lid)
        skipped: list[str] = []

        sort_order += 1

        # Lời giải tham chiếu: file answers/<id>/reference.py, nếu không có thì
        # phần `solution` của instructor_answers (bài quy trình là lệnh shell).
        ref = pe_dir / 'answers' / lid / 'reference.py'
        is_python = lesson['answer_kind'] == 'python'
        if override and 'solution' in override:
            solution = override['solution']
        elif ref.exists():
            solution = ref.read_text(encoding='utf-8')
        elif answer.get('solution') and is_python:
            solution = answer['solution']
        else:
            solution = None

        # Bài quy trình (dựng môi trường, Git, cài MySQL…) không có mã Python để
        # chạy. Trước đây đáp án bị chú-thích-hoá rồi nhét vào ô soạn mã, bấm
        # "Chạy thử" chỉ ra một console rỗng — vô nghĩa. Giờ tách thành danh
        # sách bước riêng, Studio hiện khối quy trình thay cho sandbox.
        procedure: list[str] = []
        if not is_python and answer.get('solution'):
            procedure = [l.rstrip() for l in answer['solution'].rstrip().split(chr(10)) if l.strip()]

        # Tệp kèm bài (support_files) không tồn tại trong trình duyệt: dựng lại
        # thành module ngay trong code, nếu không dòng `from ... import ...` của
        # bài sẽ ModuleNotFoundError ngay lần chạy đầu.
        preamble = support_preamble(lesson, pe_dir) if runnable_solution(lesson, is_python) else ''
        core_solution = solution
        if preamble and solution:
            solution = preamble + solution

        runnable = lesson['runtime'] in BROWSER_RUNTIMES
        # Ngân hàng đánh runtime theo lab, không theo trình duyệt: vài bài ghi
        # PY_CORE nhưng lời giải vẫn import tkinter hoặc mở thread — Pyodide
        # không có hai thứ đó. Kiểm tra thẳng trên lời giải.
        native = next((m for m in UNAVAILABLE if solution and m in solution), None)
        if runnable and native:
            runnable = False
            skipped.append(f'lời giải cần {native}: Pyodide trong trình duyệt không có')

        if override:
            tests = []
            for case in override['tests']:
                tests.append(
                    {'name': case['name'], **exec_case(case['source'])} if 'source' in case
                    else {'name': case['name'], 'call': case['call'], 'expect': case['expect']}
                )
            if 'solution' not in override:  # override chỉ bổ sung ca test
                tests += tests_from_public(lesson) + tests_from_checks(lid, criteria.get(lid) or {}, skipped)
        elif runnable:
            tests = tests_from_public(lesson) + tests_from_checks(lid, criteria.get(lid) or {}, skipped)
        else:
            tests = []
            skipped.append(f"runtime {lesson['runtime']}: chạy trên desktop lab, không chạy trong trình duyệt")

        # Chỉ phát hành ca test mà lời giải tham chiếu vượt qua được.
        tests, dropped = self_check(solution if tests else None, tests)
        skipped.extend(dropped)

        keys = answer.get('quiz_keys') or []
        quizzes = lesson.get('quiz') or []
        # Quiz cuối chuyển lên S1 làm câu dự đoán khi bài có từ 2 quiz trở lên;
        # bài chỉ có 1 quiz thì giữ nguyên ở S2 để bộ sinh quiz ôn tập còn dữ
        # liệu (QuizzesService đọc đúng content_json.step_2.mcq).
        predict_quiz = len(quizzes) - 1 if len(quizzes) >= 2 else None

        content = {
            'schema': SCHEMA,
            'title': lesson['title'],
            'subtitle': f"{lid} · {'Nâng cao' if lesson['track'] == 'advanced' else 'Lộ trình chính'}"
                        f" · {lesson.get('duration_minutes') or 0} phút",
            'source': {
                'kind': 'pe-bank',
                'filename': f"lesson_bank.json#{lid}",
                'parser': 'pe-convert' + ('/override' if override else ''),
                'importedAt': stamp,
            },
            'step_1': build_step1(lesson, keys, predict_quiz),
            'step_2': build_step2(lesson, keys, predict_quiz),
            'step_3': build_step3(lesson, core_solution if is_python else None, bool(override)),
            'step_4': build_step4(lesson, solution, core_solution, preamble, tests, override,
                                  include_solution, procedure),
        }
        content = {k: v for k, v in content.items() if v or not k.startswith('step_')}

        lessons.append({
            'lesson_code': lid,
            'sort_order': sort_order,
            'module': module_of(lesson['order']),
            'title': lesson['title'],
            'subtitle': content['subtitle'],
            'estimated_minutes': lesson.get('duration_minutes'),
            'content_json': content,
        })
        report.append({
            'lesson_code': lid,
            'sort_order': sort_order,
            'order': lesson['order'],
            'title': lesson['title'],
            'track': lesson['track'],
            'runtime': lesson['runtime'],
            'module': module_of(lesson['order']),
            'predict': 'predict' in content['step_1'],
            'mcq': len(content['step_2'].get('mcq') or []),
            'scaffold': len((content['step_3'].get('scaffold') or {}).get('slots') or []),
            'tests': len(tests),
            'override': bool(override),
            'solution': bool(solution),
            'procedure': len(procedure),
            'skipped': skipped,
        })
    return lessons, report


def write_report(report: list[dict], out: Path) -> None:
    total = len(report)
    with_tests = sum(1 for r in report if r['tests'])
    rows = [
        '# Báo cáo chuyển đổi PE_Python_v2 -> Python Studio',
        '',
        f'{total} bài. '
        f"{sum(1 for r in report if r['predict'])} bài có câu dự đoán ở S1, "
        f"{sum(1 for r in report if r['mcq'])} bài có trắc nghiệm ở S2, "
        f"{sum(1 for r in report if r['scaffold'])} bài có khung lắp ghép ở S3, "
        f'{with_tests} bài chấm được tự động ở S4 '
        f'({total - with_tests} bài còn lại là bài đọc/lab desktop, xem cột Bỏ qua).',
        '',
        '| # | Mã | Bài | Runtime | S1 dự đoán | S2 quiz | S3 slot | S4 test | Bỏ qua |',
        '|---|----|-----|---------|-----------|---------|---------|---------|--------|',
    ]
    for r in report:
        rows.append(
            f"| {r['sort_order']} | {r['lesson_code']} | {r['title']} | {r['runtime']} | "
            f"{'có' if r['predict'] else '—'} | {r['mcq'] or '—'} | {r['scaffold'] or '—'} | "
            f"{r['tests'] or '—'} | {'; '.join(r['skipped']) or '—'} |"
        )
    (out / 'report.md').write_text('\n'.join(rows) + '\n', encoding='utf-8')
    (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


def write_curriculum(lessons: list[dict], hand_built_title: str, out: Path) -> None:
    """Danh sách module + tên bài cho frontend/src/lib/curricula.json.

    Trang khóa học đánh số bài PHẲNG theo thứ tự trong danh sách này, và
    `?lesson=<chỉ số từ 0>` phải khớp `sort_order - 1`. Vì vậy danh sách này
    phải liền mạch 1..93, bài dựng tay nằm cuối.
    """
    by_sort = {l['sort_order']: l for l in lessons}
    by_sort[HAND_BUILT_SORT_ORDER] = {
        'sort_order': HAND_BUILT_SORT_ORDER,
        'module': HAND_BUILT_MODULE,
        'title': hand_built_title,
    }
    modules: list[dict] = []
    for sort in sorted(by_sort):
        lesson = by_sort[sort]
        if not modules or modules[-1]['title'] != lesson['module']:
            modules.append({'title': lesson['module'], 'lessons': []})
        modules[-1]['lessons'].append(lesson['title'])
    (out / 'curriculum-python.json').write_text(
        json.dumps({'modules': modules}, ensure_ascii=False, indent=2), encoding='utf-8'
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--pe', type=Path, default=DEFAULT_PE, help='thư mục bàn giao PE_Python_v2')
    parser.add_argument('--out', type=Path, default=HERE / 'out', help='thư mục kết quả')
    parser.add_argument('--no-solutions', action='store_true',
                        help='không nhúng lời giải mẫu vào content_json (content_json được gửi thẳng về trình duyệt)')
    parser.add_argument('--hand-built-title', default='Danh sách (List) & Mutability',
                        help=f'tên bài dựng tay, đặt ở cuối giáo trình (bài {HAND_BUILT_SORT_ORDER})')
    args = parser.parse_args()

    if not (args.pe / 'lesson_bank.json').exists():
        print(f'Không thấy lesson_bank.json trong {args.pe}', file=sys.stderr)
        return 1

    out = args.out
    (out / 'lessons').mkdir(parents=True, exist_ok=True)
    for old in (out / 'lessons').glob('*.json'):
        old.unlink()

    lessons, report = convert(args.pe, include_solution=not args.no_solutions)
    (out / 'lessons.json').write_text(
        json.dumps({'course_id': 'python', 'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
                    'hand_built': {'sort_order': HAND_BUILT_SORT_ORDER,
                                   'module': HAND_BUILT_MODULE,
                                   'title': args.hand_built_title},
                    'lessons': lessons},
                   ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    for lesson in lessons:
        path = out / 'lessons' / f"{lesson['sort_order']:03d}-{lesson['lesson_code']}.json"
        path.write_text(json.dumps(lesson, ensure_ascii=False, indent=2), encoding='utf-8')
    write_curriculum(lessons, args.hand_built_title, out)
    write_report(report, out)

    with_tests = sum(1 for r in report if r['tests'])
    print(f'{len(lessons)} bài -> {out}')
    print(f'  S1 dự đoán: {sum(1 for r in report if r["predict"])}')
    print(f'  S2 trắc nghiệm: {sum(1 for r in report if r["mcq"])}')
    print(f'  S3 khung lắp ghép: {sum(1 for r in report if r["scaffold"])}')
    print(f'  S4 chấm tự động: {with_tests} (còn lại {len(lessons) - with_tests} bài đọc/lab desktop)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
