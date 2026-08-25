from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinLengthValidator, MaxLengthValidator, RegexValidator
from phonenumber_field.modelfields import PhoneNumberField
from django_countries.fields import CountryField
from django_extensions.db.models import TimeStampedModel
from django_extensions.db.fields import RandomCharField
from django.db.models import QuerySet
from datetime import date
from django.apps import apps
import uuid
from commons.models import Activity, Function
from cases.models import Case


from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from lawyers.models import LawyerProfile
    from cabinets.models import Cabinet
    from tasks.models import Task
    from library.models import Document


def validate_age_18_or_older(value):
    """Validator to ensure user is 18 years or older and birthday is not in the future"""
    today = date.today()
    
    # Check if birthday is in the future
    if value > today:
        raise ValidationError(_('Birthday cannot be in the future.'))
    
    # Check if birthday is not too far in the past (before 1950)
    if value.year < 1950:
        raise ValidationError(_('Birthday cannot be before 1950.'))
    
    # Calculate age
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age < 18:
        raise ValidationError(_('User must be at least 18 years old.'))


def validate_iban_length(value):
    """Validator to ensure IBAN is exactly 24 characters"""
    if value and len(value) != 24:
        raise ValidationError(_('IBAN must be exactly 24 characters long.'))


def validate_professional_card_number(value):
    """Validator to ensure professional card number contains only digits and is at least 4 characters"""
    if value and (not value.isdigit() or len(value) < 4):
        raise ValidationError(_('Professional card number must contain only digits and be at least 4 characters long.'))


def validate_bar_inscription_year(value):
    """Validator to ensure bar inscription year is valid"""
    if value:
        try:
            year = int(value)
            current_year = date.today().year
            if year < 1950 or year > current_year:
                raise ValidationError(_('Bar inscription year must be between 1950 and current year.'))
        except ValueError:
            raise ValidationError(_('Bar inscription year must be a valid year.'))


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        # Normalize email to lowercase for case-insensitive handling
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)
    
    def get_by_natural_key(self, username):
        # Override to handle case-insensitive email lookups
        # Use filter().first() to handle potential duplicates
        users = self.filter(email__iexact=username.lower() if username else username)
        if users.exists():
            # Prefer active users, otherwise return the first one
            return users.filter(is_active=True).first() or users.first()
        raise self.model.DoesNotExist(
            "%s matching query does not exist." % self.model._meta.object_name
        )


