from django.core.exceptions import ObjectDoesNotExist
from dj_rest_auth.serializers import UserDetailsSerializer
from rest_framework import serializers

from cabinets.models import Cabinet
from jurisdictions.scoping import serialize_jurisdiction

from ..models import User
from .address import UserAddressSerializer
from .cabinet_fields import CabinetAttrField, CabinetLogoField, _cabinet_for_user

UserModel = User


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
    practice_type = CabinetAttrField(
        'practice_type',
        serializers.ChoiceField(choices=Cabinet.PracticeType.choices, allow_blank=True, allow_null=True),
    )
    cabinet_id = serializers.SerializerMethodField()
    jurisdiction = serializers.SerializerMethodField()
    is_platform_admin = serializers.SerializerMethodField()
    client_type = serializers.SerializerMethodField()

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
            'practice_type',
            'cabinet_id',
            'jurisdiction',
            'role',
            'is_platform_admin',
            'client_type',
            'accept_terms',
            'accept_data_processing',
            'mode',
            'mode_until',
            'last_seen_at',
        ]
        read_only_fields = (
            'email',
            'cabinet_id',
            'jurisdiction',
            'role',
            'is_platform_admin',
            'client_type',
            'last_seen_at',
        )

    def get_cabinet_id(self, obj):
        cabinet = _cabinet_for_user(obj)
        return getattr(cabinet, "id", None)

    def get_jurisdiction(self, obj):
        cabinet = _cabinet_for_user(obj)
        if cabinet is None:
            return None
        return serialize_jurisdiction(getattr(cabinet, "jurisdiction", None))

    def get_is_platform_admin(self, obj):
        return bool(getattr(obj, "is_staff", False) or getattr(obj, "is_superuser", False))

    def get_client_type(self, obj):
        try:
            profile = obj.firm_client_profile
        except ObjectDoesNotExist:
            return None
        return getattr(profile, "client_type", None)

    def update(self, instance, validated_data):
        """Update user and sync cabinet fields (logo, etc.) to the cabinet."""
        cabinet = _cabinet_for_user(instance)
        cabinet_fields = [
            'logo',
            'trade_name',
            'structure_type',
            'business_address',
            'team_size',
            'website',
            'practice_type',
        ]
        cabinet_data = {}
        for field in cabinet_fields:
            if field in validated_data:
                cabinet_data[field] = validated_data.pop(field)

        if cabinet and cabinet_data and cabinet.owner_id == instance.id:
            for key, value in cabinet_data.items():
                setattr(cabinet, key, value)
            cabinet.save(update_fields=list(cabinet_data.keys()))

        mode = validated_data.get('mode', serializers.empty)
        if mode is not serializers.empty:
            if mode == User.PresenceMode.AVAILABLE:
                validated_data['mode_until'] = None
            elif mode in (User.PresenceMode.AWAY, User.PresenceMode.INVISIBLE):
                validated_data.setdefault('mode_until', None)

        instance = super().update(instance, validated_data)
        self._notify_mode_changed(instance)
        return instance

    def _notify_mode_changed(self, instance: User) -> None:
        """Ask the user's live chat socket to refresh presence; broadcast mode to peers."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            from chat.presence import presence_list

            effective = instance.get_effective_mode()
            public = instance.public_presence_mode()
            channel_layer = get_channel_layer()
            if not channel_layer:
                return

            async_to_sync(channel_layer.group_send)(
                f"user_{instance.id}",
                {
                    "type": "mode.changed",
                    "payload": {
                        "mode": effective,
                        "mode_until": instance.mode_until.isoformat()
                        if instance.mode_until
                        else None,
                    },
                },
            )
            # Also broadcast status for peers even if chat socket is briefly reconnecting.
            # Peers see DND as Away.
            online_ids = presence_list()
            async_to_sync(channel_layer.group_send)(
                "chat-presence",
                {
                    "type": "presence.update",
                    "payload": {
                        "online_user_ids": online_ids,
                        "online_member_ids": online_ids,
                        "online": online_ids,
                        "statuses": {str(instance.id): public},
                        "last_seen": {},
                    },
                },
            )
        except Exception:
            pass

    def to_representation(self, instance):
        """Build absolute URL for logo; expose effective (non-expired) mode."""
        if hasattr(instance, "get_effective_mode"):
            instance.get_effective_mode()
        data = super().to_representation(instance)
        logo = data.get('logo')
        if logo and not str(logo).startswith('http'):
            request = self.context.get('request') if hasattr(self, 'context') else None
            if request:
                data['logo'] = request.build_absolute_uri(logo)
        return data
