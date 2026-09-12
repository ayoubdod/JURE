from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserThinSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    mode = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "full_name",
            "image",
            "last_seen_at",
            "mode",
        )

    def get_full_name(self, obj):
        fn = (getattr(obj, "first_name", None) or "").strip()
        ln = (getattr(obj, "last_name", None) or "").strip()
        combined = f"{fn} {ln}".strip()
        if combined:
            return combined
        full = (obj.get_full_name() or "").strip() if hasattr(obj, "get_full_name") else ""
        if full:
            return full
        email = (getattr(obj, "email", None) or "").strip()
        if "@" in email:
            return email.split("@", 1)[0]
        if email:
            return email
        return f"Member {obj.pk}"

    def get_mode(self, obj):
        # Peers see DND as Away (Do Not Disturb is private).
        if hasattr(obj, "public_presence_mode"):
            return obj.public_presence_mode()
        if hasattr(obj, "get_effective_mode"):
            mode = obj.get_effective_mode()
            return "AWAY" if mode == "DND" else mode
        mode = getattr(obj, "mode", None) or "AVAILABLE"
        return "AWAY" if mode == "DND" else mode
