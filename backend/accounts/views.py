"""
Port routes/auth.py + routes/user.py (Flask) — giữ nguyên body/status từng response.
Khác biệt DUY NHẤT (có chủ đích, MIGRATION_NOTES §Auth): login/register trả thêm
cặp JWT access/refresh thay vì set session cookie (frontend ở domain khác).
"""
import json
from datetime import datetime

from django.db import transaction
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.hashers import check_werkzeug_password, make_werkzeug_password
from accounts.validators import (validate_email_field, validate_name_field,
                                 validate_password_field, validate_phone_field)
from common.db import q, q1, x
from common.throttling import LoginThrottle, RegisterThrottle


def _tokens_for(user_id):
    """Cấp cặp JWT cho user id (SimpleJWT)."""
    from accounts.models import User
    refresh = RefreshToken.for_user(User(id=user_id))
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


# ─────────────────────────── /auth/* ───────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]   # 5 per minute (Flask @limiter.limit)

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        identifier = (data.get('email') or data.get('phone') or '').strip()
        password = data.get('password', '')
        errors = {}
        if not identifier:
            errors['email'] = 'Email hoặc số điện thoại không được để trống'
        elif '@' in identifier:
            if err := validate_email_field(identifier):
                errors['email'] = err
        else:
            if err := validate_phone_field(identifier):
                errors['email'] = err
        if not password:
            errors['password'] = 'Mật khẩu không được để trống'
        if errors:
            return Response({'errors': errors}, status=400)

        if '@' in identifier:
            user = q1('SELECT * FROM users WHERE email=%s', (identifier,))
        else:
            user = q1('SELECT * FROM users WHERE phone=%s', (identifier,))
        if not user:
            return Response({'error': 'Email/số điện thoại hoặc mật khẩu không đúng'}, status=401)

        stored = user['password']
        if not stored:
            return Response({'error': 'Email/số điện thoại hoặc mật khẩu không đúng'}, status=401)
        is_hashed = stored.startswith(('pbkdf2:', 'scrypt:'))
        if is_hashed:
            ok = check_werkzeug_password(stored, password)
        else:
            # Legacy plaintext (nếu còn sót): so trực tiếp rồi nâng cấp lên hash
            ok = (stored == password)
            if ok:
                x('UPDATE users SET password=%s WHERE id=%s',
                  (make_werkzeug_password(password), user['id']))

        if not ok:
            return Response({'error': 'Email/số điện thoại hoặc mật khẩu không đúng'}, status=401)
        needs_questionnaire = not bool(user['questionnaire_completed'])
        return Response({
            'ok': True,
            'name': user['name'],
            'needs_questionnaire': needs_questionnaire,
            **_tokens_for(user['id']),
        })


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterThrottle]   # 3 per minute

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip()
        phone = (data.get('phone') or '').strip()
        password = data.get('password', '')

        errors = {}
        if err := validate_name_field(name):
            errors['name'] = err
        if not email and not phone:
            msg = 'Vui lòng nhập email hoặc số điện thoại'
            errors['email'] = msg
            errors['phone'] = msg
        else:
            if email:
                if err := validate_email_field(email):
                    errors['email'] = err
            if phone:
                if err := validate_phone_field(phone):
                    errors['phone'] = err
        if err := validate_password_field(password):
            errors['password'] = err
        if errors:
            return Response({'errors': errors}, status=400)

        if email and q1('SELECT id FROM users WHERE email=%s', (email,)):
            return Response({'errors': {'email': 'Email đã được sử dụng'}}, status=400)
        if phone and q1('SELECT id FROM users WHERE phone=%s', (phone,)):
            return Response({'errors': {'phone': 'Số điện thoại đã được sử dụng'}}, status=400)

        try:
            user = q1(
                'INSERT INTO users (name, email, phone, password, role) '
                'VALUES (%s, %s, %s, %s, %s) RETURNING id, questionnaire_completed',
                (name, email if email else None, phone if phone else None,
                 make_werkzeug_password(password), 'Học viên'))
        except Exception as e:
            return Response({'error': f'Lỗi hệ thống khi đăng ký: {str(e)}'}, status=500)

        needs_questionnaire = not bool(user['questionnaire_completed'])
        return Response({'ok': True, 'needs_questionnaire': needs_questionnaire,
                         **_tokens_for(user['id'])})


