"""
common/mock.py — máy chủ giả cho 23 route của openapi.yaml.

Mục đích: frontend gọi được đủ 23 route và nhận ĐÚNG hình dạng dữ liệu trong
`backend/openapi.yaml`, TRƯỚC khi backend thật được viết. Không chạm DB, không
cần đăng nhập, không phụ thuộc app nào khác.

Nguyên tắc:

1. **Hình dạng là hợp đồng, dữ liệu chỉ là ví dụ.** Mọi phản hồi dựng từ các
   builder `_user()`, `_course()`, ... bên dưới; các builder này liệt kê ĐỦ và
   ĐÚNG tập trường mà schema tương ứng khai `required`. `common/tests.py` gọi
   cả 23 route rồi validate từng phản hồi bằng jsonschema theo openapi.yaml —
   sửa builder mà lệch schema là test đỏ ngay.

2. **Không có trường vắng mặt.** Trường "chưa có giá trị" trả `None` chứ không
   bỏ đi, đúng quy ước ở openapi.yaml §info. Frontend nhờ vậy không phải phân
   biệt `null` với `undefined`.

3. **Bật/tắt bằng biến môi trường `MOCK_API`** (xem config/urls.py). Khi bật,
   các route này đứng TRƯỚC urlconf của app thật nên chúng che route thật —
   cố ý, để frontend chạy trọn luồng trên dữ liệu mẫu. Khi tắt, file này không
   được nạp và backend hoạt động y như cũ.

4. **AllowAny + không xác thực.** Mock không kiểm quyền: mọi route trả 200 như
   thể người gọi có đủ quyền. Muốn thử nhánh lỗi thì thêm `?mock_error=<mã>`
   (vd `?mock_error=403`) — phản hồi khi đó theo schema `Error`.
"""
from __future__ import annotations

