from rest_framework import serializers

from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="notification_type", read_only=True)
    related_case = serializers.SerializerMethodField()
    related_task = serializers.SerializerMethodField()
    related_appointment = serializers.SerializerMethodField()
    related_user = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            "id",
            "type",
            "title",
            "message",
            "priority",
            "is_read",
            "read_at",
            "action_url",
            "related_case",
            "related_task",
            "related_appointment",
            "related_user",
            "created_at",
            "expires_at",
            "email_sent",
            "push_sent",
        )
        read_only_fields = (
            "id",
            "type",
            "title",
            "message",
            "priority",
            "is_read",
            "read_at",
            "action_url",
            "related_case",
            "related_task",
            "related_appointment",
            "related_user",
            "created_at",
            "expires_at",
            "email_sent",
            "push_sent",
        )

    def get_related_case(self, obj):
        c = obj.related_case
        if not c:
            return None
        return {"id": c.id, "reference": c.reference, "title": c.title}

    def get_related_task(self, obj):
        t = obj.related_task
        if not t:
            return None
        return {"id": t.id, "title": t.title}

    def get_related_appointment(self, obj):
        a = obj.related_appointment
        if not a:
            return None
        return {"id": a.id, "title": a.title}

    def get_related_user(self, obj):
        u = obj.related_user
        if not u:
            return None
        return {
            "id": u.id,
            "firstName": u.first_name or "",
            "lastName": u.last_name or "",
        }

