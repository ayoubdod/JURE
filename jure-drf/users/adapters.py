from allauth.account import app_settings
from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings

from users.models import User


class CustomAccountAdapter(DefaultAccountAdapter):

    def get_email_confirmation_url(self, request, emailconfirmation):
        """Constructs the email confirmation (activation) url.

        Note that if you have architected your system such that email
        confirmations are sent outside of the request context `request`
        can be `None` here.
        """
        from allauth.account.internal import flows

        return flows.email_verification.get_email_verification_url(
            request, emailconfirmation
        )

    def set_phone(self, user, phone: str, verified: bool):
        user.phone = phone
    
    def get_phone(self, user):
        return user.phone
    
    def set_phone_verified(self, user, phone: str):
        return False
    
    def get_user_by_phone(self, phone: str):
        return User.objects.get(phone=phone)
        
    # def get_frontend_url(self, request, urlname, **kwargs):
    #     return "https://www.google.com"
    #     # return flows.email_verification.get_email_verification_url(
    #     #     request, emailconfirmation
    #     # )
    
    def send_confirmation_mail(self, request, emailconfirmation, signup):
        ctx = {
            "user": emailconfirmation.email_address.user,
        }
        if app_settings.EMAIL_VERIFICATION_BY_CODE_ENABLED:
            ctx.update({"code": emailconfirmation.key})
        else:
            ctx.update(
                {
                    "key": emailconfirmation.key,
                    "activate_url": f"{settings.FRONTEND_BASE_URL}/verify-email/?token={emailconfirmation.key}",
                    # "activate_url": self.get_email_confirmation_url(
                    #     request, emailconfirmation
                    # ),
                }
            )

        if signup:
            email_template = "account/email/email_confirmation_signup"
        else:
            email_template = "account/email/email_confirmation"
        self.send_mail(email_template, emailconfirmation.email_address.email, ctx)
    
    def send_mail(self, template_prefix: str, email: str, context: dict) -> None:
        # Get request from context if available
        request = context.get('request')
        ctx = {
            "request": request,
            "email": email,
            # "current_site": get_current_site(request),
            "current_site": {
                'name': settings.COMPANY_NAME,
                'domain': settings.FRONTEND_BASE_URL.split('//')[1],
            },
        }
        ctx.update(context)
        msg = self.render_mail(template_prefix, email, ctx)
        msg.send()

    def save_user(self, request, user, form, commit=True):
        """
        Saves a new `User` instance using information provided in the
        signup form.
        """
        from allauth.account.utils import user_email, user_field, user_username

        data = form.cleaned_data
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = data.get("email")
        username = data.get("username")
        user_email(user, email)
        user_username(user, username)
        if first_name:
            user_field(user, "first_name", first_name)
        if last_name:
            user_field(user, "last_name", last_name)
        if "password1" in data:
            user.set_password(data["password1"])
        elif "password" in data:
            user.set_password(data["password"])
        else:
            user.set_unusable_password()
        self.populate_username(request, user)
        if commit:
            user.save()
        # if form._has_phone_field:
        #     phone = form.cleaned_data.get("phone")
        #     if phone:
        #         self.set_phone(user, phone, False)
        return user
