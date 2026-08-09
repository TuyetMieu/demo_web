"""
Kiểm chứng hợp đồng: mọi phản hồi của máy chủ giả PHẢI khớp openapi.yaml.

Đây là thứ biến "hình dạng dữ liệu" từ lời hứa trong tài liệu thành ràng buộc
chạy được: test gọi thật cả 23 route qua Django test client, tra schema mà
openapi.yaml khai cho đúng (đường dẫn, method, mã trạng thái) rồi validate thân
phản hồi bằng jsonschema.

Vì sao validate được trực tiếp: openapi.yaml dùng OpenAPI **3.1** — bản này LÀ
JSON Schema 2020-12, không cần lớp dịch trung gian như 3.0 (`nullable`).

KHÔNG chạm DB: view mock không truy vấn gì, nên không có @pytest.mark.django_db.

Chạy:  python -m pytest common/tests.py -q
"""
from pathlib import Path

import jsonschema
import pytest
import yaml
from django.conf import settings
from django.test import override_settings
from rest_framework.test import APIClient

from common import mock

# urlconf riêng cho test — không phụ thuộc biến môi trường MOCK_API
urlpatterns = mock.urlpatterns

DOC = yaml.safe_load((Path(settings.BASE_DIR) / 'openapi.yaml').read_text(encoding='utf-8'))

# (method, mẫu đường dẫn trong openapi.yaml, URL thật, thân yêu cầu, mã mong đợi)
# Thứ tự = thứ tự route trong sheet "API".
CASES = [
    # 1
    ('post', '/auth/register', '/auth/register',
     {'name': 'Nguyễn Văn An', 'email': 'an.nv@sv.edu.vn', 'password': 'MatKhau123'}, 201),
    # 2
    ('post', '/auth/login', '/auth/login',
     {'email': 'an.nv@sv.edu.vn', 'password': 'MatKhau123'}, 200),
    # 3
    ('post', '/auth/refresh', '/auth/refresh', {'refresh': 'mock.refresh.token'}, 200),
    # 4
    ('post', '/auth/logout', '/auth/logout', {'refresh': 'mock.refresh.token'}, 204),
    # 5
    ('get', '/api/user', '/api/user', None, 200),
    ('put', '/api/user', '/api/user', {'name': 'An Nguyễn', 'avatar_url': None}, 200),
    # 6
    ('put', '/api/user/password', '/api/user/password',
     {'current_password': 'MatKhau123', 'new_password': 'MatKhauMoi123'}, 204),
    # 7
    ('get', '/api/courses', '/api/courses', None, 200),
    # 8
    ('get', '/api/courses/{courseId}', '/api/courses/python', None, 200),
    # 9
    ('post', '/api/courses/{courseId}/enroll', '/api/courses/python/enroll', None, 201),
    # 10
    ('get', '/api/me/courses', '/api/me/courses', None, 200),
    # 11
    ('get', '/api/courses/{courseId}/lessons', '/api/courses/python/lessons', None, 200),
    ('post', '/api/courses/{courseId}/lessons', '/api/courses/python/lessons',
     {'title': 'Bài mới', 'content': '# Nội dung'}, 201),
    # 12
    ('get', '/api/lessons/{lessonId}', '/api/lessons/3', None, 200),
    ('put', '/api/lessons/{lessonId}', '/api/lessons/3',
     {'title': 'Đã sửa', 'content': '# Nội dung mới'}, 200),
    ('delete', '/api/lessons/{lessonId}', '/api/lessons/3', None, 204),
    # 13
    ('post', '/api/lessons/{lessonId}/complete', '/api/lessons/3/complete', None, 200),
    # 14
    ('get', '/api/lessons/{lessonId}/quiz', '/api/lessons/3/quiz', None, 200),
    # 15
    ('post', '/api/lessons/{lessonId}/quiz/submit', '/api/lessons/3/quiz/submit',
     {'answers': [{'question_id': i, 'selected': 'A'} for i in range(1, 6)]}, 200),
    # 16
    ('get', '/api/lessons/{lessonId}/quiz/stats', '/api/lessons/3/quiz/stats', None, 200),
    # 17
    ('get', '/api/me/progress', '/api/me/progress', None, 200),
    # 18 — python: lớp 12 người (có số liệu)
    ('get', '/api/courses/{courseId}/comparison', '/api/courses/python/comparison', None, 200),
    # 19
    ('get', '/api/announcements', '/api/announcements', None, 200),
    ('post', '/api/announcements', '/api/announcements',
     {'course_id': 'python', 'title': 'Thông báo', 'body': 'Nội dung'}, 201),
    # 20
    ('post', '/api/announcements/{announcementId}/read', '/api/announcements/1/read', None, 204),
    # 21 — db_design đã học đủ 5/5 bài nên cấp được
    ('post', '/api/courses/{courseId}/certificate',
     '/api/courses/db_design/certificate', None, 201),
    # 22
    ('get', '/api/certificates/{code}', '/api/certificates/PE-2026-3MTX-8BW2', None, 200),
    # 23
    ('get', '/api/courses/{courseId}/roster', '/api/courses/python/roster', None, 200),
]


