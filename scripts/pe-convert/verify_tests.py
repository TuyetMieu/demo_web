#!/usr/bin/env python3
"""Chạy thử ca kiểm thử S4 của các bài đã chuyển đổi, bằng CPython cục bộ.

Bắt chước đúng vòng chấm của frontend/public/static/js/studio-lesson.worker.js:
exec lời giải trong một namespace rỗng, rồi eval `call` và `expect` trong chính
namespace đó và so sánh bằng `==`. Ca nào FAIL ở đây thì trong trình duyệt cũng
FAIL, nghĩa là bài đó chấm sai lời giải đúng.

Mỗi bài chạy trong thư mục tạm riêng vì vài ca có ghi file.

    python scripts/pe-convert/verify_tests.py [--only C09,P05]

Lưu ý: CPython cục bộ KHÔNG phải Pyodide. Ca dùng thư viện ngoài hoặc tiến
trình con đã bị loại từ bước chuyển đổi, nhưng khác biệt về hệ thống file và
thời gian chạy vẫn có thể còn.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path

HERE = Path(__file__).parent


def run_lesson(lesson: dict) -> list[str]:
    content = lesson['content_json']
    step4 = content.get('step_4') or {}
    tests = step4.get('tests') or []
    solution = step4.get('solutionCode')
    if not tests:
        return []
    if not solution:
        return [f"{lesson['lesson_code']}: có {len(tests)} ca nhưng thiếu lời giải để đối chiếu"]

    failures = []
    namespace: dict = {'__name__': '__main__'}
    cwd = os.getcwd()
    with tempfile.TemporaryDirectory() as tmp:
        os.chdir(tmp)
        try:
            exec(compile(solution, 'solution.py', 'exec'), namespace)
        except Exception as err:  # lời giải không chạy được -> bài hỏng
            os.chdir(cwd)
            return [f"{lesson['lesson_code']}: lời giải lỗi: {type(err).__name__}: {err}"]
        for case in tests:
            try:
                actual = eval(case['call'], namespace)
                expected = eval(case['expect'], namespace)
                if actual != expected:
                    failures.append(
                        f"{lesson['lesson_code']} / {case['name']}: mong đợi {expected!r} nhận {actual!r}"
                    )
            except Exception as err:
                failures.append(
                    f"{lesson['lesson_code']} / {case['name']}: {type(err).__name__}: {err}"
                )
        os.chdir(cwd)
    return failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--bundle', type=Path, default=HERE / 'out' / 'lessons.json')
    parser.add_argument('--only', help='danh sách mã bài, cách nhau bằng dấu phẩy')
    args = parser.parse_args()

    bundle = json.loads(args.bundle.read_text(encoding='utf-8'))
    wanted = set(args.only.split(',')) if args.only else None

    failures, checked, cases = [], 0, 0
    for lesson in bundle['lessons']:
        if wanted and lesson['lesson_code'] not in wanted:
            continue
        n = len((lesson['content_json'].get('step_4') or {}).get('tests') or [])
        if n:
            checked += 1
            cases += n
        failures.extend(run_lesson(lesson))

    print(f'{checked} bài có chấm tự động, {cases} ca kiểm thử.')
    if failures:
        print(f'{len(failures)} ca KHÔNG đạt với chính lời giải tham chiếu:')
        for line in failures:
            print('  ' + line)
        return 1
    print('Tất cả ca đều đạt với lời giải tham chiếu.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