class LogoutView(APIView):
    """GET /auth/logout — bản JWT: blacklist refresh token nếu client gửi kèm.

    Flask cũ clear session rồi redirect '/'; với JWT client tự xoá token là chính,
    endpoint này để thu hồi refresh token (POST body {'refresh': ...} tùy chọn).
    """
    permission_classes = [AllowAny]

    def _logout(self, request):
        token = None
        if isinstance(request.data, dict):
            token = request.data.get('refresh')
        if token:
            try:
                RefreshToken(token).blacklist()
            except Exception:
                pass
        return Response({'ok': True})

    def get(self, request):
        return self._logout(request)

    def post(self, request):
        return self._logout(request)


# ─────────────────────────── /api/user ───────────────────────────

class UserView(APIView):
    def get(self, request):
        user = q1('SELECT * FROM users WHERE id=%s', (request.user.id,))
        if not user:
            return Response({}, status=404)
        user['is_new_user'] = not bool(user.get('questionnaire_completed'))
        user['first_login'] = user['is_new_user']
        user.pop('password', None)  # không trả hash ra ngoài (bản Flask trả cả hash — vá có chủ đích, ghi MIGRATION_NOTES)
        return Response(user)

    def put(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip()
        phone = (data.get('phone') or '').strip()
        birthday = (data.get('birthday') or '').strip()

        errors = {}
        if err := validate_name_field(name):
            errors['name'] = err
        if err := validate_email_field(email):
            errors['email'] = err
        if err := validate_phone_field(phone):
            errors['phone'] = err
        if errors:
            return Response({'errors': errors}, status=400)

        # Trùng email/phone của người khác → 400 như /auth/register (tránh 500 do
        # IntegrityError khi vi phạm UNIQUE constraint users.email). Loại trừ chính mình.
        uid = request.user.id
        if email and q1('SELECT id FROM users WHERE email=%s AND id<>%s', (email, uid)):
            return Response({'errors': {'email': 'Email đã được sử dụng'}}, status=400)
        if phone and q1('SELECT id FROM users WHERE phone=%s AND id<>%s', (phone, uid)):
            return Response({'errors': {'phone': 'Số điện thoại đã được sử dụng'}}, status=400)

        x('UPDATE users SET name=%s, email=%s, phone=%s, birthday=%s WHERE id=%s',
          (name, email, phone, birthday, uid))
        return Response({'ok': True})


class PasswordView(APIView):
    def put(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        current = data.get('current', '')
        new_pw = data.get('new', '')
        errors = {}
        if err := validate_password_field(new_pw, label='Mật khẩu mới'):
            errors['new'] = err
        if errors:
            return Response({'errors': errors}, status=400)
        user = q1('SELECT password FROM users WHERE id=%s', (request.user.id,))
        stored = user['password'] if user else None
        if not stored:
            return Response({'error': 'Mật khẩu hiện tại không đúng'}, status=401)
        is_hashed = stored.startswith(('pbkdf2:', 'scrypt:'))
        pw_ok = check_werkzeug_password(stored, current) if is_hashed else (stored == current)
        if not pw_ok:
            return Response({'error': 'Mật khẩu hiện tại không đúng'}, status=401)
        x('UPDATE users SET password=%s WHERE id=%s',
          (make_werkzeug_password(new_pw), request.user.id))
        return Response({'ok': True})


# ─────────────── Follow (nguồn thật cho leaderboard "friends") ───────────────

class FollowView(APIView):
    def post(self, request, user_id):
        uid = request.user.id
        if user_id == uid:
            return Response({'error': 'Không thể tự follow chính mình'}, status=400)
        target = q1('SELECT id FROM users WHERE id=%s', (user_id,))
        if not target:
            return Response({'error': 'Không tìm thấy người dùng'}, status=404)
        x('INSERT INTO user_follows (follower_id, followee_id) '
          'VALUES (%s, %s) ON CONFLICT DO NOTHING', (uid, user_id))
        return Response({'ok': True, 'following': True})

    def delete(self, request, user_id):
        x('DELETE FROM user_follows WHERE follower_id=%s AND followee_id=%s',
          (request.user.id, user_id))
        return Response({'ok': True, 'following': False})


class FollowingView(APIView):
    def get(self, request, user_id):
        rows = q('''SELECT u.id, u.name, u.xp, u.streak, f.created_at
                    FROM user_follows f
                    JOIN users u ON u.id = f.followee_id
                    WHERE f.follower_id = %s
                    ORDER BY f.created_at DESC''', (user_id,))
        result = []
        for d in rows:
            created_at = d.pop('created_at')
            d['followedAt'] = created_at.isoformat() if created_at else None
            result.append(d)
        return Response({'following': result})


# ─────────────────────────── /api/survey ───────────────────────────

# Engine sinh lộ trình cá nhân: LẮP RÁP các chặng từ khóa học thật trên
# nền tảng theo câu trả lời khảo sát (không copy template tĩnh nữa):
#   1. Hướng đi           ← career_target > domain > language
#   2. Ngôn ngữ xương sống ← language đã biết (ưu tiên) / mặc định theo hướng
#   3. Bỏ chặng đã biết    ← skill_detail
#   4. Nhịp học            ← time (bài/tuần) → ước tính số tuần từng chặng

_COURSE_META = {
    'htmlcss':      {'title': 'HTML / CSS — Nền tảng Web', 'lessons': 70},
    'python':       {'title': 'Python — Đa năng & AI', 'lessons': 120},
    'java':         {'title': 'Java — Backend & Enterprise', 'lessons': 110},
    'cpp':          {'title': 'C / C++ — Lập trình hệ thống', 'lessons': 85},
    'db_design':    {'title': 'Thiết kế CSDL — dự án GameHub', 'lessons': 20},
    'db_design_tc': {'title': 'SQL nâng cao, Dữ liệu lớn & Hiệu năng', 'lessons': 21},
    'db_design_nc': {'title': 'Bên trong Database Engine', 'lessons': 25},
}

_DIRECTION_META = {
    'frontend':  ('Lộ trình Frontend Developer', '💻', '#4A9EE0'),
    'backend':   ('Lộ trình Backend Developer', '⚙️', '#E84545'),
    'fullstack': ('Lộ trình Fullstack Developer', '🧩', '#8B5CF6'),
    'data_ai':   ('Lộ trình Data & AI', '🤖', '#10B981'),
    'mobile':    ('Lộ trình Mobile Developer', '📱', '#3B82F6'),
    'devops':    ('Lộ trình DevOps', '☁️', '#06B6D4'),
    'systems':   ('Lộ trình Lập trình Hệ thống', '🖥️', '#F59E0B'),
}

_SOON = ('Khóa học riêng cho phần này đang được xây dựng trên nền tảng — '
         'drawer chặng có gợi ý tài nguyên tự học trong lúc chờ.')


def _survey_direction(data):
    """Suy hướng đi từ khảo sát: career_target rõ nhất, rồi domain, rồi ngôn ngữ đã biết."""
    career = (data.get('career_target') or '').lower()
    domain = (data.get('domain') or '').lower()
    langs = (data.get('language') or '').lower()

    if 'frontend' in career:
        return 'frontend'
    if 'fullstack' in career:
        return 'fullstack'
    if 'backend' in career:
        return 'backend'
    if 'data' in career or 'ai' in career or 'ml' in career:
        return 'data_ai'
    if 'mobile' in career:
        return 'mobile'
    if 'devops' in career or 'sre' in career:
        return 'devops'

    if 'ai' in domain or 'machine learning' in domain or 'data' in domain:
        return 'data_ai'
    if 'embedded' in domain or 'iot' in domain or 'game' in domain or 'security' in domain:
        return 'systems'
    if 'cloud' in domain or 'devops' in domain:
        return 'devops'
    if 'mobile' in domain:
        return 'mobile'
    if 'web' in domain:
        return 'fullstack'

    if 'python' in langs:
        return 'data_ai'
    if 'java' in langs:
        return 'backend'
    if 'c/c++' in langs or 'c++' in langs:
        return 'systems'
    if 'javascript' in langs:
        return 'frontend'

    return 'fullstack'


def _pick_roadmap_template(data):
    """Map hướng đi → id template cũ trong DB — chỉ còn phục vụ endpoint
    legacy GET /api/roadmaps (roadmap/views.py); việc sinh lộ trình cá nhân
    đã dùng _generate_user_roadmap tự lắp ráp, không đọc template nữa."""
    return {
        'frontend': 'frontend', 'fullstack': 'frontend',
        'backend': 'backend', 'devops': 'backend', 'mobile': 'backend',
        'data_ai': 'python', 'systems': 'cpp',
    }[_survey_direction(data)]


def _build_stages(direction, data):
    """Danh sách chặng [(lead, points, course_id, note)] cá nhân hóa theo khảo sát."""
    skills = (data.get('skill_detail') or '').lower()
    langs = (data.get('language') or '').lower()
    domain = (data.get('domain') or '').lower()
    goal = (data.get('goal') or '').lower()

    knows_html = 'html' in skills
    knows_js = 'javascript' in skills or 'framework fe' in skills
    knows_db = 'database' in skills
    knows_git = 'git' in skills
    knows_ops = 'docker' in skills

    # Ngôn ngữ xương sống cho backend/fullstack: ưu tiên ngôn ngữ user đã biết
    backbone = 'java' if 'java' in langs else 'python'

    st = []

    if direction == 'frontend':
        if not knows_html:
            st.append(('Nền tảng web với HTML & CSS', 'HTML & CSS',
                       ['Semantic HTML, Forms', 'Flexbox & CSS Grid', 'Responsive Design'], 'htmlcss', None))
        st.append(('Thổi hồn tương tác cho trang web', 'JavaScript',
                   ['DOM & Events', 'ES6+ và Modules', 'Fetch / Ajax gọi API'], None, _SOON))
        if not knows_git:
            st.append(('Quản lý mã nguồn & đưa sản phẩm lên mạng', 'Git & Deploy',
                       ['Git cơ bản, GitHub', 'Deploy tĩnh với Vercel / Netlify'], None, None))
        if not knows_db:
            st.append(('Frontend giỏi cần hiểu dữ liệu phía sau API', 'Hiểu dữ liệu & CSDL',
                       ['Mô hình quan hệ & ERD', 'SQL cơ bản', 'Cấu trúc dữ liệu trả về từ API'], 'db_design', None))
        st.append(('Đóng gói kỹ năng thành sản phẩm thật', 'Framework & Dự án',
                   ['React hoặc Vue', 'Portfolio cá nhân', 'SPA nhỏ có gọi API'], None, None))

    elif direction == 'backend':
        lang_title = 'Java Core' if backbone == 'java' else 'Python Backend'
        st.append(('Ngôn ngữ xương sống cho backend', lang_title,
                   ['Cú pháp & OOP', 'Collections / cấu trúc dữ liệu', 'Xử lý lỗi & IO'], backbone, None))
        if not knows_db:
            st.append(('Thiết kế nơi dữ liệu sống', 'Thiết kế CSDL',
                       ['ERD & mô hình hóa', 'Chuẩn hóa 1NF–3NF', 'Khóa & ràng buộc'], 'db_design', None))
        st.append(('Truy vấn như dân chuyên', 'SQL nâng cao & Hiệu năng',
                   ['JOIN & Subquery phức tạp', 'Window Functions, CTE', 'Index & tối ưu truy vấn'], 'db_design_tc', None))
        st.append(('Cửa ngõ giao tiếp của hệ thống', 'REST API & Xác thực',
                   ['RESTful conventions', 'Validation & error handling', 'JWT / Session'], None, _SOON))
        st.append(('Hiểu tận lõi database', 'Chuyên sâu Database Engine',
                   ['Transaction & ACID', 'Locking & MVCC', 'Backup & phục hồi'], 'db_design_nc', None))
        if not knows_ops:
            st.append(('Đưa hệ thống lên môi trường thật', 'Triển khai',
                       ['Docker cơ bản', 'CI / CD', 'Giám sát cơ bản'], None, None))

    elif direction == 'fullstack':
        if not knows_html:
            st.append(('Giao diện là điểm chạm đầu tiên', 'HTML & CSS',
                       ['Semantic HTML', 'Flexbox & Grid', 'Responsive'], 'htmlcss', None))
        if not knows_js:
            st.append(('Ngôn ngữ của trình duyệt', 'JavaScript',
                       ['DOM & Events', 'ES6+', 'Async / Await'], None, _SOON))
        lang_title = 'Backend với Java' if backbone == 'java' else 'Backend với Python'
        st.append(('Logic phía sau ứng dụng', lang_title,
                   ['Nền tảng ngôn ngữ', 'Framework web (Django / Spring)', 'REST API'], backbone, None))
        if not knows_db:
            st.append(('Nơi dữ liệu của app được lưu', 'Cơ sở dữ liệu',
                       ['Thiết kế schema', 'SQL', 'Kết nối app ↔ DB'], 'db_design', None))
        st.append(('Ghép hai nửa thành sản phẩm hoàn chỉnh', 'Ghép nối & Dự án Fullstack',
                   ['Fetch API + CORS', 'Auth đầu-cuối (JWT / Session)', 'Dự án web hoàn chỉnh'], None, None))

    elif direction == 'data_ai':
        st.append(('Ngôn ngữ số 1 cho dữ liệu & AI', 'Python',
                   ['Cú pháp & cấu trúc dữ liệu', 'OOP, module', 'Xử lý file & lỗi'], 'python', None))
        if not knows_db:
            st.append(('Dữ liệu thật luôn nằm trong CSDL', 'Thiết kế CSDL',
                       ['Mô hình quan hệ & ERD', 'SQL cơ bản', 'Kết nối Python ↔ DB'], 'db_design', None))
        st.append(('Truy vấn & xử lý dữ liệu lớn', 'SQL nâng cao & Dữ liệu lớn',
                   ['JOIN & Window Functions', 'CTE', 'Hiệu năng trên dữ liệu lớn'], 'db_design_tc', None))
        st.append(('Biến dữ liệu thô thành insight', 'Phân tích dữ liệu',
                   ['NumPy & Pandas', 'Trực quan hóa (Matplotlib)', 'EDA — khám phá dữ liệu'], None, _SOON))
        st.append(('Bước vào thế giới AI', 'Machine Learning',
                   ['Scikit-learn', 'Regression & Classification', 'Đánh giá & cải thiện mô hình'], None, _SOON))

    elif direction == 'mobile':
        st.append(('Java là nền của Android — điểm khởi đầu vững nhất', 'Java Core',
                   ['Cú pháp & OOP', 'Collections', 'Xử lý lỗi & IO'], 'java', None))
        if not knows_db:
            st.append(('App nào cũng cần lưu dữ liệu', 'Cơ sở dữ liệu',
                       ['Thiết kế schema', 'SQL cơ bản', 'Lưu trữ local vs server'], 'db_design', None))
        st.append(('Chọn công nghệ dựng app', 'Mobile Framework',
                   ['Kotlin + Jetpack Compose', 'Hoặc Flutter / React Native', 'Kiến trúc MVVM'], None, _SOON))
        st.append(('Sản phẩm chạy trên máy thật', 'Dự án ứng dụng',
                   ['App hoàn chỉnh có lưu dữ liệu', 'Kết nối API', 'Đóng gói & phát hành'], None, None))

    elif direction == 'devops':
        st.append(('Ngôn ngữ tự động hóa của DevOps', 'Python & Scripting',
                   ['Cú pháp Python', 'Viết script tự động hóa', 'Làm việc với file & process'], 'python', None))
        st.append(('Môi trường mọi server đang chạy', 'Linux & Mạng',
                   ['Terminal & shell', 'TCP/IP, DNS, SSH', 'Quản trị tiến trình'], None, _SOON))
        if not knows_db:
            st.append(('Vận hành tốt phải hiểu dữ liệu', 'Cơ sở dữ liệu',
                       ['Thiết kế schema', 'SQL cơ bản', 'Backup & phục hồi'], 'db_design', None))
        if not knows_ops:
            st.append(('Đóng gói & tự động hóa triển khai', 'Docker & CI/CD',
                       ['Docker image & container', 'GitHub Actions', 'Pipeline tự động'], None, _SOON))
        st.append(('Hạ tầng đám mây & vận hành', 'Cloud & Giám sát',
                   ['AWS / GCP cơ bản', 'Logging & monitoring', 'Xử lý sự cố'], None, None))

    else:  # systems — embedded / game / security / C++
        st.append(('Nền móng của lập trình hệ thống', 'C / C++',
                   ['Ngôn ngữ C & con trỏ', 'Cấu trúc dữ liệu tự xây', 'C++ OOP & STL'], 'cpp', None))
        st.append(('Tư duy giải quyết vấn đề', 'Giải thuật nâng cao',
                   ['Sắp xếp & tìm kiếm', 'Đệ quy & quay lui', 'Độ phức tạp Big-O'], None, None))
        if not knows_db:
            st.append(('Hệ thống nào cũng chạm tới dữ liệu', 'Cơ sở dữ liệu',
                       ['Mô hình quan hệ', 'SQL cơ bản', 'Lưu trữ & truy xuất'], 'db_design', None))
        if 'game' in domain:
            st.append(('Áp dụng C++ vào miền bạn chọn', 'Game Development',
                       ['Game engine (Unity / Unreal / Godot)', 'Game loop & vật lý', 'Dự án game nhỏ'], None, _SOON))
        elif 'security' in domain:
            st.append(('Áp dụng nền tảng vào miền bạn chọn', 'Bảo mật hệ thống',
                       ['Mạng & giao thức', 'Lỗ hổng bộ nhớ (buffer overflow)', 'Công cụ phân tích'], None, _SOON))
        else:
            st.append(('Áp dụng C/C++ vào miền bạn chọn', 'Nhúng & Hệ thống',
                       ['Lập trình nhúng / IoT', 'Hệ điều hành', 'Tối ưu hiệu năng'], None, _SOON))

    # Mục tiêu "Có việc làm" → chặng chuẩn bị đi làm cuối lộ trình
    if 'có việc làm' in goal:
        st.append(('Về đích: sẵn sàng ứng tuyển', 'Chuẩn bị đi làm',
                   ['CV & portfolio dự án', 'Luyện phỏng vấn kỹ thuật', 'Xây hồ sơ GitHub'], None, None))

    return st


def _generate_user_roadmap(uid, survey_id, data):
    """Sinh lộ trình cá nhân từ khảo sát (source='generated').
    Idempotent theo id 'u<uid>_generated' — nộp lại khảo sát là sinh lại."""
    direction = _survey_direction(data)
    title, icon, color = _DIRECTION_META[direction]

    time_s = data.get('time') or ''
    per_week = 5 if '< 5' in time_s else (15 if '> 10' in time_s else 10)
    is_newbie = 'chưa từng' in (data.get('experience') or '').lower()

    nodes = {}
    mermaid_lines = ['flowchart TD']
    stages = _build_stages(direction, data)
    first_course_seen = False
    for i, (lead, name, points, course_id, note) in enumerate(stages, 1):
        node_title = f'{i}. {name}'
        desc = f'<strong>{lead}:</strong><ul>' + ''.join(f'<li>{p}</li>' for p in points) + '</ul>'
        if course_id:
            meta = _COURSE_META[course_id]
            weeks = max(1, round(meta['lessons'] / per_week))
            desc += (f'<p>📚 Khóa <em>{meta["title"]}</em> — {meta["lessons"]} bài · '
                     f'≈ {weeks} tuần với nhịp {per_week} bài/tuần.</p>')
            if is_newbie and not first_course_seen:
                desc += '<p>🌱 Bạn bắt đầu từ số 0 — khóa này không yêu cầu kinh nghiệm, cứ đi tuần tự từng bài.</p>'
            first_course_seen = True
        if note:
            desc += f'<p>🚧 {note}</p>'
        nid = f'rm_{i}'
        nodes[nid] = {'title': node_title, 'desc': desc, 'course_id': course_id}
        safe_title = node_title.replace('"', "'")
        mermaid_lines.append(f'    {nid}["{safe_title}"]')
    for i in range(1, len(stages)):
        mermaid_lines.append(f'    rm_{i} --> rm_{i + 1}')

    rid = f'u{uid}_generated'
    x('''INSERT INTO roadmaps
             (id, user_id, source, generated_from_survey_id,
              title, icon, color, nodes_json, edges_json, mermaid_def, updated_at)
         VALUES (%s, %s, 'generated', %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, now())
         ON CONFLICT (id) DO UPDATE SET
             generated_from_survey_id = EXCLUDED.generated_from_survey_id,
             title       = EXCLUDED.title,
             icon        = EXCLUDED.icon,
             color       = EXCLUDED.color,
             nodes_json  = EXCLUDED.nodes_json,
             edges_json  = EXCLUDED.edges_json,
             mermaid_def = EXCLUDED.mermaid_def,
             updated_at  = now()''',
      (rid, uid, survey_id, title, icon, color,
       json.dumps(nodes, ensure_ascii=False), json.dumps([]),
       '\n'.join(mermaid_lines)))


class SurveyView(APIView):
    def post(self, request):
        data = request.data
        if not isinstance(data, dict):
            return Response({'error': 'Dữ liệu khảo sát không hợp lệ'}, status=400)
        uid = request.user.id
        with transaction.atomic():
            survey = q1(
                'INSERT INTO surveys (user_id, data_json, created_at) '
                'VALUES (%s,%s,%s) RETURNING id',
                (uid, json.dumps(data, ensure_ascii=False), datetime.utcnow().isoformat()))
            x('UPDATE users SET questionnaire_completed=1 WHERE id=%s', (uid,))
            _generate_user_roadmap(uid, survey['id'], data)
        return Response({'ok': True})
