# Python Studio — kiểm thử local

Mở http://localhost:3000/lesson/python sau khi đăng nhập.

Tài khoản test riêng đã tạo: `python.studio.20260918@example.com` / `PythonStudio!2026`.
Tài khoản này đã hoàn thành bài trong lượt kiểm thử. Dùng tài khoản khác để kiểm tra lần hoàn thành đầu tiên.

## Chạy ứng dụng

Backend, tại `D:\EDU\demo_web`: `npm run build`, sau đó `npm run start:prod`.
Frontend, tại `D:\EDU\demo_web\frontend`: `npm run dev`.
Frontend mặc định gọi backend http://localhost:5000; đổi bằng `NEXT_PUBLIC_API_URL` nếu cần.
Giữ cấu hình database và JWT hiện có trong `.env`. Không cần migration hay seed lại dữ liệu.

## Phạm vi

- 4 màn hình S1–S4 trong Figma: dự đoán, câu hỏi/phân loại, lắp ghép và mô phỏng bộ nhớ, sandbox Python.
- Nhãn theo Figma: S1 `Python 3.12`, S2 `CPython 3.11` (hổ phách), S3 `Python 3.12.2`, S4 `CPython 3.12` (Pyodide 0.27.7 chạy CPython 3.12). S2 có `Bước 1 đã xong • FACT Stage II`; S3 có thanh stepper S1–S4, thu gọn còn ô đánh dấu khi màn hình dưới 900px.
- Bài List nằm ở Module 2, bài 11 trong giáo trình hiện tại. Đường dẫn `?lesson=10` dùng chỉ số bắt đầu từ 0. Trang nhiệm vụ Python cũ (CODEGEN Z) đã bị xóa. `sort_order = 11` chạy Studio dựng tay; **mọi bài khác** render từ `lessons.content_json` do admin nhập từ PDF/Markdown (xem `LESSON-IMPORT-FORMAT.md`), và hoàn thành ghi đúng `sort_order` của bài đang học. Bài chưa có nội dung hiện trạng thái "Đang biên soạn".
- `/courses/python` có nút mở Studio riêng để tiện test, kể cả khi chưa học đủ các bài trước.
- Tài khoản `role = 'admin'` thấy nút "Gợi ý + đáp án (admin)" ở footer; popup kèm bảng đáp án đủ 4 bước. Tài khoản thường chỉ thấy "Gợi ý cứu trợ" như cũ. Bài vốn chấm ở trình duyệt nên bảng này không lộ thêm dữ liệu.
- Bản nháp lưu trên trình duyệt theo tài khoản, bao gồm bước học, đáp án và code. Hoàn thành, điểm quiz, XP và streak lưu trên backend hiện có. Không đồng bộ bản nháp giữa các thiết bị.
- XP lấy theo cấu hình bài trên backend; không dùng số +80/−30 minh họa trong Figma. Xem lời giải mẫu không tự ý trừ XP. Nộp lại không cộng XP lần hai.
- S3 dùng `result = []` để lọc đúng. `copy()` và `list(data)` tạo bản sao nhưng giữ cả dữ liệu dưới ngưỡng; có phản hồi riêng. Địa chỉ heap là nhãn mô phỏng để minh họa.
- S4 chạy Python thật bằng Pyodide 0.27.7 trong Web Worker, lần đầu cần mạng để tải runtime. Giới hạn tải 60 giây, thực thi 5 giây, có nút dừng. Không chạy mã học viên trong tiến trình backend.
- Chấm bài ở trình duyệt phục vụ thực hành; API hoàn thành dùng cơ chế hiện có, chưa phải hệ thống chấm thi chống gian lận phía server.

## Checklist

Kiểm thử tự động: chạy `node scripts/test-python-studio.cjs` từ thư mục project khi hai server đang chạy. Bộ test dùng Edge headless và tài khoản test riêng ở trên, lưu ảnh vào `python-studio-qa/`.

1. Mở Studio, đăng ký Python nếu chưa đăng ký. Dự đoán ở S1 rồi xác nhận để mở giải thích.
2. S2 chọn B; đưa append/extend/sort/pop vào In-place, còn lại vào Pure; giải thích đủ ý tham chiếu và mutable.
3. S3 chọn `result = []`, `if val >= threshold:`, `result.append(val)`; chạy từng bước hoặc chạy hết; dự đoán 2 phần tử.
4. S4 thử lời giải sai, code lỗi cú pháp, vòng lặp vô hạn, rồi viết lời giải đúng. Chạy thử chỉ kiểm tra; Nộp & Chấm điểm kiểm tra 5 trường hợp và lưu khi tất cả đạt.
5. Tải lại: code và bước học còn nguyên, trạng thái hoàn thành lấy lại từ backend. Nộp lại: XP không tăng.
6. Về trang khóa học: đúng bài 11 được đánh dấu hoàn thành; không đánh dấu nhầm bài 1.

Lời giải tham khảo:

```python
def clean_and_boost_scores(raw_scores, bonus):
    return [round(x + bonus, 2) for x in raw_scores if x >= 0]
```
