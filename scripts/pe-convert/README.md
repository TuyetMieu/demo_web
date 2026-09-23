# Chuyển PE_Python_v2 thành bài học Python Studio

Bộ chuyển đổi đọc gói bàn giao **PE_Python_v2** (92 bài, định dạng riêng của
nhóm biên soạn) và sinh ra nội dung `studio-lesson/v1` — đúng thứ mà
`lessons.content_json` lưu và `StudioLesson.tsx` dựng thành 4 màn hình S1–S4.

Không có bước thủ công nào giữa hai bên: chạy lại bộ chuyển đổi là ra lại toàn
bộ 92 bài.

## Chạy

```bash
# 1. Sinh nội dung (mặc định đọc D:/workplace/USTH-PE/PE_Python_v2)
python scripts/pe-convert/convert.py [--pe <thư mục PE>] [--no-solutions]

# 2. Kiểm tra ca chấm bằng CPython trên máy
python scripts/pe-convert/verify_tests.py

# 3. Kiểm tra lại bằng chính Pyodide của trình duyệt (bắt lỗi CPython không thấy)
npm i --no-save pyodide@0.27.7
node scripts/pe-convert/pyodide-check.mjs

# 4. Nạp vào DB (mặc định CHẠY THỬ; --apply mới ghi)
npx ts-node scripts/seed-pe-lessons.ts
npx ts-node scripts/seed-pe-lessons.ts --apply --set-count
```

Kết quả nằm ở `out/`: `lessons.json` (gói để seed), `lessons/<sort>-<mã>.json`
(từng bài, dễ diff), `curriculum-python.json` (giáo trình cho frontend),
`report.md` + `report.json` (độ phủ từng bài).

## Ánh xạ

| Màn hình Studio | Lấy từ ngân hàng PE |
|---|---|
| S1 `context` | `primer` |
| S1 `code` | `worked_example.code` |
| S1 `explain` | `worked_example.explanation`, tách theo câu |
| S1 `predict` | quiz CUỐI của bài, kèm `feedback` từng lựa chọn (chỉ bài có ≥ 2 quiz) |
| S1 `misconception` | `public_tests[].misconception_caught`, không có thì lấy feedback của một lựa chọn sai |
| S2 `mcq` | các quiz còn lại + khoá đáp án `instructor_answers.quiz_keys` |
| S2 `selfExplain` | `self_explanation.prompt`, mức 2 của rubric làm gợi ý trong ô nhập |
| S3 `scaffold` | lời giải `answers/<mã>/reference.py`, đục 1–3 dòng cốt lõi thành slot |
| S3 `task.rule` | `modification` |
| S3 `trace` | `guided_steps` |
| S4 `task` | `challenge_contract` + `public_tests` + `manual_checks` |
| S4 `starterCode` | sinh từ lời giải: giữ import, chữ ký hàm/lớp và docstring |
| S4 `solutionCode` | `answers/<mã>/reference.py` (bài quy trình: `instructor_answers.solution` đưa vào dạng chú thích) |
| S4 `hints` | `hints` (3 tầng) |
| S4 `procedure` | `instructor_answers.solution` của bài `answer_kind: procedure` |
| S4 `tests` | `public_tests` + `checks` của `test_criteria.json` |

Thứ tự bài theo `order` của ngân hàng. Module gom theo khoảng `order` trong
[`modules.py`](modules.py).

### Vì sao quiz cuối lên S1 chứ không phải quiz đầu

`QuizzesService.collectQuestions()` đọc `content_json.step_2.mcq` để dựng quiz
ôn tập. Bài chỉ có một quiz thì quiz đó phải ở lại S2, nếu không kho câu hỏi
mất bài. Bài có từ hai quiz trở lên mới tách câu cuối lên S1 làm câu dự đoán.

### Ca kiểm thử: hai dạng

Studio chấm bằng cặp **biểu thức** `call`/`expect`, đánh giá trong namespace
của học viên sau khi code đã chạy một lần (`studio-lesson.worker.js`).

* `assert X == Y` đơn lẻ → `call = X`, `expect = Y`. Sai thì UI in ra giá trị
  mong đợi và giá trị nhận được.
* Ca nhiều câu lệnh (gán, vòng lặp, try/except, tạo file fixture) → gói thành
  `call = (exec('<mã>', globals()) or True)`, `expect = True`. Assert hỏng thì
  worker bắt exception và hiện đúng thông báo của assert đó.

Mọi ca phát hành đều đã được **chạy thử với chính lời giải tham chiếu** trong
lúc chuyển đổi (tiến trình con, stdin đóng, timeout 20 giây). Ca nào lời giải
đúng cũng không qua thì bị loại và ghi lý do vào `report.md`.

### Bài quy trình

17 bài (dựng môi trường, REPL/notebook, Git, MySQL, wx, OpenGL…) không có mã
Python để chấm. Đáp án của chúng là các bước thao tác, nên bộ chuyển đổi tách
thành `step_4.procedure` (mảng dòng) thay vì nhét vào ô soạn mã dưới dạng chú
thích — bấm "Chạy thử" trên một file toàn comment chỉ ra console rỗng, người
học tưởng hỏng. Studio hiện khối "Quy trình tham chiếu" và bỏ hẳn editor khi
bài không có `starterCode`/`solutionCode`/`tests`.

