"""Test cơ bản app accounts (auth/user/follow — domain chưa từng có test ở bản Flask)."""
import pytest

from accounts.hashers import check_werkzeug_password, make_werkzeug_password
from common.db import q1, x

pytestmark = pytest.mark.django_db


def test_werkzeug_hasher_roundtrip():
    """Hasher tương thích werkzeug: hash mới verify được, sai mật khẩu fail."""
    h = make_werkzeug_password('SecretPass123')
    assert h.startswith('scrypt:')
    assert check_werkzeug_password(h, 'SecretPass123') is True
    assert check_werkzeug_password(h, 'WrongPass') is False


def test_register_then_login_happy_path(api):
    email = 'dj_reg_test@example.com'
    res = api.post('/auth/register', {
        'name': 'Reg Tester', 'email': email, 'password': 'SecretPass123',
    }, format='json')
    assert res.status_code == 200
    data = res.json()
    assert data['ok'] is True
    assert 'access' in data and 'refresh' in data  # JWT thêm vào (MIGRATION_NOTES §Auth)

    res2 = api.post('/auth/login', {'email': email, 'password': 'SecretPass123'}, format='json')
    assert res2.status_code == 200
    assert res2.json()['name'] == 'Reg Tester'

    res3 = api.post('/auth/login', {'email': email, 'password': 'WrongPass99'}, format='json')
    assert res3.status_code == 401


def test_register_validation_errors(api, db):
    res = api.post('/auth/register', {'name': '', 'email': 'bad', 'password': '1'}, format='json')
    assert res.status_code == 400
    errors = res.json()['errors']
    assert 'name' in errors and 'email' in errors and 'password' in errors


def test_login_empty_fields(api, db):
    res = api.post('/auth/login', {'email': '', 'password': ''}, format='json')
    assert res.status_code == 400
    assert 'errors' in res.json()


def test_get_user_requires_auth(api, db):
    res = api.get('/api/user')
    assert res.status_code == 401
    assert res.json() == {'error': 'Chưa đăng nhập'}  # body y hệt guard Flask


def test_get_user_no_password_leak(auth_api):
    data = auth_api.get('/api/user').json()
    assert 'password' not in data  # vá có chủ đích (MIGRATION_NOTES §Vá bảo mật)
    assert data['is_new_user'] is True


def test_follow_self_rejected(auth_api, temp_user):
    res = auth_api.post(f'/api/users/{temp_user}/follow')
    assert res.status_code == 400


def test_follow_unfollow_flow(auth_api):
    other = q1("INSERT INTO users (name, email, password) VALUES (%s,%s,%s) RETURNING id",
               ('Follow Target', 'dj_follow_target@example.com', 'x'))['id']
    res = auth_api.post(f'/api/users/{other}/follow')
    assert res.status_code == 200 and res.json()['following'] is True
    # idempotent
    assert auth_api.post(f'/api/users/{other}/follow').status_code == 200
    res2 = auth_api.delete(f'/api/users/{other}/follow')
    assert res2.json()['following'] is False


def test_survey_generates_roadmap(auth_api, temp_user):
    res = auth_api.post('/api/survey', {'career_target': 'Backend Developer'}, format='json')
    assert res.status_code == 200
    user = q1('SELECT questionnaire_completed FROM users WHERE id=%s', (temp_user,))
    assert user['questionnaire_completed'] == 1
    rm = q1('SELECT id, source FROM roadmaps WHERE id=%s', (f'u{temp_user}_generated',))
    assert rm is not None and rm['source'] == 'generated'


def _generated_roadmap(auth_api, temp_user, survey):
    """Nộp khảo sát rồi đọc lại lộ trình sinh ra qua API /api/me/roadmap."""
    res = auth_api.post('/api/survey', survey, format='json')
    assert res.status_code == 200
    data = auth_api.get('/api/me/roadmap').json()
    assert data['mermaid_def']
    return data


def test_roadmap_engine_backend_composition(auth_api, temp_user):
    """Hướng backend: xương sống Java (đã biết Java) + trọn chuỗi khóa CSDL."""
    data = _generated_roadmap(auth_api, temp_user, {
        'career_target': 'Backend Developer',
        'experience': 'Có (cơ bản)', 'language': 'Java',
        'time': '5–10h/tuần',
    })
    assert data['title'] == 'Lộ trình Backend Developer'
    course_ids = [n.get('course_id') for n in data['nodes'].values()]
    assert 'java' in course_ids
    assert 'db_design' in course_ids and 'db_design_tc' in course_ids and 'db_design_nc' in course_ids


def test_roadmap_engine_skips_known_skills(auth_api, temp_user):
    """Đã biết HTML/CSS + Database → lộ trình frontend bỏ 2 chặng đó."""
    data = _generated_roadmap(auth_api, temp_user, {
        'career_target': 'Frontend Developer',
        'experience': 'Có (trung cấp trở lên)', 'language': 'JavaScript',
        'skill_detail': 'HTML / CSS, Database (SQL, NoSQL)',
        'time': '> 10h/tuần',
    })
    course_ids = [n.get('course_id') for n in data['nodes'].values()]
    assert 'htmlcss' not in course_ids
    assert 'db_design' not in course_ids


def test_roadmap_engine_goal_job_adds_final_stage(auth_api, temp_user):
    """Mục tiêu 'Có việc làm' → chặng cuối là chuẩn bị đi làm."""
    data = _generated_roadmap(auth_api, temp_user, {
        'career_target': 'AI / ML Engineer', 'goal': 'Có việc làm',
        'experience': 'Chưa từng', 'time': '< 5h/tuần',
    })
    assert data['title'] == 'Lộ trình Data & AI'
    titles = [n['title'] for n in data['nodes'].values()]
    assert any('Chuẩn bị đi làm' in t for t in titles)
    # Người mới → chặng khóa học đầu tiên có ghi chú bắt đầu từ số 0
    descs = ' '.join(n['desc'] for n in data['nodes'].values())
    assert 'từ số 0' in descs


# ── memory-plan T4.2: đổi email trùng phải trả 400 (không phải 500 IntegrityError) ──
def test_update_profile_duplicate_email_returns_400(auth_api, temp_user):
    """users.email có UNIQUE constraint. Đổi email sang email người khác phải báo
    400 'Email đã được sử dụng' như /auth/register — hiện tại rơi vào 500 vì
    IntegrityError không được bắt trước."""
    taken = 'dj_taken_email@example.com'
    q1("INSERT INTO users (name, email, password) VALUES (%s,%s,%s) RETURNING id",
       ('Email Owner', taken, 'x'))
    res = auth_api.put('/api/user', {'name': 'Me', 'email': taken, 'phone': ''}, format='json')
    assert res.status_code == 400
    assert 'email' in res.json().get('errors', {})


def test_update_profile_same_email_ok(auth_api, temp_user):
    """Giữ nguyên email của chính mình (không đổi) phải OK — không tự coi là trùng."""
    x("UPDATE users SET email=%s WHERE id=%s", ('dj_self_email@example.com', temp_user))
    res = auth_api.put('/api/user',
                       {'name': 'Me', 'email': 'dj_self_email@example.com', 'phone': ''},
                       format='json')
    assert res.status_code == 200
