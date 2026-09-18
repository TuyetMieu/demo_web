# Nhập bài học Python từ PDF / Markdown

Trang `/admin` có mục **Nhập bài học từ PDF / Markdown**. Tải file lên, hệ thống nhận
diện thành 4 bước S1–S4, bạn duyệt lại rồi bấm **Lưu vào khoá học**. Nội dung được lưu
vào cột `lessons.content_json` và Studio đọc trực tiếp từ đó.

File mẫu chạy được: [`samples/lesson-fstring.md`](samples/lesson-fstring.md) (và bản PDF
`samples/lesson-fstring.pdf` xuất từ chính nội dung đó).

## Hai đường nhận diện

1. **Template** — file theo đúng mẫu heading bên dưới. Nhanh, chính xác, không gọi mạng.
2. **Gemini** — chỉ chạy khi template không khớp. Cần `GEMINI_API_KEY` trong `.env`.
   Kết quả là suy đoán của AI nên **luôn phải đọc lại** trước khi lưu; bản xem trước hiện
   nhãn `gemini` để bạn biết.

Không có key và file lệch mẫu → báo lỗi rõ ràng, không lưu gì.

Với PDF, hệ thống bóc lớp văn bản. **PDF scan (chỉ có ảnh) sẽ bị từ chối** — không có
OCR. Hãy xuất PDF từ trình soạn thảo, hoặc dùng thẳng Markdown.

## Mẫu Markdown

Mỗi bước là một heading `## S<n> <tên gì cũng được>`. Bước nào không có thì bỏ luôn —
Studio tự ẩn và đánh số lại (ví dụ chỉ có S1 và S4 thì học viên thấy "Bước 1/2").

````markdown
# Tiêu đề bài học

## S1 Ngữ cảnh

Đoạn văn mô tả tình huống.

```python
print("code minh hoạ")
```

### Dự đoán
Câu hỏi đặt ra cho học viên?
- [ ] A. Tiêu đề lựa chọn — mô tả ngắn
- [x] B. Lựa chọn đúng — đánh dấu bằng [x]

### Giải thích
1. **Dòng 1**: giải thích cho dòng đó.
2. **Dòng 2**: giải thích tiếp.

### Ngộ nhận
**"Câu nói sai mà học viên hay tin"**
Giải thích vì sao sai.

### Bộ nhớ
```json
{ "heapAddr": "0x7fff892a0",
  "stack": [{ "label": "Scope Global", "name": "a", "ptr": "0x7fff892a0" }],
  "heap": { "type": "PyListObject", "refcount": 2,
            "cells": [{ "value": "85", "id": "0x1B0" }] },
  "assertion": ">>> id(a) == id(b)", "assertionResult": "True" }
```

## S2 Trắc nghiệm

Câu hỏi trắc nghiệm?
- [ ] A. Phương án sai — vì sao sai
- [x] B. Phương án đúng — vì sao đúng

### Phân loại
Câu dẫn cho phần kéo thả.
- key1 | Tên nhóm 1 | Phụ đề | Mô tả :: `thẻ A`, `thẻ B`
- key2 | Tên nhóm 2 | Phụ đề | Mô tả :: `thẻ C`

### Tự giải thích
Câu hỏi yêu cầu học viên viết lời giải thích?
- tên ý thứ nhất :: tu khoa 1, tu khoa 2
- tên ý thứ hai :: tu khoa 3

## S3 Lắp ghép

Mô tả nhiệm vụ.

```python
def ham(tham_so):
    {{slot1}}
    for x in tham_so:
        {{slot2}}
```

- slot1 = `result = []`
- slot2 = `result.append(x)`
- bank1 = `result = tham_so` (Bẫy Alias)

### Dự đoán kết quả
len(result) bằng bao nhiêu? [1 | *2 | 3]

### Nhật ký
- T0: trạng thái ban đầu
- T1: sau lệnh đầu tiên

## S4 Bài tập

Đề bài cho phần tự code.

### Code khởi tạo
```python
def solve(rows):
    return []
```

### Lời giải
```python
def solve(rows):
    return [r * 2 for r in rows]
```

### Gợi ý
- Nguyên lý :: nội dung gợi ý tầng 1
- Cấu trúc :: nội dung gợi ý tầng 2

### Test
| call | expect | name |
|------|--------|------|
| `solve([1, 2])` | `[2, 4]` | Nhân đôi |
| `solve([])` | `[]` | Danh sách rỗng |

### Cấm
- `.pop(`
- `import os`
````

## Quy ước cần nhớ

| Ký hiệu | Ý nghĩa |
|---|---|
| `- [x]` | Đáp án đúng. Mỗi phần trắc nghiệm phải có đúng một dấu `[x]`. |
| `—` `--` `\|` | Ngăn tiêu đề lựa chọn với phần mô tả. |
| `::` | Ngăn phần khai báo với danh sách giá trị (phân loại, rubric, gợi ý). |
| `{{slot1}}` | Chỗ trống trong khung lắp ghép. Số slot phải khớp với dòng `slot1 = ...`. |
| `*` | Đánh dấu đáp án đúng trong `[a \| *b \| c]`. |
| Dòng văn xuôi trước danh sách | Là câu hỏi / câu dẫn của phần đó. |

- `call` và `expect` trong bảng Test là **biểu thức Python chạy được**, đánh giá trong
  chính namespace của học viên. Cột `name` là tuỳ chọn.
- `### Cấm` chặn theo chuỗi con trong mã nguồn. Viết cụ thể (`.format(` chứ đừng viết `%`,
  kẻo chặn luôn phép chia lấy dư).
- `### Bộ nhớ` và `### Nhật ký` hiếm khi rút được từ tài liệu thường. Cứ khai bằng JSON
  như trên, hoặc bỏ trống rồi bổ sung trong ô JSON ở bản xem trước.

## Sau khi lưu

- **Mã khoá học**: thường là `python`.
- **Số thứ tự bài** (`sort_order`) bắt đầu từ 1. Đường dẫn dùng chỉ số từ 0, nên bài
  `sort_order = 10` mở bằng `/lesson/python?lesson=9`.
- `sort_order = 11` là bài List & Mutability dựng tay, **không đọc `content_json`**.
- Hoàn thành bài ghi đúng `sort_order` của bài đang học.
- Trắc nghiệm nằm ở `step_2.mcq` nên tự động vào kho câu hỏi của quiz ôn tập.

## Kiểm thử

```bash
node scripts/test-lesson-import.cjs
```

Chạy khi cả hai server đang bật. Bộ test nhập cả `.md` lẫn `.pdf`, lưu vào khoá `python`,
học hết 4 bước bằng trình duyệt thật, chạy Pyodide chấm bài, kiểm tra hoàn thành ghi đúng
`sort_order`, rồi **tự xoá bài test**. Ảnh chụp lưu ở `python-studio-qa/`.
