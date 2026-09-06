from django.conf import settings
from dj_rest_auth.serializers import (
    PasswordResetSerializer as DjRestAuthPasswordResetSerializer,
    PasswordResetConfirmSerializer as DjRestAuthPasswordResetConfirmSerializer,
)
from allauth.account import app_settings as allauth_account_settings
from allauth.account.adapter import get_adapter
from allauth.account.forms import ResetPasswordForm as DefaultPasswordResetForm
from allauth.account.forms import default_token_generator
from allauth.account.utils import (
    filter_users_by_email,
    user_pk_to_url_str,
    user_username,
)

from ..models import User


def default_url_generator(request, user, temp_key):
    """Generate the frontend password-reset-confirm URL with uuid and token."""
    base = getattr(settings, "FRONTEND_BASE_URL_NORMALIZED", settings.FRONTEND_BASE_URL.rstrip("/"))
    return f"{base}/password-reset-confirm/?uuid={user_pk_to_url_str(user)}&token={temp_key}"


class CustomAllAuthPasswordResetForm(DefaultPasswordResetForm):
    def clean_email(self):
        """
        Invalid email should not raise error, as this would leak users
        for unit test: test_password_reset_with_invalid_email
        """
        email = self.cleaned_data["email"]
        email = get_adapter().clean_email(email)
        self.users = filter_users_by_email(email, is_active=True)
        return self.cleaned_data["email"]

    def save(self, request, **kwargs):
        email = self.cleaned_data['email']
        token_generator = kwargs.get('token_generator', default_token_generator)

        for user in self.users:

            temp_key = token_generator.make_token(user)

            # save it to the password reset model
            # password_reset = PasswordReset(user=user, temp_key=temp_key)
            # password_reset.save()

            # send the password reset email
            url_generator = kwargs.get('url_generator', default_url_generator)
            url = url_generator(request, user, temp_key)
            uid = user_pk_to_url_str(user)


            context = {
                'user': user,
                'password_reset_url': url,
                'request': request,
                'token': temp_key,
                'uid': uid,
            }
            if (
                allauth_account_settings.AUTHENTICATION_METHOD != allauth_account_settings.AuthenticationMethod.EMAIL
            ):
                context['username'] = user_username(user)
            get_adapter(request).send_mail(
                'account/email/password_reset_key', email, context
            )
        return self.cleaned_data['email']


class PasswordResetSerializer(DjRestAuthPasswordResetSerializer):
    @property
    def password_reset_form_class(self):
        return CustomAllAuthPasswordResetForm

    def get_email_options(self):
        """Ensure our custom URL generator is used for the reset link."""
        return {"url_generator": default_url_generator}


class PasswordResetConfirmSerializer(DjRestAuthPasswordResetConfirmSerializer):
    """
    After a successful password reset, ensure the user is active so they can log in.
    Fixes the case where users get "account disabled" after resetting their password.
    """

    def save(self):
        result = super().save()
        # Ensure user can log in after reset (re-activate if they were disabled)
        if self.user and not self.user.is_active:
            User.objects.filter(pk=self.user.pk).update(is_active=True)
        return result