### Tệp kèm bài

`support_files` của PE là tệp rời (`grading.py`, `metadata.py`). Trình duyệt chỉ
chạy một file, nên bộ chuyển đổi chèn sẵn một khối dựng lại module đó vào đầu
`starterCode`/`solutionCode`; dòng `from grading import ...` của bài vẫn chạy
như trong lab. `@solution:C17` nghĩa là dùng lời giải bài C17.

## Những chỗ KHÔNG chuyển được, và vì sao

* **47/92 bài không có chấm tự động.** Phần lớn là bài chạy trên desktop lab
  (Tkinter, wxPython, MySQL, OpenGL, curses, pandas/NumPy, tiến trình con):
  Pyodide trong trình duyệt chỉ có thư viện chuẩn. Bốn bài PY_CORE khác cũng
  không chấm được: C12 và X01 đọc `input()`, A09 cần tiến trình con, A10 là bài
  ôn khái niệm không có check chạy được. Các bài này vẫn đủ S1–S3 và phần đề
  bài, lời giải, gợi ý ở S4 — học viên đọc và làm trên máy lab. Vì Studio chỉ
  ghi hoàn thành khi toàn bộ test S4 đạt, `StudioLesson.tsx` được bổ sung nút
  "Đánh dấu đã hoàn thành" ở bước cuối cho đúng nhóm bài không có test (các
  cổng của S1–S3 vẫn phải qua).
* **9 bài P01–P09 đã đổi vỏ hợp đồng.** Bản PE là script nhận sẵn biến
  (`name`, `fee`, `scores`…), mỗi ca test nạp biến khác rồi chạy lại script.
  Studio chạy code học viên đúng một lần nên không nạp biến vào được. Chín bài
  này được gói lại thành hàm trong [`overrides.py`](overrides.py): giữ nguyên
  mục tiêu học, số liệu và ngộ nhận của PE, chỉ đổi phần vỏ. P15 và P20 giữ
  nguyên đề, chỉ bổ sung ca chấm vì ca công khai của PE gọi hàm của bộ chấm.
* **Không sinh phần `classify` (kéo thả) ở S2.** Ngân hàng không có dữ liệu
  phân nhóm; tự bịa nhóm là tự chế nội dung dạy học.
* **`selfExplain` không có rubric từ khoá.** Rubric của PE là thang 0–2 cho
  người chấm đọc. Studio lại chặn học viên đi tiếp khi lời giải thích chưa khớp
  ĐỦ mọi dòng rubric, nên gắn từ khoá đoán bừa sẽ khoá bài học. Ô tự giải thích
  vẫn hiện, chỉ không tự chấm.
* **Khối mồi nhử ở S3 là do sinh tự động.** Mỗi slot được thêm một khối sai
  bằng cách đổi đúng một chi tiết của đáp án (`>=` thành `>`, mất `.copy()`,
  `append` thành `extend`…). 16/196 slot không có luật nào khớp nên chỉ có một
  lựa chọn đúng.
* **Sai số dấu phẩy động.** PE cho phép lệch 1e-9; Studio so bằng `==`. Các ca
  hiện có đều là số biểu diễn đúng nên vẫn qua, nhưng ca mới cần lưu ý.

## Cảnh báo về lời giải nằm ở client

`content_json` được API trả thẳng về trình duyệt, nên `solutionCode` và `tests`
là dữ liệu công khai với học viên. Đây là thiết kế sẵn có của Python Studio
(bài chấm ngay trong trình duyệt, xem `PYTHON-STUDIO-TEST.md`), nhưng **ngược
với yêu cầu của gói PE** — `README_DEV.md` của PE ghi rõ không tải trước
`instructor_answers`, hidden test hay đáp án challenge vào client.

Nếu cần giữ đáp án ở phía máy chủ thì chạy `convert.py --no-solutions` (bỏ
`solutionCode`, giữ ca kiểm thử) và làm dịch vụ chấm riêng — việc này nằm ngoài
phạm vi bộ chuyển đổi.

## Sau khi seed

`sort_order` 1–92 là 92 bài PE theo đúng `order` của ngân hàng (bài đầu tiên là
bài 1). Bài List & Mutability dựng tay nằm **cuối** giáo trình ở `sort_order = 93`
— `PythonStudio.tsx` bỏ qua `content_json` ở đúng số này, nên hằng
`PYTHON_LESSON_NUMBER` (frontend/src/lib/python-studio.ts) phải khớp
`HAND_BUILT_SORT_ORDER` trong `convert.py`.

Đường dẫn bài dùng chỉ số từ 0: bài `sort_order = 16` mở bằng
`/lesson/python?lesson=15`.

Trang `/courses/python` lấy danh sách bài từ `frontend/src/lib/curricula.json`
(dữ liệu tĩnh), không phải từ DB. Seed xong phải thay khối
`CURRICULA.python.modules` bằng `out/curriculum-python.json`, nếu không tên bài
trên trang khoá học và nội dung Studio sẽ lệch nhau.