class User(AbstractUser):

    objects : UserManager = UserManager()

    # Personal Info - Step 1
    first_name = models.CharField(_('first name'), max_length=50, validators=[
        MinLengthValidator(2, _('First name must contain at least 2 characters')),
        MaxLengthValidator(50, _('First name cannot exceed 50 characters'))
    ])
    last_name = models.CharField(_('last name'), max_length=50, validators=[
        MinLengthValidator(2, _('Last name must contain at least 2 characters')),
        MaxLengthValidator(50, _('Last name cannot exceed 50 characters'))
    ])
    country = CountryField(_('country'), null=True, blank=True)
    phone = PhoneNumberField(_('phone number'), unique=True, validators=[
        MinLengthValidator(10, _('Phone number must contain at least 10 digits'))
    ])
    phone_verified = models.BooleanField(_('phone verified'), default=False)
    email = models.EmailField(_("email address"), unique=True, max_length=100, validators=[
        MaxLengthValidator(100, _('Email cannot exceed 100 characters')),
    ])



    professional_card_number = models.CharField(_('professional card number'), max_length=50, validators=[
        validate_professional_card_number
    ], null=True, blank=True)
    bar_association = models.CharField(_('bar association'), max_length=100, null=True, blank=True)
    bar_inscription_year = models.CharField(_('bar inscription year'), max_length=4, validators=[
        validate_bar_inscription_year
    ], null=True, blank=True)

    # Documents - Step 4
    image = models.ImageField(_('image'), upload_to='images/', null=True, blank=True)
    national_id = models.FileField(_('national ID'), upload_to='national_ids/', null=True, blank=True)
    bar_attestation = models.FileField(_('bar attestation'), upload_to='bar_attestations/', null=True, blank=True)
    professional_card = models.FileField(_('professional card'), upload_to='professional_cards/', null=True, blank=True)

    # Consent - Step 5
    accept_terms = models.BooleanField(_('accept terms'), default=False)
    accept_data_processing = models.BooleanField(_('accept data processing'), default=False)

    affiliation_code = RandomCharField(_('affiliation code'), length=50, unique=True, editable=False)
    affiliated_by : models.ForeignKey['User'] = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='affiliated_users', verbose_name=_('affiliated by'))

    bio = models.TextField(_('bio'), blank=True, null=True)
    is_cabinet_member = models.BooleanField(_('Is Cabinet Member'), default=False, blank=True)
    cabinet : models.ForeignKey['Cabinet'] = models.ForeignKey('cabinets.Cabinet', on_delete=models.SET_NULL, null=True, blank=True)
    cabinet_creator : models.ForeignKey['Cabinet'] = models.ForeignKey('cabinets.Cabinet', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_users')
    address = models.CharField(max_length=256,null=True,blank=True)


    class Role(models.TextChoices):
        OWNER = 'OWNER', _('Owner')
        ADMIN = 'ADMIN', _('Administrator')
        MANAGER = 'MANAGER', _('Manager')
        LAWYER = 'LAWYER', _('Lawyer')
        ASSISTANT = 'ASSISTANT', _('Assistant')
        VIEWER = 'VIEWER', _('Viewer')
    
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
        null=True,
        blank=True,
        help_text='Role of the cabinet member'
    )

    hourly_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='MAD per hour — used for hourly fee calculation.',
    )

    # Incremented on each successful login so only the latest JWT session remains valid.
    session_version = models.PositiveIntegerField(
        _('session version'),
        default=0,
        help_text=_('Bumped on login to invalidate older access/refresh tokens.'),
    )

    
    addresses : QuerySet['UserAddress']
    client_cases : QuerySet['Case']
    assigned_cases : QuerySet['Case']
    assigned_tasks : QuerySet['Task']
    documents : QuerySet['Document']

    def get_assigned_in_progress_cases_count(self) -> int:
        return self.assigned_cases.filter(status=Case.CaseStatus.IN_PROGRESS).count()

    def get_lawyer_profile_or_none(self) -> 'LawyerProfile | None':
        return getattr(self, 'lawyer_profile', None)
    
    # cabinet that the user belongs to as owner or employee
    def get_owned_cabinet_or_none(self) -> 'Cabinet | None':
        return getattr(self, 'owned_cabinet', None)

    def is_cabinet_owner(self):
        return self.get_owned_cabinet_or_none() is not None
    
    def is_cabinet_employee(self):
        return self.cabinet is not None and self.is_cabinet_member
    
    def is_lawyer(self):
        return self.get_lawyer_profile_or_none() is not None
    
    def get_lawyer_profile(self):
        return self.get_lawyer_profile_or_none()
    
    def is_client(self) :
        return self.client_cases.exists()

    # Override username field to use email instead
    username = None
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone', 'first_name', 'last_name', 'country']

    @property
    def default_address(self):
        return self.addresses.filter(is_default=True).first()

    def save(self, *args, **kwargs):
        # Normalize email to lowercase for case-insensitive handling
        if self.email:
            self.email = self.email.lower()
        self.full_clean()
        super().save(*args, **kwargs)


class UserAttachment(TimeStampedModel):
    user : models.ForeignKey[User] = models.ForeignKey(User, on_delete=models.CASCADE)
    attachment = models.FileField(upload_to='attachments/')


class UserAddress(TimeStampedModel):

    class AddressType(models.TextChoices):
        HOME = 'home', _('Home')
        WORK = 'work', _('Work')
        COMPANY = 'company', _('Company')
        OTHER = 'other', _('Other') 

    user : models.ForeignKey[User] = models.ForeignKey(User, on_delete=models.CASCADE,related_name='addresses')
    address = models.TextField(_('address'))
    osm_id = models.CharField(_('OSM ID'), max_length=100)
    type = models.CharField(_('address type'), max_length=50, choices=AddressType.choices,default=AddressType.HOME)

    is_default = models.BooleanField(_('is default'), default=False)


class PasswordSetupToken(models.Model):
    """
    One-time-use token for team member 'Set Password' link.
    Created when a new team member is invited; consumed when they set their password.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='password_setup_token',
    )
    token = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"PasswordSetupToken for {self.user.email} (expires {self.expires_at})"

    @property
    def is_valid(self):
        from django.utils import timezone
        return self.used_at is None and timezone.now() < self.expires_at
