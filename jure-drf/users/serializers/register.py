from django.core.exceptions import ValidationError as DjangoValidationError
from dj_rest_auth.registration.serializers import RegisterSerializer
from django_countries.serializer_fields import CountryField
from phonenumber_field.serializerfields import PhoneNumberField
from rest_framework import serializers

from cabinets.models import Cabinet
from jurisdictions.models import Jurisdiction

from ..models import User

try:
    from allauth.account.adapter import get_adapter
    from allauth.account.utils import setup_user_email
except ImportError:
    raise ImportError('allauth needs to be added to INSTALLED_APPS.')


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
    structure_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    practice_type = serializers.ChoiceField(choices=Cabinet.PracticeType.choices, required=True)
    jurisdiction = serializers.SlugRelatedField(
        slug_field="code",
        queryset=Jurisdiction.objects.filter(status=Jurisdiction.Status.ACTIVE),
        required=True,
        error_messages={"does_not_exist": "Select an active jurisdiction.", "null": "Jurisdiction is required."},
    )
    business_address = serializers.CharField(required=True)
    team_size = serializers.IntegerField(required=True, min_value=1)

    # Optional business fields
    website = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    logo = serializers.ImageField(required=False, allow_null=True)

    # Required consent fields
    accept_terms = serializers.BooleanField(required=True)
    accept_data_processing = serializers.BooleanField(required=True)

    class SubscriptionSelectionSerializer(serializers.Serializer):
        plan_code = serializers.CharField()
        billing_cycle = serializers.ChoiceField(choices=["monthly", "annual"])

        def to_internal_value(self, data):
            if not isinstance(data, dict):
                raise serializers.ValidationError("Choose a plan and a billing cycle.")
            allowed = {"plan_code", "billing_cycle"}
            extra = set(data.keys()) - allowed
            if extra:
                raise serializers.ValidationError(
                    "Custom prices and entitlements cannot be submitted."
                )
            return super().to_internal_value(data)

    subscription = SubscriptionSelectionSerializer(required=True)

    

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
            'practice_type': self.validated_data.get('practice_type', ''),
            'jurisdiction': self.validated_data.get('jurisdiction', None),
            'business_address': self.validated_data.get('business_address', ''),
            'team_size': self.validated_data.get('team_size', None),
            'website': self.validated_data.get('website', None),
            'logo': self.validated_data.get('logo', None),
            'accept_terms': self.validated_data.get('accept_terms', False),
            'accept_data_processing': self.validated_data.get('accept_data_processing', False),
            'subscription': self.validated_data.get('subscription', None),
        }

    def to_internal_value(self, data):
        plain = self._plain_data(data)
        subscription = plain.get("subscription")
        if not isinstance(subscription, dict):
            plan_code = plain.get("subscription.plan_code")
            billing_cycle = plain.get("subscription.billing_cycle")
            if plan_code or billing_cycle:
                plain["subscription"] = {
                    "plan_code": plan_code or "",
                    "billing_cycle": billing_cycle or "",
                }
        return super().to_internal_value(plain)

    @staticmethod
    def _plain_data(data):
        # QueryDict is a dict subclass. dict(querydict) turns every value into a
        # list, which then fails CharField and ChoiceField validation.
        from django.http import QueryDict
        from django.utils.datastructures import MultiValueDict

        if isinstance(data, (QueryDict, MultiValueDict)):
            return {key: data.get(key) for key in data.keys()}
        if isinstance(data, dict):
            return dict(data)
        return data
    
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
        practice_type = self.cleaned_data.pop('practice_type', None)
        jurisdiction = self.cleaned_data.pop('jurisdiction', None)
        business_address = self.cleaned_data.pop('business_address', None)
        team_size = self.cleaned_data.pop('team_size', None)
        website = self.cleaned_data.pop('website', None)
        logo = self.cleaned_data.pop('logo', None)
        selection = self.cleaned_data.pop('subscription', None) or {}
        
        # Ensure required fields are provided and not empty
        if not trade_name or (isinstance(trade_name, str) and not trade_name.strip()):
            raise serializers.ValidationError({'trade_name': 'Trade name is required.'})
        if not practice_type:
            raise serializers.ValidationError({'practice_type': 'Practice type is required.'})
        if not jurisdiction:
            raise serializers.ValidationError({'jurisdiction': 'Jurisdiction is required.'})
        if not business_address or (isinstance(business_address, str) and not business_address.strip()):
            raise serializers.ValidationError({'business_address': 'Business address is required.'})
        if not team_size or team_size < 1:
            raise serializers.ValidationError({'team_size': 'Team size must be at least 1.'})

        if not structure_type or (isinstance(structure_type, str) and not structure_type.strip()):
            structure_type = {
                Cabinet.PracticeType.LAW_OFFICE: "Cabinet d'avocat",
                Cabinet.PracticeType.LAW_FIRM: "Société d'avocat",
            }.get(practice_type, '')

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

        try:
            from django.db import transaction

            with transaction.atomic():
                user.save()
                self.custom_signup(request, user)
                cabinet = Cabinet.objects.create(
                    owner=user,
                    trade_name=trade_name or '',
                    business_address=business_address or '',
                    structure_type=structure_type or '',
                    practice_type=practice_type,
                    jurisdiction=jurisdiction,
                    team_size=team_size or 1,
                    website=website,
                    logo=logo,
                )
                user.cabinet = cabinet
                user.is_cabinet_member = True
                user.role = User.Role.OWNER
                user.save(update_fields=['cabinet', 'is_cabinet_member', 'role'])
                from subscriptions.services.lifecycle import provision_trial

                provision_trial(
                    cabinet=cabinet,
                    plan_code=selection.get('plan_code', ''),
                    billing_cycle=selection.get('billing_cycle', ''),
                )
        except serializers.ValidationError:
            raise
        except Exception as e:
            raise serializers.ValidationError(
                {'detail': f'Error creating cabinet: {str(e)}'}
            )

        setup_user_email(request, user, [])
        return user
