from django.conf import settings
from django.utils.translation import gettext_lazy as _
from dj_rest_auth.serializers import LoginSerializer
from rest_framework import exceptions, serializers


class CustomLoginSerializer(LoginSerializer):
    username = None
    email = serializers.CharField(required=False, allow_blank=True)

    def get_auth_user(self, username=None, email=None, password=None):
        """
        Override to use our custom authentication backend properly.
        """
        from django.contrib.auth import authenticate
        
        # Use email as identifier (can be email or phone)
        identifier = email or username
        
        if not identifier or not password:
            return None
        
        # Authenticate using our custom backend
        user = authenticate(
            request=self.context.get('request'),
            username=identifier,
            email=identifier,
            password=password
        )
        
        return user

    def validate(self, attrs):
        username = attrs.get('username')
        # email here is email or phone
        email = attrs.get('email')
        password = attrs.get('password')
        
        # Try to get authenticated user
        user = self.get_auth_user(username, email, password)

        if not user:
            msg = _('Unable to log in with provided credentials.')
            raise exceptions.ValidationError(msg)

        # Did we get back an active user?
        self.validate_auth_user_status(user)

        # Normalize identifier for comparison
        identifier = (email or username or '').strip()
        identifier_lower = identifier.lower()
        
        # Normalize user data
        user_email_normalized = user.email.lower() if user.email else ''
        user_phone_str = str(user.phone) if user.phone else ''
        
        # Determine if user logged in with email or phone
        logged_in_with_email = False
        logged_in_with_phone = False
        
        # Check if identifier matches user's email (case-insensitive)
        if identifier_lower and user_email_normalized and user_email_normalized == identifier_lower:
            logged_in_with_email = True
        
        # Check if identifier matches user's phone
        if identifier and user_phone_str and user_phone_str == identifier:
            logged_in_with_phone = True
        
        # If identifier contains @, assume it's an email attempt
        if '@' in identifier and not logged_in_with_email and not logged_in_with_phone:
            # Try to match as email (might have whitespace or case differences)
            if user_email_normalized == identifier_lower:
                logged_in_with_email = True
        
        # Validate based on login method
        if logged_in_with_email:
            # User logged in with email - check email verification
            if 'dj_rest_auth.registration' in settings.INSTALLED_APPS:
                self.validate_email_verification_status(user, email=email)
        elif logged_in_with_phone:
            # User logged in with phone - check phone verification
            self.validate_phone_verification_status(user, phone=email)
        else:
            # If we can't determine the login method but user was authenticated,
            # check email verification if identifier looks like email
            if '@' in identifier and 'dj_rest_auth.registration' in settings.INSTALLED_APPS:
                self.validate_email_verification_status(user, email=email)

        attrs['user'] = user
        return attrs

    @staticmethod
    def validate_email_verification_status(user, email=None):
        from allauth.account import app_settings as allauth_account_settings
        if (
            allauth_account_settings.EMAIL_VERIFICATION == allauth_account_settings.EmailVerificationMethod.MANDATORY and not user.emailaddress_set.filter(email=user.email, verified=True).exists()
        ):
            raise serializers.ValidationError(_('E-mail is not verified.'))
    

    @staticmethod
    def validate_phone_verification_status(user, phone=None):
        # from allauth.account import app_settings as allauth_account_settings
        # if (
        #     allauth_account_settings.EMAIL_VERIFICATION == allauth_account_settings.EmailVerificationMethod.MANDATORY and not user.emailaddress_set.filter(email=user.email, verified=True).exists()
        # ):
        if not user.phone_verified:
            raise serializers.ValidationError(_('Phone is not verified.'))