def schema_for(path_tpl: str, method: str, status: int):
    """Tra schema openapi.yaml khai cho (đường dẫn, method, mã). None nếu 204."""
    op = DOC['paths'][path_tpl][method]
    response = op['responses'][str(status)]
    if 'content' not in response:
        return None
    return response['content']['application/json']['schema']


def validate(instance, subschema):
    """
    Validate theo subschema, kèm `components` để `$ref` nội tài liệu phân giải được.

    `$ref: '#/components/schemas/X'` phân giải tương đối với GỐC của schema đang
    validate — nên phải nhét nguyên khối `components` vào cùng object.
    """
    jsonschema.validate(
        instance,
        {
            '$schema': 'https://json-schema.org/draft/2020-12/schema',
            **subschema,
            'components': DOC['components'],
        },
    )


@pytest.fixture
def client():
    return APIClient()


@override_settings(ROOT_URLCONF=__name__)
@pytest.mark.parametrize('method,path_tpl,url,body,expected', CASES,
                         ids=[f'{m.upper()} {p}' for m, p, _u, _b, _e in CASES])
def test_mock_khop_openapi(client, method, path_tpl, url, body, expected):
    """Mỗi operation: gọi thật → đúng mã trạng thái → thân khớp schema đã khai."""
    kwargs = {'format': 'json'} if body is not None else {}
    response = getattr(client, method)(url, body, **kwargs)

    assert response.status_code == expected, (
        f'{method.upper()} {url} trả {response.status_code}, '
        f'openapi.yaml khai {expected}. Thân: {getattr(response, "data", None)!r}')

    subschema = schema_for(path_tpl, method, expected)
    if subschema is None:
        assert response.status_code == 204
        assert not response.content, '204 không được có thân phản hồi'
        return

    validate(response.json(), subschema)


@override_settings(ROOT_URLCONF=__name__)
def test_nhanh_loi_khop_schema_error(client):
    """Mọi mã lỗi của mọi route dùng CHUNG một schema Error."""
    error_schema = {'$ref': '#/components/schemas/Error'}
    for status in (400, 401, 403, 404, 409, 422, 429, 500):
        response = client.get(f'/api/courses/python?mock_error={status}')
        assert response.status_code == status
        validate(response.json(), error_schema)


@override_settings(ROOT_URLCONF=__name__)
def test_409_chung_nhan_kem_so_bai_con_thieu(client):
    """
    Route 21 · yêu cầu riêng của sheet: chưa đủ điều kiện thì 409 phải CHỞ THEO
    số bài còn thiếu ở trường có kiểu rõ ràng — client không phải bóc chuỗi.
    Khóa python trong dữ liệu mẫu mới học 3/5 bài.
    """
    response = client.post('/api/courses/python/certificate')
    assert response.status_code == 409
    body = response.json()
    validate(body, {'$ref': '#/components/schemas/Error'})
    assert body['error']['lessons_remaining'] == 2


@override_settings(ROOT_URLCONF=__name__)
def test_18_lop_duoi_5_nguoi_thi_an_trung_binh(client):
    """
    Route 18 · yêu cầu riêng của sheet: lớp dưới 5 người thì KHÔNG trả trung bình.
    Vẫn 200 (thiếu mẫu so sánh không phải lỗi client), nhưng bị ẩn.
    Khóa db_design trong dữ liệu mẫu chỉ có 3 người.
    """
    body = client.get('/api/courses/db_design/comparison').json()
    validate(body, {'$ref': '#/components/schemas/Comparison'})
    assert body['class_size'] < 5
    assert body['suppressed'] is True
    assert body['reason'] == 'class_too_small'
    assert body['class_average'] is None
    assert body['my_percentile'] is None


@override_settings(ROOT_URLCONF=__name__)
def test_14_de_trac_nghiem_khong_lo_dap_an(client):
    """
    Route 14 · yêu cầu riêng của sheet: đề KHÔNG kèm đáp án.
    Schema Quiz đã đóng `additionalProperties`, nhưng kiểm thêm bằng cách quét
    chuỗi thô — nếu ai đó nới schema thì test này vẫn chặn.
    """
    response = client.get('/api/lessons/3/quiz')
    validate(response.json(), {'$ref': '#/components/schemas/Quiz'})
    raw = response.content.decode()
    for leaked in ('correct_option', 'correct', 'answer', 'is_correct', 'explanation'):
        assert leaked not in raw, f'Đề trắc nghiệm lộ trường "{leaked}"'

    # Ngược lại: sau khi nộp thì ĐƯỢC phép có đáp án
    submitted = client.post(
        '/api/lessons/3/quiz/submit',
        {'answers': [{'question_id': i, 'selected': 'A'} for i in range(1, 6)]},
        format='json')
    assert 'correct_option' in submitted.content.decode()


