"""JWT claims that carry the user's current session_version."""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class SessionTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Embed `sv` (session_version) on both refresh and access tokens."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["sv"] = int(getattr(user, "session_version", 0) or 0)
        return token
