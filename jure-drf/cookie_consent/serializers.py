from django.conf import settings
from rest_framework import serializers

from cookie_consent.constants import OPTIONAL_OFF_ACTIONS, ConsentAction

_ALLOWED_FIELDS = {"action", "functional", "analytics"}


class CookieConsentWriteSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=ConsentAction.choices)
    functional = serializers.BooleanField(required=False)
    analytics = serializers.BooleanField(required=False)

    def validate(self, attrs):
        unknown = set(self.initial_data.keys()) - _ALLOWED_FIELDS
        if unknown:
            raise serializers.ValidationError(
                {key: "This field is not accepted." for key in sorted(unknown)}
            )

        action = attrs["action"]
        functional = attrs.get("functional", None)
        analytics = attrs.get("analytics", None)
        analytics_configured = bool(settings.COOKIE_ANALYTICS_CONFIGURED)

        if action == ConsentAction.ACCEPT_ALL:
            if functional is False:
                raise serializers.ValidationError(
                    {"functional": "Accept all keeps functional cookies enabled."}
                )
            if analytics is True and not analytics_configured:
                raise serializers.ValidationError(
                    {"analytics": "Analytics is not in use on this deployment."}
                )
            if analytics is False and analytics_configured:
                raise serializers.ValidationError(
                    {"analytics": "Accept all enables every optional category in use."}
                )
            attrs["functional"] = True
            attrs["analytics"] = analytics_configured
            return attrs

        if action in OPTIONAL_OFF_ACTIONS:
            if functional is True or analytics is True:
                raise serializers.ValidationError(
                    "Reject and withdraw turn every optional category off."
                )
            attrs["functional"] = False
            attrs["analytics"] = False
            return attrs

        if functional is None or analytics is None:
            raise serializers.ValidationError(
                "A custom choice must include functional and analytics."
            )
        if analytics and not analytics_configured:
            raise serializers.ValidationError(
                {"analytics": "Analytics is not in use on this deployment."}
            )
        attrs["functional"] = functional
        attrs["analytics"] = analytics
        return attrs