from django.http import HttpResponse
from django.urls import path
from rest_framework.decorators import (
    api_view, authentication_classes, permission_classes, throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# Mốc thời gian cố định — phản hồi mock phải tất định để test so sánh được.
NOW = '2026-08-10T09:00:00Z'
EARLIER = '2026-08-03T14:30:00Z'

MSG = {
    400: 'Yêu cầu không hợp lệ',
    401: 'Chưa đăng nhập',
    403: 'Không có quyền truy cập',
    404: 'Không tìm thấy tài nguyên',
    409: 'Xung đột trạng thái',
    422: 'Vi phạm ràng buộc nghiệp vụ',
    429: 'Quá nhiều yêu cầu — vui lòng thử lại sau',
    500: 'Lỗi máy chủ nội bộ — chúng tôi đang xử lý',
}


# ── Builder: mỗi hàm dựng đúng một schema ────────────────────────────────

def _error(status: int, message: str | None = None, *,
           field: str | None = None, lessons_remaining: int | None = None) -> dict:
    """schema Error"""
    return {
        'request_id': 'mock-request-id',
        'error': {
            'status': status,
            'message': message or MSG.get(status, 'Lỗi'),
            'field': field,
            'lessons_remaining': lessons_remaining,
        },
    }


def _user(uid=1, name='Nguyễn Văn An', email='an.nv@sv.edu.vn', role='student') -> dict:
    """schema User"""
    return {
        'id': uid,
        'name': name,
        'email': email,
        'role': role,
        'avatar_url': None,
        'created_at': EARLIER,
    }


STUDENT = _user()
TEACHER = _user(99, 'TS. Trần Thị Bình', 'binh.tt@edu.vn', 'teacher')
CLASSMATES = [
    _user(2, 'Lê Minh Châu', 'chau.lm@sv.edu.vn'),
    _user(3, 'Phạm Quốc Dũng', 'dung.pq@sv.edu.vn'),
    _user(4, 'Vũ Thị Hà', 'ha.vt@sv.edu.vn'),
    _user(5, 'Đỗ Trung Kiên', 'kien.dt@sv.edu.vn'),
]


def _progress(course_id, course_title, done, total, *,
              quiz_score=7.5, last_active=NOW, cert=False) -> dict:
    """schema Progress"""
    return {
        'course_id': course_id,
        'course_title': course_title,
        'completed_lessons': done,
        'total_lessons': total,
        'progress_percent': round(done * 100 / total, 1) if total else 0.0,
        'average_quiz_score': quiz_score,
        'last_active_at': last_active,
        'certificate_issued': cert,
    }


# Sheet route 07: hệ thống có ĐÚNG 02 khóa.
COURSES = {
    'python': {
        'title': 'Lập trình Python căn bản',
        'subtitle': 'Từ cú pháp tới dự án nhỏ đầu tay',
        'description': 'Khóa nhập môn Python: kiểu dữ liệu, luồng điều khiển, '
                       'hàm, tệp và một dự án cuối khóa.',
        'level': 'Cơ bản',
        'objectives': [
            'Đọc hiểu và viết được chương trình Python ngắn',
            'Dùng thành thạo list, dict, hàm và mô-đun',
            'Hoàn thành một dự án nhỏ có xử lý tệp',
        ],
        'lesson_count': 5,
    },
    'db_design': {
        'title': 'Thiết kế cơ sở dữ liệu',
        'subtitle': 'ER, chuẩn hóa và SQL ứng dụng',
        'description': 'Mô hình thực thể–liên kết, ánh xạ sang lược đồ quan hệ, '
                       'chuẩn hóa tới BCNF và truy vấn SQL thực hành.',
        'level': 'Trung cấp',
        'objectives': [
            'Vẽ được mô hình ER cho bài toán thực tế',
            'Chuẩn hóa lược đồ tới BCNF',
            'Viết truy vấn SQL nhiều bảng',
        ],
        'lesson_count': 5,
    },
}

LESSON_TITLES = {
    'python': [
        'Biến, kiểu dữ liệu và phép toán',
        'Câu lệnh điều kiện và vòng lặp',
        'Hàm và phạm vi biến',
        'List, tuple, dict và set',
        'Đọc ghi tệp — dự án cuối khóa',
    ],
    'db_design': [
        'Mô hình thực thể – liên kết (ER)',
        'Ánh xạ ER sang lược đồ quan hệ',
        'Phụ thuộc hàm và chuẩn 1NF–3NF',
        'BCNF và phân rã bảo toàn',
        'Truy vấn SQL nhiều bảng — dự án cuối khóa',
    ],
}

# Bài học đánh số liên tục qua cả 2 khóa: python 1–5, db_design 6–10
LESSON_INDEX: dict[int, tuple[str, int]] = {}
for _ci, _cid in enumerate(COURSES):
    for _i in range(5):
        LESSON_INDEX[_ci * 5 + _i + 1] = (_cid, _i + 1)

# Số bài sinh viên mẫu đã hoàn thành ở mỗi khóa
COMPLETED = {'python': 3, 'db_design': 5}


def _progress_for(course_id: str) -> dict:
    meta = COURSES[course_id]
    return _progress(
        course_id, meta['title'], COMPLETED[course_id], meta['lesson_count'],
        quiz_score=8.0 if course_id == 'python' else 9.0,
        cert=COMPLETED[course_id] >= meta['lesson_count'],
    )


def _course(course_id: str, *, with_progress: bool) -> dict:
    """schema Course"""
    meta = COURSES[course_id]
    return {
        'id': course_id,
        'title': meta['title'],
        'subtitle': meta['subtitle'],
        'description': meta['description'],
        'level': meta['level'],
        'objectives': meta['objectives'],
        'teacher_name': TEACHER['name'],
        'lesson_count': meta['lesson_count'],
        'enrolled': with_progress,
        'progress': _progress_for(course_id) if with_progress else None,
    }


def _lesson(lesson_id: int, *, with_content: bool, completed=None) -> dict:
    """schema Lesson"""
    course_id, order = LESSON_INDEX[lesson_id]
    title = LESSON_TITLES[course_id][order - 1]
    if completed is None:
        completed = order <= COMPLETED[course_id]
    return {
        'id': lesson_id,
        'course_id': course_id,
        'title': title,
        'order': order,
        'content': (f'# {title}\n\nNội dung mẫu của bài {order} '
                    f'khóa {course_id}.') if with_content else None,
        'has_quiz': True,
        'published': True,
        'completed': completed,
        'updated_at': EARLIER,
    }


QUESTIONS = [
    ('Câu lệnh nào khai báo một danh sách rỗng trong Python?',
     [('A', 'list()'), ('B', '{}'), ('C', '()'), ('D', 'set()')], 'A',
     '`list()` và `[]` cùng tạo danh sách rỗng; `{}` tạo dict.'),
    ('Kết quả của `len("Việt Nam")` là bao nhiêu?',
     [('A', '7'), ('B', '8'), ('C', '9'), ('D', 'Báo lỗi')], 'B',
     'Chuỗi có 8 ký tự, tính cả dấu cách.'),
    ('Từ khóa nào định nghĩa một hàm?',
     [('A', 'func'), ('B', 'function'), ('C', 'def'), ('D', 'lambda')], 'C',
     '`def` định nghĩa hàm có tên; `lambda` chỉ tạo hàm ẩn danh.'),
    ('Kiểu dữ liệu nào KHÔNG thay đổi được sau khi tạo?',
     [('A', 'list'), ('B', 'dict'), ('C', 'set'), ('D', 'tuple')], 'D',
     'tuple là immutable — gán lại phần tử sẽ báo TypeError.'),
    ('Cách đúng để mở tệp và tự đóng sau khi dùng?',
     [('A', 'open(f)'), ('B', 'with open(f) as x:'),
      ('C', 'file(f)'), ('D', 'read(f)')], 'B',
     'Khối `with` đóng tệp kể cả khi thân khối ném lỗi.'),
]


def _quiz(lesson_id: int) -> dict:
    """schema Quiz — KHÔNG kèm đáp án đúng."""
    course_id, order = LESSON_INDEX[lesson_id]
    return {
        'lesson_id': lesson_id,
        'lesson_title': LESSON_TITLES[course_id][order - 1],
        'question_count': 5,
        'questions': [
            {
                'id': i + 1,
                'text': text,
                'options': [{'key': k, 'text': t} for k, t in options],
            }
            for i, (text, options, _correct, _explain) in enumerate(QUESTIONS)
        ],
    }


# Đáp án sinh viên mẫu đã chọn — sai đúng 1 câu (câu 4)
SUBMITTED = ['A', 'B', 'C', 'A', 'B']


def _quiz_result(lesson_id: int) -> dict:
    """schema QuizResult — chỗ DUY NHẤT đáp án đúng rời khỏi máy chủ."""
    review = []
    correct = 0
    for i, (text, _options, answer, explain) in enumerate(QUESTIONS):
        picked = SUBMITTED[i]
        ok = picked == answer
        correct += ok
        review.append({
            'question_id': i + 1,
            'text': text,
            'selected': picked,
            'correct_option': answer,
            'is_correct': ok,
            'explanation': explain,
        })
    return {
        'lesson_id': lesson_id,
        'attempt_no': 1,
        'score': round(correct * 10 / len(QUESTIONS), 1),
        'correct_count': correct,
        'total': len(QUESTIONS),
        'submitted_at': NOW,
        'review': review,
    }


def _quiz_stats(lesson_id: int) -> dict:
    """schema QuizStats"""
    course_id, order = LESSON_INDEX[lesson_id]
    # Phân bố lựa chọn mẫu của 12 lượt nộp, câu 4 là câu nhiều người sai nhất
    distribution = [
        [('A', 9), ('B', 1), ('C', 1), ('D', 1)],
        [('A', 2), ('B', 8), ('C', 1), ('D', 1)],
        [('A', 1), ('B', 1), ('C', 10), ('D', 0)],
        [('A', 5), ('B', 2), ('C', 1), ('D', 4)],
        [('A', 1), ('B', 10), ('C', 0), ('D', 1)],
    ]
    questions = []
    for i, (text, _options, answer, _explain) in enumerate(QUESTIONS):
        counts = distribution[i]
        total = sum(c for _k, c in counts)
        right = next(c for k, c in counts if k == answer)
        questions.append({
            'question_id': i + 1,
            'text': text,
            'wrong_rate': round((total - right) / total, 2) if total else 0.0,
            'answer_counts': [{'key': k, 'count': c} for k, c in counts],
        })
    return {
        'lesson_id': lesson_id,
        'lesson_title': LESSON_TITLES[course_id][order - 1],
        'submission_count': 12,
        'average_score': 7.8,
        'questions': questions,
    }


def _announcement(aid: int, course_id: str, title: str, body: str,
                  *, read: bool) -> dict:
    """schema Announcement"""
    return {
        'id': aid,
        'course_id': course_id,
        'course_title': COURSES[course_id]['title'],
        'title': title,
        'body': body,
        'author_name': TEACHER['name'],
        'created_at': NOW if aid == 1 else EARLIER,
        'read': read,
        'read_at': EARLIER if read else None,
    }


ANNOUNCEMENTS = [
    _announcement(1, 'python', 'Hạn nộp dự án cuối khóa',
                  'Các em nộp dự án trước 23:59 ngày 20/08. Nộp muộn trừ 10%.',
                  read=False),
    _announcement(2, 'db_design', 'Bổ sung tài liệu chuẩn hóa',
                  'Thầy đã thêm ví dụ phân rã BCNF vào bài 4, các em xem lại nhé.',
                  read=True),
]


def _certificate(course_id: str) -> dict:
    """schema Certificate — không chứa email/điểm/tiến độ (route 22 công khai)."""
    code = 'PE-2026-7QK4-9ZR1' if course_id == 'python' else 'PE-2026-3MTX-8BW2'
    return {
        'code': code,
        'course_id': course_id,
        'course_title': COURSES[course_id]['title'],
        'student_name': STUDENT['name'],
        'issued_at': NOW,
        'verify_url': f'http://localhost:3000/certificates/{code}',
    }


def _session() -> dict:
    """schema Session"""
    return {
        'access': 'mock.access.token',
        'refresh': 'mock.refresh.token',
        'user': STUDENT,
    }


# ── Tiện ích chung cho view ──────────────────────────────────────────────

def mock_view(fn):
    """Gộp decorator lặp lại: không xác thực, không phân quyền, không throttle."""
    return api_view(['GET', 'POST', 'PUT', 'DELETE'])(
        authentication_classes([])(
            permission_classes([AllowAny])(
                throttle_classes([])(fn))))


def forced_error(request):
    """`?mock_error=<mã>` → trả nhánh lỗi theo schema Error, để test client."""
    raw = request.GET.get('mock_error')
    if not raw:
        return None
    try:
        status = int(raw)
    except ValueError:
        return None
    if status not in MSG:
        return None
    extra = {'lessons_remaining': 2} if status == 409 else {}
    return Response(_error(status, **extra), status=status)


def _known_course(course_id: str):
    return None if course_id in COURSES else Response(_error(404), status=404)


def _known_lesson(lesson_id: int):
    return None if lesson_id in LESSON_INDEX else Response(_error(404), status=404)


# ── 23 route ─────────────────────────────────────────────────────────────

# 1 · POST /auth/register → Session
@mock_view
def register(request):
    return forced_error(request) or Response(_session(), status=201)


# 2 · POST /auth/login → Session
@mock_view
def login(request):
    return forced_error(request) or Response(_session(), status=200)


# 3 · POST /auth/refresh → Session
@mock_view
def refresh(request):
    return forced_error(request) or Response(_session(), status=200)


# 4 · POST /auth/logout → 204
@mock_view
def logout(request):
    return forced_error(request) or Response(status=204)


# 5 · GET/PUT /api/user → User
@mock_view
def user(request):
    err = forced_error(request)
    if err:
        return err
    if request.method == 'PUT':
        updated = dict(STUDENT)
        updated['name'] = request.data.get('name', STUDENT['name'])
        updated['avatar_url'] = request.data.get('avatar_url')
        return Response(updated, status=200)
    return Response(STUDENT, status=200)


# 6 · PUT /api/user/password → 204
@mock_view
def user_password(request):
    return forced_error(request) or Response(status=204)


# 7 · GET /api/courses → Course[]
@mock_view
def courses(request):
    err = forced_error(request)
    if err:
        return err
    # Công khai: chưa đăng nhập thì progress = null. Mock coi như đã đăng nhập
    # khi có header Authorization, để frontend thử được cả hai nhánh.
    signed_in = bool(request.headers.get('Authorization'))
    return Response(
        [_course(cid, with_progress=signed_in) for cid in COURSES], status=200)


# 8 · GET /api/courses/<id> → Course
@mock_view
def course_detail(request, course_id):
    err = forced_error(request) or _known_course(course_id)
    if err:
        return err
    signed_in = bool(request.headers.get('Authorization'))
    return Response(_course(course_id, with_progress=signed_in), status=200)


# 9 · POST /api/courses/<id>/enroll → Course
@mock_view
def enroll(request, course_id):
    err = forced_error(request) or _known_course(course_id)
    if err:
        return err
    return Response(_course(course_id, with_progress=True), status=201)


# 10 · GET /api/me/courses → Course[]
@mock_view
def my_courses(request):
    err = forced_error(request)
    if err:
        return err
    return Response(
        [_course(cid, with_progress=True) for cid in COURSES], status=200)


# 11 · GET/POST /api/courses/<id>/lessons → Lesson[] / Lesson
@mock_view
def course_lessons(request, course_id):
    err = forced_error(request) or _known_course(course_id)
    if err:
        return err
    ids = [lid for lid, (cid, _o) in LESSON_INDEX.items() if cid == course_id]
    if request.method == 'POST':
        created = _lesson(ids[-1], with_content=True, completed=None)
        created['id'] = max(LESSON_INDEX) + 1
        created['order'] = len(ids) + 1
        created['title'] = request.data.get('title', 'Bài giảng mới')
        created['content'] = request.data.get('content', '')
        created['completed'] = False
        return Response(created, status=201)
    # Mục lục: content = null, đã sắp theo order
    return Response([_lesson(lid, with_content=False) for lid in sorted(ids)],
                    status=200)


# 12 · GET/PUT/DELETE /api/lessons/<id> → Lesson / 204
@mock_view
def lesson_detail(request, lesson_id):
    err = forced_error(request) or _known_lesson(lesson_id)
    if err:
        return err
    if request.method == 'DELETE':
        return Response(status=204)
    item = _lesson(lesson_id, with_content=True)
    if request.method == 'PUT':
        item['title'] = request.data.get('title', item['title'])
        item['content'] = request.data.get('content', item['content'])
        item['published'] = request.data.get('published', True)
        item['updated_at'] = NOW
    return Response(item, status=200)


# 13 · POST /api/lessons/<id>/complete → Progress
@mock_view
def lesson_complete(request, lesson_id):
    err = forced_error(request) or _known_lesson(lesson_id)
    if err:
        return err
    course_id, order = LESSON_INDEX[lesson_id]
    meta = COURSES[course_id]
    done = max(COMPLETED[course_id], order)
    return Response(
        _progress(course_id, meta['title'], done, meta['lesson_count'],
                  cert=done >= meta['lesson_count']),
        status=200)


# 14 · GET /api/lessons/<id>/quiz → Quiz
@mock_view
def lesson_quiz(request, lesson_id):
    err = forced_error(request) or _known_lesson(lesson_id)
    return err or Response(_quiz(lesson_id), status=200)


# 15 · POST /api/lessons/<id>/quiz/submit → QuizResult
@mock_view
def lesson_quiz_submit(request, lesson_id):
    err = forced_error(request) or _known_lesson(lesson_id)
    return err or Response(_quiz_result(lesson_id), status=200)


# 16 · GET /api/lessons/<id>/quiz/stats → QuizStats
@mock_view
def lesson_quiz_stats(request, lesson_id):
    err = forced_error(request) or _known_lesson(lesson_id)
    return err or Response(_quiz_stats(lesson_id), status=200)


# 17 · GET /api/me/progress → Progress[]
@mock_view
def my_progress(request):
    err = forced_error(request)
    if err:
        return err
    return Response([_progress_for(cid) for cid in COURSES], status=200)


# 18 · GET /api/courses/<id>/comparison → Comparison
@mock_view
def course_comparison(request, course_id):
    err = forced_error(request) or _known_course(course_id)
    if err:
        return err
    # python: lớp 12 người → có số liệu. db_design: lớp 3 người → bị ẩn.
    # Hai khóa cố tình khác nhau để frontend dựng được CẢ HAI nhánh giao diện.
    small = course_id == 'db_design'
    class_size = 3 if small else 12
    return Response({
        'course_id': course_id,
        'mine': _progress_for(course_id),
        'class_size': class_size,
        'suppressed': small,
        'reason': 'class_too_small' if small else None,
        'class_average': None if small else 52.4,
        'my_percentile': None if small else 78.0,
    }, status=200)


# 19 · GET/POST /api/announcements → Announcement[] / Announcement
@mock_view
def announcements(request):
    err = forced_error(request)
    if err:
        return err
    if request.method == 'POST':
        course_id = request.data.get('course_id', 'python')
        if course_id not in COURSES:
            return Response(_error(404), status=404)
        return Response(
            _announcement(max(a['id'] for a in ANNOUNCEMENTS) + 1, course_id,
                          request.data.get('title', ''),
                          request.data.get('body', ''), read=False),
            status=201)
    return Response(ANNOUNCEMENTS, status=200)


# 20 · POST /api/announcements/<id>/read → 204
@mock_view
def announcement_read(request, announcement_id):
    err = forced_error(request)
    if err:
        return err
    if announcement_id not in [a['id'] for a in ANNOUNCEMENTS]:
        return Response(_error(404), status=404)
    return Response(status=204)


# 21 · POST /api/courses/<id>/certificate → Certificate | 409
@mock_view
def issue_certificate(request, course_id):
    err = forced_error(request) or _known_course(course_id)
    if err:
        return err
    meta = COURSES[course_id]
    remaining = meta['lesson_count'] - COMPLETED[course_id]
    if remaining > 0:
        # Nhánh 409 CÓ số bài còn thiếu — sheet route 21 yêu cầu đúng chỗ này
        return Response(
            _error(409, 'Chưa hoàn thành đủ bài học để nhận chứng nhận',
                   lessons_remaining=remaining),
            status=409)
    return Response(_certificate(course_id), status=201)


# 22 · GET /api/certificates/<code> → Certificate (CÔNG KHAI)
@mock_view
def verify_certificate(request, code):
    err = forced_error(request)
    if err:
        return err
    for cid in COURSES:
        if _certificate(cid)['code'] == code:
            return Response(_certificate(cid), status=200)
    # Mã sai và mã đã thu hồi đều 404 — tránh dò mã hợp lệ
    return Response(_error(404), status=404)


# 23 · GET /api/courses/<id>/roster → Roster
@mock_view
def course_roster(request, course_id):
    err = forced_error(request) or _known_course(course_id)
    if err:
        return err
    meta = COURSES[course_id]
    students = []
    for i, person in enumerate([STUDENT] + CLASSMATES):
        done = max(meta['lesson_count'] - i, 0)
        students.append({
            'student': person,
            'progress': _progress(
                course_id, meta['title'], done, meta['lesson_count'],
                quiz_score=None if done == 0 else round(9.0 - i * 0.7, 1),
                last_active=None if done == 0 else (NOW if i == 0 else EARLIER),
                cert=done >= meta['lesson_count'],
            ),
        })
    return Response({
        'course_id': course_id,
        'course_title': meta['title'],
        'total': len(students),
        'students': students,
    }, status=200)


# ── Hợp đồng: phục vụ chính openapi.yaml ─────────────────────────────────

def openapi_schema(_request):
    """
    Trả nguyên văn backend/openapi.yaml.

    KHÔNG dùng schema do drf-spectacular tự sinh từ view: view mock không có
    serializer nên schema sinh ra sẽ rỗng. openapi.yaml viết tay là nguồn sự
    thật DUY NHẤT; drf-spectacular ở đây chỉ đóng vai trò giao diện Swagger UI
    đọc chính file này (config/urls.py).
    """
    from pathlib import Path
    from django.conf import settings

    text = (Path(settings.BASE_DIR) / 'openapi.yaml').read_text(encoding='utf-8')
    return HttpResponse(text, content_type='application/vnd.oai.openapi; charset=utf-8')


# ── urlconf ──────────────────────────────────────────────────────────────
# Thứ tự khai báo: route CỤ THỂ trước route có tham số nuốt rộng hơn.
# `<str:course_id>` không khớp dấu '/' nên /api/courses/x/enroll không bị
# /api/courses/<str:course_id> nuốt — nhưng vẫn để đúng thứ tự cho dễ đọc.

urlpatterns = [
    # Tài khoản
    path('auth/register', register, name='mock-register'),                          # 1
    path('auth/login', login, name='mock-login'),                                   # 2
    path('auth/refresh', refresh, name='mock-refresh'),                             # 3
    path('auth/logout', logout, name='mock-logout'),                                # 4
    path('api/user', user, name='mock-user'),                                       # 5
    path('api/user/password', user_password, name='mock-user-password'),            # 6

    # Khóa học
    path('api/courses', courses, name='mock-courses'),                              # 7
    path('api/me/courses', my_courses, name='mock-my-courses'),                     # 10
    path('api/me/progress', my_progress, name='mock-my-progress'),                  # 17
    path('api/courses/<str:course_id>/enroll', enroll, name='mock-enroll'),         # 9
    path('api/courses/<str:course_id>/lessons', course_lessons,
         name='mock-course-lessons'),                                               # 11
    path('api/courses/<str:course_id>/comparison', course_comparison,
         name='mock-comparison'),                                                   # 18
    path('api/courses/<str:course_id>/certificate', issue_certificate,
         name='mock-certificate'),                                                  # 21
    path('api/courses/<str:course_id>/roster', course_roster, name='mock-roster'),  # 23
    path('api/courses/<str:course_id>', course_detail, name='mock-course'),         # 8

    # Bài giảng + trắc nghiệm
    path('api/lessons/<int:lesson_id>/complete', lesson_complete,
         name='mock-lesson-complete'),                                              # 13
    path('api/lessons/<int:lesson_id>/quiz/submit', lesson_quiz_submit,
         name='mock-quiz-submit'),                                                  # 15
    path('api/lessons/<int:lesson_id>/quiz/stats', lesson_quiz_stats,
         name='mock-quiz-stats'),                                                   # 16
    path('api/lessons/<int:lesson_id>/quiz', lesson_quiz, name='mock-quiz'),        # 14
    path('api/lessons/<int:lesson_id>', lesson_detail, name='mock-lesson'),         # 12

    # Thông báo
    path('api/announcements', announcements, name='mock-announcements'),            # 19
    path('api/announcements/<int:announcement_id>/read', announcement_read,
         name='mock-announcement-read'),                                            # 20

    # Chứng nhận (công khai)
    path('api/certificates/<str:code>', verify_certificate,
         name='mock-verify-certificate'),                                           # 22
]
