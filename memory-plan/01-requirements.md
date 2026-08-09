# 01 — Yêu cầu đã đóng gói

## Mục tiêu
Rà soát & sửa các lỗi **Security, Performance, Bug/Logic, Naming/Readability**
trên repo `demo_web`, không phá vỡ hành vi nghiệp vụ đã port từ Flask.

## Phạm vi (In scope)
- Backend Django: `backend/**/*.py` (trừ migrations).
- Frontend: `frontend/**/index.html` (HTML tĩnh) + `frontend/static/js/**` (legacy JS).
- Cấu hình deploy liên quan bảo mật (`config/settings.py`, biến môi trường).

## Ngoài phạm vi (Out of scope)
- Thay đổi schema DB dùng chung với bản Flask đang chạy (chỉ **đề xuất**, không tự
  migrate — rủi ro dữ liệu production).
- Viết lại toàn bộ lớp JS legacy sang React (chỉ vá điểm lỗi).
- Thay đổi thuật toán nghiệp vụ (XP/streak/achievement) trừ khi là bug rõ ràng.

## Tiêu chí hoàn thành (Definition of Done)
- Mỗi lỗi được **sửa** kèm **test tái hiện** (đỏ trước, xanh sau) **hoặc** được
  **ghi nhận** rõ mức độ + cách tái hiện nếu không thể sửa an toàn (vd cần đổi schema).
- Không làm hỏng test hiện có.
- Báo cáo cuối: bảng xếp hạng security, top-3 điểm chậm, bảng naming, bảng bug.

## 4 nhóm yêu cầu (theo đề bài)
### A. Security — xếp hạng mức độ
- SQL injection, XSS, lộ API key/secret, thiếu validate input.

### B. Performance — local + web thật
- Query N+1, vòng lặp lồng nhau vô ích, memory leak âm thầm.
- Tính Big-O; chỉ ra **3 điểm chậm nhất**.

### C. Naming & Readability
- Tên có đúng việc nó làm? Convention nhất quán?
- Trả về **bảng: tên cũ → mới + lý do**.

### D. Bug & Logic
1. Edge case: null, rỗng, số âm, overflow.
2. Off-by-one, race condition.
- Mỗi bug: **1 test tái hiện**.

## Ràng buộc kỹ thuật
- Windows + PowerShell; Python 3.12 venv tại `backend/.venv`.
- Test backend chạy trên DB Neon thật (rollback), cần mạng.
- Frontend chưa có unit runner (chỉ Playwright) → unit legacy JS chạy bằng Node thuần.
