"""Gom 92 bài PE thành module cho giáo trình khóa `python`.

Mỗi module là một KHOẢNG LIÊN TIẾP theo `order` của ngân hàng bài học — trang
khóa học đánh số bài phẳng theo thứ tự module, nên module không được nhảy cóc.
Khoảng ghi theo `order` gốc của PE (1..92), không phải sort_order trong DB.
"""

# (order_dau, order_cuoi, ten_module)
MODULES = [
    (1, 3, 'Module 1: Môi trường, REPL và Git'),
    (4, 10, 'Module 2: Biến, kiểu dữ liệu và điều kiện'),
    (11, 18, 'Module 3: List, dict, tuple và set'),
    (19, 22, 'Module 4: Vòng lặp và biến tích lũy'),
    (23, 27, 'Module 5: Hàm, module và package'),
    (28, 34, 'Module 6: File, ngoại lệ và dữ liệu lâu dài'),
    (35, 37, 'Module 7: Lập trình hướng đối tượng'),
    (38, 44, 'Module 8: GUI cơ bản, biểu đồ, test và capstone nhỏ'),
    (45, 58, 'Module 9: Tkinter chuyên sâu'),
    (59, 68, 'Module 10: Nâng cao — OOP, NumPy, pandas và biểu đồ'),
    (69, 76, 'Module 11: MySQL, wxPython và đồ họa 3D'),
    (77, 87, 'Module 12: Thread, tiến trình, đồng thời và mạng'),
    (88, 92, 'Module 13: Capstone PW2–PW9'),
]


def module_of(order: int) -> str:
    for lo, hi, name in MODULES:
        if lo <= order <= hi:
            return name
    raise ValueError(f'order {order} nằm ngoài mọi module')
