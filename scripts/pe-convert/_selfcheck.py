#!/usr/bin/env python3
"""Tiến trình con chạy thử ca kiểm thử của MỘT bài. convert.py gọi, đừng gọi tay.

Chạy riêng một tiến trình vì lời giải tham chiếu của PE là mã tùy ý: có bài
gọi input(), có bài lặp chờ, có bài ghi file. Tiến trình riêng cho phép đặt
timeout, khóa stdin và dọn sạch thư mục làm việc mà không ảnh hưởng bộ chuyển đổi.

    python _selfcheck.py <job.json> <ket-qua.json>

job.json:    {"solution": "...", "tests": [...]}
ket-qua.json: {"kept": [chỉ số ca đạt], "dropped": ["lý do", ...]}

Kết quả ghi ra FILE chứ không ra stdout: lời giải tham chiếu có bài tự in ra
màn hình (kể cả lời nhắc input() không xuống dòng), trộn vào stdout là hỏng JSON.
"""

import json
import os
import sys
import tempfile


def write(path: str, payload: dict) -> None:
    with open(path, 'w', encoding='utf-8') as out:
        json.dump(payload, out, ensure_ascii=False)


def main() -> int:
    job = json.loads(open(sys.argv[1], encoding='utf-8').read())
    solution, tests = job['solution'], job['tests']
    namespace = {'__name__': '__main__'}
    kept, dropped = [], []

    origin = os.getcwd()
    # Windows không xóa được thư mục đang là cwd -> luôn quay ra trước khi dọn.
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        os.chdir(tmp)
        try:
            exec(compile(solution, 'solution.py', 'exec'), namespace)
        except BaseException as err:
            os.chdir(origin)
            write(sys.argv[2], {
                'kept': [],
                'dropped': [f'lời giải không chạy được ngoài lab ({type(err).__name__}: {err})'
                            ' — bỏ toàn bộ ca tự động'],
            })
            return 0
        for i, case in enumerate(tests):
            try:
                if eval(case['call'], namespace) == eval(case['expect'], namespace):
                    kept.append(i)
                else:
                    dropped.append(f"{case['name']}: lời giải tham chiếu cho kết quả khác")
            except BaseException as err:
                dropped.append(f"{case['name']}: {type(err).__name__}: {err}")
        os.chdir(origin)

    write(sys.argv[2], {'kept': kept, 'dropped': dropped})
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
