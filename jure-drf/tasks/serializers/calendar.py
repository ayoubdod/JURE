from rest_framework import serializers

from .common import UserLiteSerializer


class CalendarEventSerializer(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.ChoiceField(choices=['task', 'appointment'])
    title = serializers.CharField()
    start = serializers.DateTimeField()
    end = serializers.DateTimeField(allow_null=True, required=False)
    allDay = serializers.BooleanField(default=False)
    status = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.CharField(required=False, allow_blank=True)

    assigned_to = UserLiteSerializer(required=False, allow_null=True)
    assignees = UserLiteSerializer(many=True, required=False)
    case_id = serializers.IntegerField(required=False, allow_null=True)
    case_title = serializers.CharField(required=False, allow_blank=True)
    client = UserLiteSerializer(required=False, allow_null=True)
    meeting_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    conversation_id = serializers.IntegerField(required=False, allow_null=True)
    conversation_title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    attachment_count = serializers.IntegerField(required=False)
    participant_scope = serializers.CharField(required=False, allow_blank=True, allow_null=True)