def test_du_23_route_khong_thieu_route_nao():
    """openapi.yaml phải có ĐÚNG 23 đường dẫn, và test phải phủ hết."""
    paths = set(DOC['paths'])
    assert len(paths) == 23, f'openapi.yaml có {len(paths)} đường dẫn, sheet API có 23'

    covered = {path_tpl for _m, path_tpl, _u, _b, _e in CASES}
    assert paths == covered, f'Đường dẫn chưa được test: {sorted(paths - covered)}'


def test_moi_operation_deu_duoc_test():
    """Không sót method nào (route 5/11/12/19 có nhiều method)."""
    declared = {
        (path_tpl, method)
        for path_tpl, item in DOC['paths'].items()
        for method in item
        if method in ('get', 'post', 'put', 'delete', 'patch')
    }
    covered = {(path_tpl, method) for method, path_tpl, _u, _b, _e in CASES}
    assert declared == covered, f'Operation chưa được test: {sorted(declared - covered)}'
    assert len(declared) == 28, f'Có {len(declared)} operation, mong đợi 28'


def test_moi_route_tro_toi_dung_mot_schema():
    """
    Ràng buộc của đề: mỗi route trỏ tới ĐÚNG MỘT schema, không có trường tự do.
    Kiểm 3 điều với mọi phản hồi 2xx:
      1. thân phản hồi là `$ref` tới components/schemas, hoặc mảng của một `$ref`;
      2. mọi schema trong components đóng `additionalProperties: false`;
      3. mọi trường khai trong `properties` đều nằm trong `required`.
    """
    for path_tpl, item in DOC['paths'].items():
        for method, op in item.items():
            if method not in ('get', 'post', 'put', 'delete', 'patch'):
                continue
            for status, response in op['responses'].items():
                if not status.startswith('2') or 'content' not in response:
                    continue
                schema = response['content']['application/json']['schema']
                where = f'{method.upper()} {path_tpl} → {status}'
                if 'type' in schema and schema['type'] == 'array':
                    assert '$ref' in schema['items'], f'{where}: items phải là $ref'
                else:
                    assert '$ref' in schema, f'{where}: phải trỏ tới một schema dùng $ref'

    def kiem_tra_dong(name, schema, duong_dan=''):
        if not isinstance(schema, dict):
            return
        if schema.get('type') == 'object' or 'properties' in schema:
            vi_tri = f'{name}{duong_dan}'
            assert schema.get('additionalProperties') is False, \
                f'{vi_tri}: thiếu additionalProperties: false → còn trường tự do'
            # Luật "mọi trường luôn có mặt" chỉ áp cho PHẢN HỒI. Thân yêu cầu
            # (*Input) được phép có trường tùy chọn — client bỏ qua thì máy chủ
            # điền mặc định (vd LessonInput.order → đẩy xuống cuối mục lục).
            if not name.endswith('Input'):
                props = set(schema.get('properties', {}))
                required = set(schema.get('required', []))
                assert props == required, (
                    f'{vi_tri}: trường không bắt buộc {sorted(props - required)} — '
                    'hợp đồng yêu cầu mọi trường luôn có mặt (dùng null nếu trống)')
        for key in ('properties', 'items', 'oneOf', 'anyOf', 'allOf'):
            child = schema.get(key)
            if isinstance(child, dict):
                for prop_name, sub in child.items():
                    kiem_tra_dong(name, sub, f'{duong_dan}.{prop_name}')
            elif isinstance(child, list):
                for i, sub in enumerate(child):
                    kiem_tra_dong(name, sub, f'{duong_dan}[{i}]')

    for name, schema in DOC['components']['schemas'].items():
        kiem_tra_dong(name, schema)


def test_dung_9_thuc_the():
    """9 thực thể + 4 khung (Session, Comparison, Roster, Error) + 1 input."""
    thuc_the = {'User', 'Course', 'Lesson', 'Quiz', 'QuizResult', 'QuizStats',
                'Progress', 'Announcement', 'Certificate'}
    khung = {'Session', 'Comparison', 'Roster', 'Error'}
    dau_vao = {'LessonInput'}

    khai_bao = set(DOC['components']['schemas'])
    assert len(thuc_the) == 9
    assert khai_bao == thuc_the | khung | dau_vao, (
        f'Thừa: {sorted(khai_bao - (thuc_the | khung | dau_vao))} · '
        f'Thiếu: {sorted((thuc_the | khung | dau_vao) - khai_bao)}')
