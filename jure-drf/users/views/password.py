from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..models import PasswordSetupToken, User


@api_view(["POST"])
@permission_classes([AllowAny])
def setup_password_by_token(request):
    """
    Set password for a team member using their one-time invitation token.
    Body: { "token": "<token>", "password": "<new_password>" }
    Used by the frontend at /setup-password?token=...
    """
    token_value = (request.data.get("token") or "").strip()
    password = request.data.get("password")

    if not token_value:
        return Response({"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not password:
        return Response({"detail": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        record = PasswordSetupToken.objects.get(token=token_value)
    except PasswordSetupToken.DoesNotExist:
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

    if not record.is_valid:
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

    user = record.user

    # Save password directly via QuerySet.update to avoid custom save() side effects
    User.objects.filter(pk=user.pk).update(password=make_password(password))

    # Ensure email is verified so login works (ACCOUNT_EMAIL_VERIFICATION = mandatory)
    from allauth.account.models import EmailAddress
    email_address, _ = EmailAddress.objects.get_or_create(
        user=user,
        email=user.email,
        defaults={"verified": True, "primary": True},
    )
    if not email_address.verified:
        email_address.verified = True
        email_address.primary = True
        email_address.save(update_fields=["verified", "primary"])

    record.used_at = timezone.now()
    record.save(update_fields=["used_at"])

    return Response({"detail": "Password set successfully. You can now sign in."}, status=status.HTTP_200_OK)

