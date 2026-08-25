"""Login view that enforces a single active session per account."""

from dj_rest_auth.app_settings import api_settings
from dj_rest_auth.models import get_token_model
from dj_rest_auth.utils import jwt_encode
from dj_rest_auth.views import LoginView as DjRestAuthLoginView

from .session import rotate_user_session


class SingleSessionLoginView(DjRestAuthLoginView):
    """
    On successful credential check, bump session_version and blacklist older
    refresh tokens *before* issuing the new JWT pair. Previous browsers and
    WebSockets are forced offline immediately.
    """

    def login(self):
        self.user = self.serializer.validated_data["user"]
        rotate_user_session(self.user)
        self.user.refresh_from_db(fields=["session_version"])
        # Keep the validated user object in sync for JWT claim generation.
        self.serializer.validated_data["user"] = self.user

        token_model = get_token_model()

        if api_settings.USE_JWT:
            self.access_token, self.refresh_token = jwt_encode(self.user)
        elif token_model:
            self.token = api_settings.TOKEN_CREATOR(token_model, self.user, self.serializer)

        if api_settings.SESSION_LOGIN:
            self.process_login()
