from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import UserDetailsSerializer, LoginSerializer
from dj_rest_auth.serializers import (
    PasswordResetSerializer as DjRestAuthPasswordResetSerializer,
    PasswordResetConfirmSerializer as DjRestAuthPasswordResetConfirmSerializer,
)
from rest_framework import serializers
from phonenumber_field.serializerfields import PhoneNumberField
from commons.models import Activity, Function
from cabinets.models import Cabinet
from .models import User, UserAttachment, UserAddress
from django_countries.serializer_fields import CountryField
from django.core.exceptions import ValidationError as DjangoValidationError
from django_countries.fields import Country
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.forms import SetPasswordForm, PasswordResetForm
from django.urls import exceptions as url_exceptions
from django.utils.encoding import force_str
from django.utils.translation import gettext_lazy as _
from rest_framework import exceptions, serializers
from rest_framework.exceptions import ValidationError
from django.conf import settings
from django.urls import reverse

from allauth.account import app_settings as allauth_account_settings
from allauth.account.adapter import get_adapter
from allauth.account.forms import ResetPasswordForm as DefaultPasswordResetForm
from allauth.account.forms import default_token_generator
from allauth.account.utils import (
    filter_users_by_email,
    user_pk_to_url_str,
    user_username,
)
from allauth.utils import build_absolute_uri


try:
    from allauth.account.adapter import get_adapter
    from allauth.account.utils import setup_user_email
except ImportError:
    raise ImportError('allauth needs to be added to INSTALLED_APPS.')

UserModel = User


def _cabinet_for_user(obj):
    cabinet = None
    if hasattr(obj, 'get_owned_cabinet_or_none'):
        cabinet = obj.get_owned_cabinet_or_none()
    if not cabinet:
        cabinet = getattr(obj, 'cabinet', None)
    return cabinet


class CabinetLogoField(serializers.ImageField):
    """ImageField that reads from cabinet.logo and writes to cabinet.logo."""

    def get_attribute(self, obj):
        cabinet = _cabinet_for_user(obj)
        if cabinet:
            return getattr(cabinet, 'logo', None)
        return None


class CabinetAttrField(serializers.Field):
    """Writable field that reads/writes an attribute on the user's cabinet."""

    def __init__(self, cabinet_attr, child, **kwargs):
        self.cabinet_attr = cabinet_attr
        self.child = child
        kwargs.setdefault('required', False)
        kwargs.setdefault('allow_null', True)
        super().__init__(**kwargs)

    def get_attribute(self, instance):
        cabinet = _cabinet_for_user(instance)
        if cabinet is None:
            return None
        return getattr(cabinet, self.cabinet_attr, None)

    def to_representation(self, value):
        return self.child.to_representation(value) if value is not None else None

    def to_internal_value(self, data):
        return self.child.run_validation(data)


class UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        fields = ['id', 'address', 'osm_id', 'type', 'is_default']


class CustomUserDetailsSerializer(UserDetailsSerializer):
    default_address = UserAddressSerializer(read_only=True)
    trade_name = CabinetAttrField('trade_name', serializers.CharField(allow_blank=True, max_length=255))
    logo = CabinetLogoField(required=False, allow_null=True)
    structure_type = CabinetAttrField(
        'structure_type', serializers.CharField(allow_blank=True, allow_null=True, max_length=100)
    )
    business_address = CabinetAttrField(
        'business_address', serializers.CharField(allow_blank=True, max_length=255)
    )
    team_size = CabinetAttrField('team_size', serializers.IntegerField(min_value=1))
    website = CabinetAttrField(
        'website', serializers.URLField(allow_blank=True, allow_null=True)
    )

    class Meta:
        extra_fields = []
        model = UserModel
        fields = [
            'id',
            'email',
            'phone',
            'first_name',
            'last_name',
            'bio',
            'default_address',
            'image',
            'affiliation_code',
            'trade_name',
            'logo',
            'structure_type',
            'business_address',
            'team_size',
            'website',
            'accept_terms',
            'accept_data_processing',
        ]
        read_only_fields = ('email',)

    def to_representation(self, instance):
        """Build absolute URL for logo in response."""
        data = super().to_representation(instance)
        logo = data.get('logo')
        if logo and not str(logo).startswith('http'):
            request = self.context.get('request') if hasattr(self, 'context') else None
            if request:
                data['logo'] = request.build_absolute_uri(logo)
        return data

    def update(self, instance, validated_data):
        """Update user and sync cabinet fields (logo, etc.) to the cabinet."""
        cabinet = _cabinet_for_user(instance)
        cabinet_fields = ['logo', 'trade_name', 'structure_type', 'business_address', 'team_size', 'website']
        cabinet_data = {}
        for field in cabinet_fields:
            if field in validated_data:
                cabinet_data[field] = validated_data.pop(field)

        if cabinet and cabinet_data and cabinet.owner_id == instance.id:
            for key, value in cabinet_data.items():
                setattr(cabinet, key, value)
            cabinet.save(update_fields=list(cabinet_data.keys()))

        return super().update(instance, validated_data)


