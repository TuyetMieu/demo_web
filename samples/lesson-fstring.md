# Định dạng chuỗi với f-string

## S1 Ngữ cảnh

Trang thống kê của CLB lập trình cần in điểm trung bình kèm tên thành viên. Nhiều bạn còn nối chuỗi bằng dấu cộng nên phải tự gọi str() cho từng số, dễ quên và dễ sai kiểu.

```python
name = "Mai"
score = 8.4567
print("Diem cua " + name + " la " + str(score))
print(f"Điểm của {name} là {score:.2f}")
```

### Dự đoán

Hai dòng print ở trên in ra khác nhau ở điểm nào?

- [ ] A. Giống hệt nhau — Cả hai đều in đủ 4 chữ số thập phân
- [x] B. Dòng f-string làm tròn 2 chữ số — Hậu tố :.2f định dạng ngay trong chuỗi
- [ ] C. Dòng đầu báo lỗi TypeError — Vì cộng chuỗi với số
- [ ] D. Dòng f-string in ra dấu ngoặc nhọn — f-string không thay thế biến

### Giải thích

1. **Dòng 3**: Toán tử + chỉ nối được chuỗi với chuỗi, nên phải bọc str(score) thủ công.
2. **Dòng 4**: Tiền tố f cho phép nhúng biểu thức trong dấu ngoặc nhọn, Python tự gọi format().
3. **Hậu tố :.2f**: Là format spec, yêu cầu in số thực với đúng 2 chữ số sau dấu phẩy.

### Ngộ nhận

**"f-string chỉ là cách viết ngắn của phép cộng chuỗi"**

Không phải. f-string gọi hàm format() của từng đối tượng nên nhận được cả format spec như :.2f, :>10 hay :,. Phép cộng chuỗi không làm được điều đó.

## S2 Trắc nghiệm

Biểu thức `f"{3.14159:.3f}"` trả về chuỗi nào?

- [ ] A. "3.14159" — f-string không đổi giá trị gốc
- [x] B. "3.142" — Format spec .3f làm tròn tới 3 chữ số
- [ ] C. "3.141" — Python cắt bớt thay vì làm tròn
- [ ] D. Báo lỗi ValueError — Không dùng được dấu chấm trong format spec

### Phân loại

Xếp các cách viết sau vào đúng nhóm.

- fstring | Dùng f-string | Nhúng biểu thức | Đọc gọn, có format spec :: `f"{x}"`, `f"{x:.2f}"`, `f"{x!r}"`
- older | Cách cũ | Trước Python 3.6 | Dài dòng hơn :: `"%.2f" % x`, `"{}".format(x)`, `str(x)`

### Tự giải thích

Vì sao f-string định dạng được số thực mà phép cộng chuỗi thì không?

- gọi format :: format, __format__, dinh dang
- format spec :: format spec, :.2f, dac ta

## S3 Lắp ghép

Viết hàm tạo dòng báo cáo có dạng `Mai: 8.46 diem`. Tên căn trái, điểm làm tròn 2 chữ số.

```python
def report_line(name, score):
    {{slot1}}
```

- slot1 = `return f"{name}: {score:.2f} diem"`
- bank1 = `return name + ": " + score + " diem"` (Bẫy cộng chuỗi)
- bank1 = `return f"{name}: {score} diem"` (Thiếu format spec)

### Dự đoán kết quả

report_line("Mai", 8.4567) trả về gì? [Mai: 8.4567 diem | *Mai: 8.46 diem | Mai: 8 diem]

## S4 Bài tập

Viết hàm `format_scores(rows)` nhận danh sách các cặp (tên, điểm) và trả về danh sách chuỗi dạng `Ten: 8.46`. Điểm luôn làm tròn 2 chữ số. Không được sửa danh sách đầu vào.

### Code khởi tạo

```python
def format_scores(rows):
    """Trả về danh sách chuỗi 'Ten: 8.46'."""
    result = []
    # Viết lời giải của bạn ở đây
    return result
```

### Lời giải

```python
def format_scores(rows):
    """Trả về danh sách chuỗi 'Ten: 8.46'."""
    return [f"{name}: {score:.2f}" for name, score in rows]
```

### Gợi ý

- Nguyên lý :: Mỗi phần tử là một cặp, dùng giải nén `for name, score in rows`.
- Định dạng :: Dùng f-string với hậu tố `:.2f` thay vì gọi round().
- Lời giải mẫu :: Một list comprehension trả thẳng danh sách chuỗi là đủ.

### Test

| call | expect | name |
|------|--------|------|
| `format_scores([("Mai", 8.4567)])` | `["Mai: 8.46"]` | Làm tròn 2 chữ số |
| `format_scores([])` | `[]` | Danh sách rỗng |
| `format_scores([("An", 10), ("Bo", 0)])` | `["An: 10.00", "Bo: 0.00"]` | Số nguyên vẫn có 2 chữ số |

### Cấm

- `"%`
- `.format(`
