#!/usr/bin/env python3
"""
serve.py — static server tối giản cho frontend (không phụ thuộc Node).

Site là HTML/CSS/JS thuần: mỗi route là một thư mục chứa index.html, nên URL
sạch (/login, /courses/python) hoạt động trên bất kỳ static server nào. Script
này thêm 2 tiện ích so với `python -m http.server`:

  1. /login  →  login/index.html  phục vụ TRỰC TIẾP, không 301 sang /login/
     (giữ nguyên URL trên thanh địa chỉ, giống nginx try_files).
  2. Đường dẫn không tồn tại → 404.html (trang này chuyển tiếp /lesson/<id> lạ
     giống route động của bản Next cũ).

    python serve.py [port]        # mặc định 3000

Deploy thật: trỏ nginx/Netlify/Vercel vào thư mục này, không cần build step.
"""
import os
import sys
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))


class CleanURLHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        # /login (không đuôi, không dấu /) → login/index.html, không redirect
        if not os.path.exists(path) or os.path.isdir(path):
            index = os.path.join(path, 'index.html')
            if os.path.isfile(index):
                self.path = self.path.split('?')[0].rstrip('/') + '/index.html'
                return SimpleHTTPRequestHandler.send_head(self)
        if not os.path.exists(path):
            return self.send_404()
        return SimpleHTTPRequestHandler.send_head(self)

    def send_404(self):
        page = os.path.join(ROOT, '404.html')
        if not os.path.isfile(page):
            self.send_error(404)
            return None
        body = open(page, 'rb').read()
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        return __import__('io').BytesIO(body)

    def log_message(self, fmt, *args):  # bớt ồn: chỉ log lỗi
        if not args or not str(args[0]).startswith(('GET / HTTP', 'GET /static')):
            super().log_message(fmt, *args)


def main():
    # Console Windows mặc định cp1252 — không in được tiếng Việt có dấu
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:  # Python < 3.7
        pass
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    handler = partial(CleanURLHandler, directory=ROOT)
    print(f'Frontend tĩnh: http://localhost:{port}  (thư mục {ROOT})')
    print('Backend Django phải chạy ở cổng khai trong static/js/pe-config.js')
    HTTPServer(('0.0.0.0', port), handler).serve_forever()


if __name__ == '__main__':
    main()
