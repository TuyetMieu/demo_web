"""
URL gốc — giữ NGUYÊN path/method của bản Flask (ràng buộc #2 MIGRATION_PLAN §1).
Mỗi app tự khai path đầy đủ (không prefix chung) vì path cũ không theo chuẩn
router lồng (vd /api/course/rating số ít, /api/courses-enrolled).
"""
from django.conf import settings
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularRedocView, SpectacularSwaggerView


def health(request):
    """Endpoint cho cron ping ngoài giữ Neon compute ấm (MIGRATION_NOTES §Neon)."""
    from django.db import connection
    with connection.cursor() as cur:
        cur.execute('SELECT 1')
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('health', health),
    path('', include('accounts.urls')),
    path('', include('courses.urls')),
    path('', include('lessons.urls')),
    path('', include('quizzes.urls')),
    path('', include('stats.urls')),
    path('', include('notifications.urls')),
    path('', include('roadmap.urls')),
    path('', include('leaderboard.urls')),
    path('', include('achievements.urls')),
    path('', include('forum.urls')),
    path('', include('courseadmin.urls')),
    path('accounts/', include('allauth.urls')),  # /accounts/google/login/ ...
]

# ── Tài liệu API ─────────────────────────────────────────────────────────
# /api/schema/ trả NGUYÊN VĂN backend/openapi.yaml (hợp đồng viết tay), không
# phải schema drf-spectacular tự sinh — hai trang UI dưới đây đọc file đó.
from common.mock import openapi_schema  # noqa: E402  (tránh vòng import khi khởi động)

urlpatterns += [
    path('api/schema/', openapi_schema, name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url='/api/schema/'), name='docs'),
    path('api/redoc/', SpectacularRedocView.as_view(url='/api/schema/'), name='redoc'),
]

# ── Máy chủ giả (MOCK_API=1) ─────────────────────────────────────────────
# Đặt TRƯỚC urlpatterns thật: Django khớp theo thứ tự nên 23 route giả che
# route thật cùng đường dẫn (/api/courses, /api/user, /auth/login...).
# Bỏ biến môi trường đi là mọi thứ trở lại nguyên trạng.
if settings.MOCK_API:
    from common import mock

    urlpatterns = mock.urlpatterns + urlpatterns

handler404 = 'common.errors.handler404'
handler500 = 'common.errors.handler500'
