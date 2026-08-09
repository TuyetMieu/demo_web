"""
OAuth Google/Facebook — port luồng nghiệp vụ routes/oauth.py (flask-dance)
sang django-allauth, giữ nguyên 3 bước:
  1. Đã có (oauth_provider, oauth_provider_id) → đăng nhập.
  2. Email trùng tài khoản thường (oauth_provider IS NULL) → tự động LIÊN KẾT.
  3. Chưa có → tạo user mới (name mặc định 'Người dùng').

Khác Flask (bắt buộc vì frontend khác domain — MIGRATION_NOTES §OAuth):
sau callback KHÔNG render/redirect trang Django mà cấp JWT rồi redirect về
`{FRONTEND_URL}/auth/callback#access=...&refresh=...` (dùng URL FRAGMENT thay
vì query string: fragment không bị gửi lên server/log trung gian).
"""
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework_simplejwt.tokens import RefreshToken

from common.db import q1, x


class LegacySocialAccountAdapter(DefaultSocialAccountAdapter):
    """Map user allauth ↔ bảng users legacy theo đúng logic _login_or_create cũ."""

    def pre_social_login(self, request, sociallogin):
        provider = sociallogin.account.provider          # 'google' | 'facebook'
        provider_id = str(sociallogin.account.uid)
        email = (sociallogin.user.email or '').strip() or None

        # 1. Đã có tài khoản OAuth này
        row = q1('SELECT id FROM users WHERE oauth_provider = %s AND oauth_provider_id = %s',
                 (provider, provider_id))
        if row:
            self._attach_existing(sociallogin, row['id'])
            return

        # 2. Email trùng tài khoản đăng ký thường → tự động liên kết OAuth
        if email:
            existing = q1('SELECT id, oauth_provider FROM users WHERE email = %s', (email,))
            if existing and existing['oauth_provider'] is None:
                x('UPDATE users SET oauth_provider=%s, oauth_provider_id=%s WHERE id=%s',
                  (provider, provider_id, existing['id']))
                self._attach_existing(sociallogin, existing['id'])
                return
        # 3. rơi xuống save_user → tạo user mới

    def _attach_existing(self, sociallogin, user_id):
        from accounts.models import User
        sociallogin.user = User.objects.get(id=user_id)

    def save_user(self, request, sociallogin, form=None):
        provider = sociallogin.account.provider
        provider_id = str(sociallogin.account.uid)
        email = (sociallogin.user.email or '').strip() or None
        data = sociallogin.account.extra_data or {}
        name = data.get('name') or 'Người dùng'
        row = q1('INSERT INTO users (name, email, oauth_provider, oauth_provider_id) '
                 'VALUES (%s, %s, %s, %s) RETURNING id',
                 (name, email, provider, provider_id))
        from accounts.models import User
        user = User.objects.get(id=row['id'])
        sociallogin.user = user
        return user


def oauth_complete(request):
    """LOGIN_REDIRECT_URL của allauth: cấp JWT rồi bàn giao về frontend tĩnh."""
    if not request.user.is_authenticated:
        return HttpResponseRedirect(f'{settings.FRONTEND_URL}/login?error=oauth_failed')
    refresh = RefreshToken.for_user(request.user)
    # Fragment (#) thay vì query (?): token không lọt vào access log/Referer
    return HttpResponseRedirect(
        f'{settings.FRONTEND_URL}/auth/callback'
        f'#access={refresh.access_token}&refresh={refresh}'
    )
