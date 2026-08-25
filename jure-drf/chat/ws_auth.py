# chat/ws_auth.py
from urllib.parse import parse_qs
from channels.auth import AuthMiddlewareStack
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.http import parse_cookie
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from users.session import session_version_matches

User = get_user_model()


def _jwt_from_cookies_scope(scope):
    """Read access JWT from Cookie header (runs before CookieMiddleware)."""
    for name, value in scope.get("headers", []):
        if name == b"cookie":
            cookies = parse_cookie(value.decode("latin1"))
            break
    else:
        return None
    try:
        from dj_rest_auth.app_settings import api_settings as dj_rest_settings

        cookie_name = dj_rest_settings.JWT_AUTH_COOKIE
        if cookie_name:
            t = cookies.get(cookie_name)
            if t:
                return t
    except ImportError:
        pass
    return cookies.get("access") or cookies.get("access_token")


class WebSocketAuthMiddleware(BaseMiddleware):
    """
    Accepts JWT in either:
      - query string: ?token=...
      - header: Authorization: Bearer <token>
      - Cookie header (dj-rest-auth access cookie or "access" / "access_token")
    Sets scope['user']. Rejects superseded single-session tokens.
    """
    async def __call__(self, scope, receive, send):
        user = AnonymousUser()

        # 1) Query string
        query = parse_qs(scope.get("query_string", b"").decode())
        token = (query.get("token", [None]) or [None])[0]

        # 2) Authorization header
        if not token:
            headers = dict(scope.get("headers", []))
            auth = headers.get(b"authorization", b"").decode()
            if auth.lower().startswith("bearer "):
                token = auth[7:]

        # 3) Cookies (browser WebSockets cannot set Authorization; query may be omitted)
        if not token:
            token = _jwt_from_cookies_scope(scope)

        if token:
            try:
                access = AccessToken(token)
                user_id = access.get("user_id")
                if user_id:
                    candidate = await self._get_user(user_id)
                    if (
                        candidate
                        and not isinstance(candidate, AnonymousUser)
                        and session_version_matches(candidate, access)
                    ):
                        user = candidate
            except (TokenError, KeyError):
                user = AnonymousUser()

        scope["user"] = user
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()


# --- Stack used by ASGI (keeps name compatible with your import) ---
def JwtAuthMiddlewareStack(inner):
    return WebSocketAuthMiddleware(AuthMiddlewareStack(inner))