class CustomRegisterSerializer(RegisterSerializer):
    username = None

    # Required personal fields
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    country = CountryField(required=True,country_dict=True)
    phone = PhoneNumberField(required=True)
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    # Required business fields
    trade_name = serializers.CharField(required=True)
    structure_type = serializers.CharField(required=True)
    business_address = serializers.CharField(required=True)
    team_size = serializers.IntegerField(required=True, min_value=1)

    # Optional business fields
    website = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    logo = serializers.ImageField(required=False, allow_null=True)

    # Required consent fields
    accept_terms = serializers.BooleanField(required=True)
    accept_data_processing = serializers.BooleanField(required=True)

    

    # Optional affiliation
    affiliator = serializers.SlugRelatedField(
        queryset=User.objects.all(),
        slug_field='affiliation_code',
        required=False,
        allow_null=True
    )

    _has_phone_field = True
    
    def validate_phone(self, value):
        # check if phone unique
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError(
                'A user with this phone number already exists.'
            )
        return value
    
    def validate_email(self, value):
        # Normalize email to lowercase and check if email unique (case-insensitive)
        if value:
            value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                'A user with this email already exists.'
            )
        return value
    
    def validate_accept_terms(self, value):
        """Ensure terms are accepted before account creation."""
        if not value:
            raise serializers.ValidationError(
                'You must accept the terms and conditions to create an account.'
            )
        return value
    
    def validate_accept_data_processing(self, value):
        """Ensure data processing consent is given before account creation."""
        if not value:
            raise serializers.ValidationError(
                'You must accept data processing consent to create an account.'
            )
        return value

    def get_cleaned_data(self):
        return {
            'password1': self.validated_data.get('password1', ''),
            'email': self.validated_data.get('email', ''),
            'phone': self.validated_data.get('phone', ''),
            'first_name': self.validated_data.get('first_name', ''),
            'last_name': self.validated_data.get('last_name', ''),
            'country': self.validated_data.get('country', ''),
            'affiliator': self.validated_data.get('affiliator', None),
            'trade_name': self.validated_data.get('trade_name', ''),
            'structure_type': self.validated_data.get('structure_type', ''),
            'business_address': self.validated_data.get('business_address', ''),
            'team_size': self.validated_data.get('team_size', None),
            'website': self.validated_data.get('website', None),
            'logo': self.validated_data.get('logo', None),
            'accept_terms': self.validated_data.get('accept_terms', False),
            'accept_data_processing': self.validated_data.get('accept_data_processing', False),
        }
    
    def save(self, request):
        adapter = get_adapter()
        user = adapter.new_user(request)
        self.cleaned_data = self.get_cleaned_data()
        user : User = adapter.save_user(request, user, self, commit=False)
        
        # Validate and set password
        if "password1" in self.cleaned_data:
            try:
                adapter.clean_password(self.cleaned_data['password1'], user=user)
                user.set_password(self.cleaned_data['password1'])
            except DjangoValidationError as exc:
                raise serializers.ValidationError(
                    detail=serializers.as_serializer_error(exc)
                )

        self.cleaned_data.pop('password1')
        affiliator = self.cleaned_data.pop('affiliator', None)

        # Extract business fields for cabinet creation
        trade_name = self.cleaned_data.pop('trade_name', None)
        structure_type = self.cleaned_data.pop('structure_type', None)
        business_address = self.cleaned_data.pop('business_address', None)
        team_size = self.cleaned_data.pop('team_size', None)
        website = self.cleaned_data.pop('website', None)
        logo = self.cleaned_data.pop('logo', None)
        
        # Ensure required fields are provided and not empty
        if not trade_name or (isinstance(trade_name, str) and not trade_name.strip()):
            raise serializers.ValidationError({'trade_name': 'Trade name is required.'})
        if not structure_type or (isinstance(structure_type, str) and not structure_type.strip()):
            raise serializers.ValidationError({'structure_type': 'Structure type is required.'})
        if not business_address or (isinstance(business_address, str) and not business_address.strip()):
            raise serializers.ValidationError({'business_address': 'Business address is required.'})
        if not team_size or team_size < 1:
            raise serializers.ValidationError({'team_size': 'Team size must be at least 1.'})

        # Set affiliation if provided
        if affiliator:
            user.affiliated_by = affiliator

        # Set user fields from cleaned_data (accept_terms, accept_data_processing, etc.)
        for key, value in self.cleaned_data.items():
            # Handle boolean fields explicitly
            if isinstance(value, bool):
                setattr(user, key, value)
            elif value not in ('', None):
                setattr(user, key, value)

        # Save user first
        try:
            user.save()
        except Exception as e:
            raise serializers.ValidationError(
                {'detail': f'Error saving user: {str(e)}'}
            )

        self.custom_signup(request, user)
        setup_user_email(request, user, [])

        try:
            cabinet = Cabinet.objects.create(
                owner=user,
                trade_name=trade_name or '',
                business_address=business_address or '',
                structure_type=structure_type or '',
                team_size=team_size or 1,
                website=website,
                logo=logo,
            )

            # Set user as cabinet member and owner with OWNER role
            user.cabinet = cabinet
            user.is_cabinet_member = True  # Mark owner as cabinet member
            user.role = User.Role.OWNER
            user.save(update_fields=['cabinet', 'is_cabinet_member', 'role'])
        except Exception as e:
            # If cabinet creation fails, delete the user to maintain data integrity
            user.delete()
            raise serializers.ValidationError(
                {'detail': f'Error creating cabinet: {str(e)}'}
            )

        return user
        
    
    

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

