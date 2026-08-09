# Frontend — HTML / CSS / JS thuần

Không framework, không bundler, **không build step**. Mỗi route là một thư mục
chứa `index.html`; CSS và JS nằm nguyên trong `static/`. Muốn sửa giao diện thì
mở thẳng file HTML tương ứng.

## Chạy local

```bash
# 1. Backend Django (cổng 9000)
cd backend && .venv/Scripts/python manage.py runserver 9000

# 2. Frontend tĩnh (cổng 3000)
cd frontend && python serve.py
```

Mở <http://localhost:3000>.

`serve.py` chỉ là tiện ích không phụ thuộc Node: nó phục vụ URL sạch (`/login`
→ `login/index.html`) mà không 301, và trả `404.html` cho đường dẫn lạ. Bất kỳ
static server nào cũng chạy được site này:

```bash
npx serve .          # hoặc
python -m http.server 3000
```

Deploy thật: trỏ nginx / Netlify / Vercel / GitHub Pages vào thư mục `frontend/`.
Với nginx dùng `try_files $uri $uri/index.html /404.html;`.

## Cấu hình

Origin của backend khai trong **`static/js/pe-config.js`** (một dòng duy nhất).
Vì không có build step nên không có biến môi trường — sửa file đó khi deploy,
hoặc gán `window.__PE_API_ORIGIN` trước khi nạp nó.

Backend phải cho phép origin frontend trong `ALLOWED_ORIGINS` (CORS) —
mặc định `http://localhost:3000`.

## Cấu trúc

```
frontend/
├── index.html                  # landing
├── 404.html                    # kiêm luôn điều hướng /lesson/<id> lạ
├── serve.py                    # static server tiện dụng cho local/e2e
├── login/  register/  questionaire/  admin/  dashboard/  interface/
├── auth/callback/              # nhận JWT từ fragment sau OAuth
├── auth/logout/                # thu hồi refresh token rồi về /
├── courses/<id>/               # python, java, htmlcss, cpp, db_design{,_tc,_nc}
├── lesson/<id>/                # python, java, htmlcss, db_design{,_tc,_nc}
├── card/<cardId>/              # 22 hồ sơ khái niệm
├── static/{css,js,images}/     # toàn bộ tài nguyên
└── e2e/                        # Playwright (có package.json riêng, không liên quan site)
```

### Thứ tự script trên mọi trang

```html
<head>  … <script src="/static/js/pe-config.js"></script>   <!-- origin backend -->
<body>  … <script src="/static/js/pe-bridge.js"></script>   <!-- rewrite /api/* + JWT -->
        … các script legacy của trang
```

`pe-bridge.js` là cầu nối duy nhất giữa JS legacy (viết cho Flask cùng origin) và
backend Django khác origin dùng JWT: nó rewrite `/api/*`, `/auth/*` sang origin
backend, đính `Authorization: Bearer`, tự bắt token khi login/register và refresh
khi 401. Vì vậy nó **phải nạp trước** mọi file legacy.

### Trang cần dữ liệu

Bản Flask render sẵn bằng Jinja; site tĩnh fetch API rồi điền vào khung HTML:

| Trang | Script điền dữ liệu |
|---|---|
| `courses/{python,java,htmlcss,cpp}` | `static/js/pages/course_detail.page.js` (+ `curricula.js`) |
| `courses/db_design{,_tc,_nc}` | `static/js/pages/course_db_design.page.js` |
| `lesson/db_design{,_tc,_nc}` | `static/js/pages/lesson_db.hydrate.js` (streak/XP) |
| `lesson/{python,java,htmlcss}`, `interface` | `static/js/pages/lesson-topbar.hydrate.js` |

Các script này nạp file legacy tương ứng **sau** khi render xong, vì file legacy
có IIFE truy vấn DOM ngay lúc load (`#current-lesson`, `.cd-lesson`…).

### Giới hạn đã biết

Khóa học thêm qua trang `/admin` sẽ không có trang tĩnh `/courses/<id>` và
`/lesson/<id>` — site không có server render. Trên host phục vụ `404.html`
(nginx, Netlify, `npx serve`), `/lesson/<id>` lạ được chuyển tiếp về
`/courses/<id>` giống route động cũ; `python -m http.server` thì không.

## Test

```bash
cd frontend/e2e
npm install && npx playwright install chromium
npm test              # Playwright — tự khởi động serve.py, cần backend cổng 9000
npm run test:unit     # test Node thuần, không cần server
```

Cần tài khoản test trong DB: `E2E_EMAIL` / `E2E_PASSWORD`
(mặc định `audit@example.com` / `AuditPass123`).
