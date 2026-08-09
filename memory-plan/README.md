# memory-plan — Audit & Fix (Security / Performance / Naming / Bug-Logic)

Thư mục này đóng gói toàn bộ quy trình review + sửa lỗi cho repo `demo_web`
(Django backend + frontend HTML/CSS/JS tĩnh), theo yêu cầu của chủ dự án.

## Ngữ cảnh hệ thống
- **Backend**: Django 5.2 + DRF + SimpleJWT, DB PostgreSQL (Neon), deploy Render
  (`https://demo-web-9mtz.onrender.com`). Dùng raw SQL qua helper `common/db.py`.
- **Frontend**: HTML tĩnh + lớp JS legacy trong `frontend/static/js/*`,
  deploy Vercel (`https://demo-web-psi-pied.vercel.app`).
- Đây là bản port từ Flask → Django; nhiều quyết định "giữ nguyên hành vi" được
  ghi trong `MIGRATION_NOTES.md`.

## Quy ước làm việc (theo yêu cầu chủ dự án)
1. Đóng gói yêu cầu → chẻ task nhỏ (xem `01-requirements.md`, `02-tasks.md`).
2. **TDD**: viết test **fail trước**, dự đoán fail, rồi mới code cho pass.
3. Dọn kiến trúc sau khi xanh test.

## Danh mục tài liệu
| File | Nội dung |
|------|----------|
| `01-requirements.md` | Yêu cầu đã đóng gói (scope, tiêu chí done) |
| `02-tasks.md` | Task breakdown + trạng thái |
| `03-security-findings.md` | SQLi / XSS / secret / input-validation (xếp hạng) |
| `04-performance-findings.md` | N+1, vòng lặp, memory leak, big-O, top-3 chậm nhất |
| `05-naming-readability.md` | Bảng tên cũ → mới + lý do |
| `06-bugs-logic.md` | Edge case, off-by-one, race condition + test tái hiện |
| `07-conclusion.md` | Kết luận & khuyến nghị ưu tiên |

## Cách chạy test
Backend (pytest chạy trên DB thật, mỗi test rollback — xem `backend/conftest.py`):
```bash
cd backend
.venv/Scripts/python.exe -m pytest -q            # toàn bộ
.venv/Scripts/python.exe -m pytest accounts/tests.py -q   # 1 app
```
Frontend (Node thuần cho unit legacy JS; Playwright cho e2e):
```bash
cd frontend
node e2e/unit/forum-xss.test.mjs                 # unit escape XSS
```
