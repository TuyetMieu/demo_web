# Báo cáo chuyển đổi PE_Python_v2 -> Python Studio

92 bài. 24 bài có câu dự đoán ở S1, 92 bài có trắc nghiệm ở S2, 74 bài có khung lắp ghép ở S3, 45 bài chấm được tự động ở S4 (47 bài còn lại là bài đọc/lab desktop, xem cột Bỏ qua).

| # | Mã | Bài | Runtime | S1 dự đoán | S2 quiz | S3 slot | S4 test | Bỏ qua |
|---|----|-----|---------|-----------|---------|---------|---------|--------|
| 1 | C01 | Chọn công cụ và dựng môi trường học | MANUAL_ENV | — | 1 | — | — | runtime MANUAL_ENV: chạy trên desktop lab, không chạy trong trình duyệt |
| 2 | C02 | REPL, script và notebook: trạng thái đến từ đâu? | MANUAL_NOTEBOOK | — | 1 | — | — | runtime MANUAL_NOTEBOOK: chạy trên desktop lab, không chạy trong trình duyệt |
| 3 | C03 | Git: lưu một thay đổi và gửi vào fork | MANUAL_GIT | — | 1 | — | — | runtime MANUAL_GIT: chạy trên desktop lab, không chạy trong trình duyệt |
| 4 | P01 | Tên biến và kết quả chương trình | PY_CORE | có | 1 | 1 | 2 | — |
| 5 | P02 | Chuỗi nhập vào và phép tính số | PY_CORE | có | 1 | 1 | 3 | — |
| 6 | C04 | Tên biến, kiểu động và ghi chú có ích | PY_CORE | — | 1 | 3 | 2 | — |
| 7 | C05 | Toán tử, thứ tự tính và làm tròn xuống | PY_CORE | — | 1 | 1 | 2 | — |
| 8 | P03 | Tách dữ liệu từ tên tệp | PY_CORE | có | 1 | 1 | 3 | — |
| 9 | C06 | Chuỗi: chuẩn hóa, định dạng và không sửa tại chỗ | PY_CORE | — | 1 | 2 | 2 | — |
| 10 | P04 | Điều kiện và giá trị ở ranh giới | PY_CORE | có | 1 | 3 | 3 | — |
| 11 | P05 | List và việc hai tên dùng chung dữ liệu | PY_CORE | có | 1 | 3 | 3 | — |
| 12 | C07 | Index và slice: chọn đúng phần dữ liệu | PY_CORE | — | 1 | 3 | 2 | — |
| 13 | C08 | Thêm, xóa và đảo list | PY_CORE | — | 1 | 3 | 2 | — |
| 14 | P06 | Dictionary và tra cứu theo khóa | PY_CORE | có | 1 | 1 | 4 | — |
| 15 | C09 | Dictionary: duyệt, xóa và tìm cực trị | PY_CORE | — | 1 | 3 | 2 | — |
| 16 | P07 | Chọn tuple và set đúng mục đích | PY_CORE | có | 1 | 1 | 3 | — |
| 17 | C10 | Tuple, unpacking và lựa chọn collection | PY_CORE | — | 1 | 2 | 2 | — |
| 18 | C17 | Tên file thành hồ sơ người bơi | PY_CORE | — | 1 | 3 | 2 | — |
| 19 | P08 | Vòng for và biến tích lũy | PY_CORE | có | 1 | 3 | 4 | — |
| 20 | C14 | Comprehension, enumerate, zip và Counter | PY_CORE | — | 1 | 3 | 3 | — |
| 21 | P09 | While, sentinel và điều kiện dừng | PY_CORE | có | 1 | 3 | 4 | — |
| 22 | C11 | range, break và continue | PY_CORE | — | 1 | 3 | 2 | — |
| 23 | P10 | Hàm trả về giá trị | PY_CORE | có | 1 | 3 | 1 | — |
| 24 | C13 | Khám phá API, traceback và module chuẩn | PY_CORE | — | 1 | 1 | 1 | — |
| 25 | C15 | Ngẫu nhiên có thể kiểm thử | PY_CORE | — | 1 | 3 | 2 | — |
| 26 | P11 | Module và trung bình có trọng số | PY_CORE | có | 1 | 1 | 1 | — |
| 27 | C19 | Module, alias và package lồng nhau | MANUAL_MULTIFILE | — | 1 | — | — | runtime MANUAL_MULTIFILE: chạy trên desktop lab, không chạy trong trình duyệt |
| 28 | P12 | Đọc file với with và UTF-8 | PY_CORE | có | 1 | 3 | 1 | — |
| 29 | P13 | Ngoại lệ và dữ liệu nhập không hợp lệ | PY_CORE | có | 1 | 3 | 1 | — |
| 30 | C12 | Nhánh elif và input trong chương trình CLI | PY_CORE | — | 1 | 3 | — | lời giải không chạy được ngoài lab (EOFError: EOF when reading a line) — bỏ toàn bộ ca tự động |
| 31 | C16 | Ngày giờ và tìm mẫu bằng regex | PY_CORE | — | 1 | 3 | 2 | — |
| 32 | P14 | Lưu cấu trúc dữ liệu bằng JSON | PY_CORE | có | 1 | 3 | 1 | — |
| 33 | C21 | File modes, buffering và lỗi I/O | PY_CORE | — | 1 | 3 | 2 | — |
| 34 | C22 | Duyệt thư mục và thao tác file trong vùng bài tập | PY_CORE | — | 1 | 3 | 2 | — |
| 35 | P15 | Class và trạng thái riêng từng đối tượng | PY_CORE | có | 1 | 3 | 2 | Ca mẫu P15-a: NameError: name 'student_average' is not defined |
| 36 | P16 | Kế thừa và ghi đè hành vi | PY_CORE | có | 1 | 2 | 1 | — |
| 37 | C20 | So sánh đối tượng, biểu diễn và đóng gói | PY_CORE | — | 1 | 3 | 2 | — |
| 38 | P17 | Tkinter: cửa sổ, widget và grid | DESKTOP_TK | có | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 39 | P18 | Callback: nối thao tác và trạng thái | DESKTOP_TK | có | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 40 | P19 | Biểu đồ phải khớp dữ liệu | OPTIONAL_LIBS:matplotlib | có | 1 | 3 | — | runtime OPTIONAL_LIBS:matplotlib: chạy trên desktop lab, không chạy trong trình duyệt |
| 41 | P20 | Test trường hợp thường và trường hợp biên | PY_CORE | có | 1 | 1 | 3 | Ca mẫu P20-a: NameError: name 'valid_boundary_cases' is not defined |
| 42 | P23 | Chuyển giao: báo cáo thời gian bơi | PY_CORE | có | 1 | 3 | 1 | — |
| 43 | C18 | Báo cáo bơi từ file đến kết quả | PY_CORE | — | 1 | 3 | 2 | — |
| 44 | P24 | Capstone: Sổ học tập USTH | PY_CORE + DESKTOP_TK | có | 1 | 3 | — | runtime PY_CORE + DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 45 | T01 | Cửa sổ, focus và trạng thái nút | DESKTOP_TK | — | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 46 | T02 | Lựa chọn dữ liệu: combo, radio, check và list | DESKTOP_TK | — | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 47 | T03 | Bố cục: Frame, padding và co giãn | DESKTOP_TK | — | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 48 | T04 | Menu và nhiều Notebook | DESKTOP_TK | — | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 49 | T05 | Hộp thoại và lựa chọn file | PY_CORE | — | 1 | 3 | — | lời giải cần tkinter: Pyodide trong trình duyệt không có; runtime PY_CORE: chạy trên desktop lab, không chạy trong trình duyệt |
| 50 | T06 | Tooltip, relief và Canvas | DESKTOP_TK | — | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 51 | T07 | Event loop, after và thanh tiến độ | DESKTOP_TK | — | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 52 | T08 | StringVar, scope và component tái sử dụng | DESKTOP_TK | — | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 53 | T09 | Biểu đồ trong Tk và thay đổi thang đo | DESKTOP_TK_MPL | — | 1 | 3 | — | runtime DESKTOP_TK_MPL: chạy trên desktop lab, không chạy trong trình duyệt |
| 54 | T10 | Người học tự viết unit test cho GUI | DESKTOP_TK | — | 1 | 3 | — | runtime DESKTOP_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 55 | T11 | Debug watch và mức log | PY_CORE | — | 1 | 3 | 1 | — |
| 56 | T12 | Quốc tế hóa và định dạng theo ngôn ngữ | PY_CORE | — | 1 | 3 | 2 | — |
| 57 | T13 | Slideshow GIF/JPEG và vòng đời ảnh | DESKTOP_TK_PIL | — | 1 | 3 | — | runtime DESKTOP_TK_PIL: chạy trên desktop lab, không chạy trong trình duyệt |
| 58 | T14 | Thiết kế lặp và factory cho thành phần GUI | PY_CORE | — | 1 | 3 | 1 | — |
| 59 | X01 | PW1: quản lý lớp bằng collection và CLI | PY_CORE | — | 1 | 3 | — | lời giải không chạy được ngoài lab (EOFError: EOF when reading a line) — bỏ toàn bộ ca tự động |
| 60 | A01 | Đa kế thừa, MRO và lớp trừu tượng | PY_CORE | — | 1 | 2 | 2 | — |
| 61 | A02 | NumPy và xếp hạng GPA có trọng số | LIBS:numpy | — | 1 | 3 | — | runtime LIBS:numpy: chạy trên desktop lab, không chạy trong trình duyệt |
| 62 | A03 | Curses: menu bàn phím cho quản lý điểm | MANUAL_CURSES | — | 1 | — | — | runtime MANUAL_CURSES: chạy trên desktop lab, không chạy trong trình duyệt |
| 63 | A04 | Nén bytes và đóng gói nhiều file | PY_CORE | — | 1 | 3 | 2 | — |
| 64 | A05 | Pickle, JSON và dữ liệu có kiểu | PY_CORE | — | 1 | 2 | 2 | — |
| 65 | A14 | Đọc bảng số bằng NumPy | LIBS:numpy | — | 1 | 2 | — | runtime LIBS:numpy: chạy trên desktop lab, không chạy trong trình duyệt |
| 66 | A15 | DataFrame từ CSV, Excel và database | LIBS:pandas,sqlalchemy,openpyxl | — | 1 | 1 | — | runtime LIBS:pandas,sqlalchemy,openpyxl: chạy trên desktop lab, không chạy trong trình duyệt |
| 67 | A16 | SAS, Stata, HDF5 và MATLAB | LIBS:pandas,h5py,scipy,pyreadstat | — | 1 | 3 | — | runtime LIBS:pandas,h5py,scipy,pyreadstat: chạy trên desktop lab, không chạy trong trình duyệt |
| 68 | A17 | Chọn loại biểu đồ và quản lý Figure | LIBS:matplotlib,numpy | — | 1 | 3 | — | runtime LIBS:matplotlib,numpy: chạy trên desktop lab, không chạy trong trình duyệt |
| 69 | A18 | Dựng MySQL và thiết kế schema bằng Workbench | MANUAL_MYSQL | — | 1 | — | — | runtime MANUAL_MYSQL: chạy trên desktop lab, không chạy trong trình duyệt |
| 70 | A19 | MySQL INSERT, UPDATE, DELETE và transaction | MANUAL_MYSQL | — | 1 | — | — | runtime MANUAL_MYSQL: chạy trên desktop lab, không chạy trong trình duyệt |
| 71 | A20 | Nối CRUD MySQL vào giao diện | MANUAL_MYSQL_TK | — | 1 | — | — | runtime MANUAL_MYSQL_TK: chạy trên desktop lab, không chạy trong trình duyệt |
| 72 | A21 | wxPython: cửa sổ và các nhóm control | MANUAL_WX | — | 1 | — | — | runtime MANUAL_WX: chạy trên desktop lab, không chạy trong trình duyệt |
| 73 | A23 | Bitmap lát nền trong wxPython | MANUAL_WX | — | 1 | — | — | runtime MANUAL_WX: chạy trên desktop lab, không chạy trong trình duyệt |
| 74 | A24 | OpenGL trong wx: cube và phép biến đổi 3D | MANUAL_OPENGL | — | 1 | — | — | runtime MANUAL_OPENGL: chạy trên desktop lab, không chạy trong trình duyệt |
| 75 | A25 | Pyglet, shader và cube nhiều màu | MANUAL_PYGLET_GL | — | 1 | — | — | runtime MANUAL_PYGLET_GL: chạy trên desktop lab, không chạy trong trình duyệt |
| 76 | A26 | Hoạt ảnh OpenGL: chuyển động theo thời gian | PY_CORE | — | 1 | 3 | 2 | — |
| 77 | P21 | Thread và queue: nhận kết quả việc nền | WORKER_LAB | có | 1 | 3 | — | runtime WORKER_LAB: chạy trên desktop lab, không chạy trong trình duyệt |
| 78 | P22 | Tiến trình con và mã kết thúc | WORKER_LAB | có | 1 | — | — | runtime WORKER_LAB: chạy trên desktop lab, không chạy trong trình duyệt |
| 79 | A06 | Tiến trình, trạng thái và PCB | PY_CORE | — | 1 | 1 | 2 | — |
| 80 | A07 | Mô phỏng FCFS, SJF, priority và round-robin | PY_CORE | — | 1 | 3 | 2 | — |
| 81 | A08 | Tạo tiến trình trên Windows và fork/exec trên UNIX | MANUAL_OS_PAIR | — | 1 | — | — | runtime MANUAL_OS_PAIR: chạy trên desktop lab, không chạy trong trình duyệt |
| 82 | A09 | Luồng chuẩn, pipe và vòng đời process | PY_CORE | — | 1 | 3 | — | lời giải cần subprocess: Pyodide trong trình duyệt không có; runtime PY_CORE: chạy trên desktop lab, không chạy trong trình duyệt |
| 83 | A10 | Bộ nhớ dùng chung, GIL và chọn concurrency | CONCEPT_REVIEW | — | 1 | — | — | A10-K01: không parse được; A10-K02: không parse được |
| 84 | A11 | Race condition và Lock | PY_CORE | — | 1 | 3 | — | lời giải cần threading: Pyodide trong trình duyệt không có; runtime PY_CORE: chạy trên desktop lab, không chạy trong trình duyệt |
| 85 | A12 | Nhiều worker, dừng hợp tác và queue qua module | PY_CORE | — | 1 | 3 | — | lời giải cần threading: Pyodide trong trình duyệt không có; runtime PY_CORE: chạy trên desktop lab, không chạy trong trình duyệt |
| 86 | A13 | TCP và HTTP qua dịch vụ lab cục bộ | MANUAL_NETWORK | — | 1 | — | — | runtime MANUAL_NETWORK: chạy trên desktop lab, không chạy trong trình duyệt |
| 87 | A22 | Hai toolkit: chẩn đoán mainloop và trao đổi dữ liệu | MANUAL_DUAL_GUI | — | 1 | — | — | runtime MANUAL_DUAL_GUI: chạy trên desktop lab, không chạy trong trình duyệt |
| 88 | X02 | PW2-PW4: domain objects, GPA và chia package | LIBS:numpy | — | 1 | 3 | — | runtime LIBS:numpy: chạy trên desktop lab, không chạy trong trình duyệt |
| 89 | X03 | PW5-PW6: ba file, archive và pickle có nén | PY_CORE | — | 1 | 3 | 2 | — |
| 90 | X04 | PW7: shell có chuyển hướng và pipeline | PY_CORE | — | 1 | 3 | — | lời giải cần subprocess: Pyodide trong trình duyệt không có; runtime PY_CORE: chạy trên desktop lab, không chạy trong trình duyệt |
| 91 | X05 | PW8: lưu pickle có nén trong background | PY_CORE | — | 1 | 3 | — | lời giải cần threading: Pyodide trong trình duyệt không có; runtime PY_CORE: chạy trên desktop lab, không chạy trong trình duyệt |
| 92 | X06 | PW9: ứng dụng quản lý điểm hoàn chỉnh bằng Tkinter | MANUAL_CAPSTONE | — | 1 | — | — | runtime MANUAL_CAPSTONE: chạy trên desktop lab, không chạy trong trình duyệt |
