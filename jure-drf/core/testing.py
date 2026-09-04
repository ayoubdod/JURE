"""Shared test helpers. Import from tests; this module is not collected as tests.

API tests must mint JWTs the same way login does: SessionTokenObtainPairSerializer
embeds `sv` (session_version). `RefreshToken.for_user` omits that claim and the
API correctly returns 401 session_replaced.
"""

from __future__ import annotations

from itertools import count

from rest_framework.test import APIClient

from users.tokens import SessionTokenObtainPairSerializer

_phone_seq = count(1)


def unique_test_phone() -> str:
    return f"+336{next(_phone_seq):08d}"


def access_token_for(user) -> str:
    user.refresh_from_db(fields=["session_version"])
    token = SessionTokenObtainPairSerializer.get_token(user)
    return str(token.access_token)


def api_client_for(user) -> APIClient:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token_for(user)}")
    return client


def create_cabinet_owner(*, email: str, trade_name: str = "Cabinet", phone: str | None = None):
    """Owner + cabinet with RBAC role OWNER. Unique phone unless one is passed."""
    from django.contrib.auth import get_user_model

    from cabinets.models import Cabinet

    User = get_user_model()
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Test",
        last_name="Lawyer",
        phone=phone or unique_test_phone(),
        country="FR",
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=trade_name,
        business_address="Casablanca",
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = User.Role.OWNER
    user.save(update_fields=["cabinet", "is_cabinet_member", "role"])
    return user, cabinet
