"""Test cơ bản app roadmap (0-test ở bản Flask)."""
import pytest

pytestmark = pytest.mark.django_db


def test_list_templates_when_no_survey(auth_api):
    res = auth_api.get('/api/roadmaps')
    assert res.status_code == 200
    data = res.json()
    ids = [r['id'] for r in data]
    # 4 template seed, đúng thứ tự _TEMPLATE_ORDER
    assert ids[:4] == ['frontend', 'backend', 'python', 'cpp']
    assert 'nodes' in data[0] and 'edges' in data[0]


def test_update_item_requires_roadmap_id(auth_api):
    res = auth_api.put('/api/roadmap/rm_1', {'done': True}, format='json')
    assert res.status_code == 400


def test_progress_toggle_flow(auth_api):
    r1 = auth_api.put('/api/roadmap/rm_1', {'done': True, 'roadmap_id': 'frontend'}, format='json')
    assert r1.status_code == 200
    done = auth_api.get('/api/roadmap?roadmap_id=frontend').json()['doneItems']
    assert 'rm_1' in done
    auth_api.put('/api/roadmap/rm_1', {'done': False, 'roadmap_id': 'frontend'}, format='json')
    done2 = auth_api.get('/api/roadmap?roadmap_id=frontend').json()['doneItems']
    assert 'rm_1' not in done2


def test_progress_on_catalog_slug_autocreates_roadmap_row(auth_api):
    """Slug catalogue tĩnh (ROADMAP_LIST frontend) chưa có row trong roadmaps —
    PUT phải tự tạo stub thay vì 500 vì vướng FK roadmap_progress→roadmaps."""
    r = auth_api.put('/api/roadmap/0-m', {'done': True, 'roadmap_id': 'frontend-web'}, format='json')
    assert r.status_code == 200
    done = auth_api.get('/api/roadmap?roadmap_id=frontend-web').json()['doneItems']
    assert '0-m' in done


def test_progress_rejects_invalid_slug(auth_api):
    r = auth_api.put('/api/roadmap/0-m', {'done': True, 'roadmap_id': 'DROP TABLE;'}, format='json')
    assert r.status_code == 400


def test_my_roadmap_save_and_get(auth_api):
    r = auth_api.post('/api/me/roadmap', {'mermaid_def': 'flowchart TD\n  a --> b'}, format='json')
    assert r.status_code == 200
    data = auth_api.get('/api/me/roadmap').json()
    assert 'a --> b' in data['mermaid_def']


def test_ai_roadmap_is_premium_402(auth_api):
    assert auth_api.post('/api/me/roadmap/ai').status_code == 402
