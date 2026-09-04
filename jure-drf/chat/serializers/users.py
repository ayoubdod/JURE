from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserThinSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "first_name", "last_name", "email", "full_name", "image")

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
