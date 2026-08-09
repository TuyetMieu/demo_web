"""Port routes/roadmap.py."""
import json
import re

from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.views import _pick_roadmap_template
from common.db import q, q1, x

_TEMPLATE_ORDER = """
    ORDER BY CASE id
        WHEN 'frontend' THEN 0
        WHEN 'backend'  THEN 1
        WHEN 'python'   THEN 2
        WHEN 'cpp'      THEN 3
        ELSE 4
    END"""


def _jsonb(v, default):
    """psycopg3 có thể trả JSONB là str — chuẩn hóa về dict/list như psycopg2 wrapper cũ."""
    if v is None:
        return default
    if isinstance(v, str):
        try:
            return json.loads(v)
        except ValueError:
            return default
    return v


class RoadmapsView(APIView):
    def get(self, request):
        """Lộ trình THỰC TẾ cho user theo khảo sát gần nhất; chưa khảo sát → tất cả template."""
        uid = request.user.id
        # PERF 2026-07-19: survey mới nhất lấy kèm trong CÙNG câu lệnh (2 query
        # → 1 round trip); template chỉ vài dòng nên lọc theo survey ở Python.
        rows = q("""SELECT id, title, icon, color, mermaid_def,
                           COALESCE(nodes_json, '{}'::jsonb) AS nodes_json,
                           COALESCE(edges_json, '[]'::jsonb) AS edges_json,
                           (SELECT data_json FROM surveys
                            WHERE user_id=%s ORDER BY id DESC LIMIT 1) AS _survey
                    FROM roadmaps WHERE user_id IS NULL""" + _TEMPLATE_ORDER,
                 (uid,))

        matched_id = None
        if rows and rows[0]['_survey']:
            data = _jsonb(rows[0]['_survey'], {})
            if isinstance(data, dict):
                matched_id = _pick_roadmap_template(data)
        if matched_id:
            rows = [r for r in rows if r['id'] == matched_id]

        result = []
        for item in rows:
            item.pop('_survey', None)
            item['nodes'] = _jsonb(item.pop('nodes_json'), {}) or {}
            item['edges'] = _jsonb(item.pop('edges_json'), []) or []
            result.append(item)
        return Response(result)


class RoadmapProgressView(APIView):
    def get(self, request):
        uid = request.user.id
        roadmap_id = request.query_params.get('roadmap_id')
        if roadmap_id:
            rows = q('SELECT item_id FROM roadmap_progress '
                     'WHERE user_id=%s AND roadmap_id=%s AND done=TRUE', (uid, roadmap_id))
        else:
            rows = q('SELECT item_id FROM roadmap_progress WHERE user_id=%s AND done=TRUE',
                     (uid,))
        return Response({'doneItems': [r['item_id'] for r in rows]})


class MyRoadmapView(APIView):
    def get(self, request):
        row = q1("SELECT mermaid_def, title, icon, color, "
                 "COALESCE(nodes_json, '{}'::jsonb) AS nodes_json, "
                 "COALESCE(edges_json, '[]'::jsonb) AS edges_json "
                 "FROM roadmaps "
                 "WHERE user_id=%s AND source IN ('generated','custom') "
                 "ORDER BY updated_at DESC LIMIT 1", (request.user.id,))
        if not row:
            return Response({'mermaid_def': '', 'nodes': {}, 'edges': []})
        return Response({
            'mermaid_def': row['mermaid_def'] or '',
            'title': row['title'],
            'icon': row['icon'],
            'color': row['color'],
            'nodes': _jsonb(row['nodes_json'], {}) or {},
            'edges': _jsonb(row['edges_json'], []) or [],
        })

    def post(self, request):
        uid = request.user.id
        body = request.data if isinstance(request.data, dict) else {}
        mdef = body.get('mermaid_def', '')
        rid = f'u{uid}_custom'
        x('''INSERT INTO roadmaps (id, user_id, source, mermaid_def, updated_at)
             VALUES (%s, %s, 'custom', %s, now())
             ON CONFLICT (id) DO UPDATE
                 SET mermaid_def = EXCLUDED.mermaid_def, updated_at = now()''',
          (rid, uid, mdef))
        return Response({'ok': True})


class AiRoadmapView(APIView):
    def post(self, request):
        return Response({'error': 'Premium',
                         'message': 'Tính năng này chỉ dành cho tài khoản Premium'}, status=402)


_SLUG_RE = re.compile(r'^[a-z0-9_-]{1,64}$')


class UpdateRoadmapItemView(APIView):
    def put(self, request, item_id):
        uid = request.user.id
        body = request.data if isinstance(request.data, dict) else {}
        done = bool(body.get('done', False))
        roadmap_id = body.get('roadmap_id')
        if not roadmap_id:
            return Response({'error': 'roadmap_id là bắt buộc'}, status=400)
        if not _SLUG_RE.match(roadmap_id):
            return Response({'error': 'roadmap_id không hợp lệ'}, status=400)
        # roadmap_progress.roadmap_id có FK tới roadmaps.id. Lộ trình catalogue
        # tĩnh (slug từ ROADMAP_LIST frontend, vd 'frontend-web') không có sẵn
        # row → tạo stub dùng chung (user_id NULL, source='catalog') khi cần.
        x('''INSERT INTO roadmaps (id, user_id, source, updated_at)
             VALUES (%s, NULL, 'catalog', now())
             ON CONFLICT (id) DO NOTHING''', (roadmap_id,))
        x('''INSERT INTO roadmap_progress (user_id, roadmap_id, item_id, done, completed_at)
             VALUES (%s,%s,%s,%s, CASE WHEN %s THEN now() END)
             ON CONFLICT (user_id, roadmap_id, item_id) DO UPDATE
                 SET done=EXCLUDED.done, completed_at=EXCLUDED.completed_at''',
          (uid, roadmap_id, item_id, done, done))
        return Response({'ok': True})
