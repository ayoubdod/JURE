from pathlib import Path

from rest_framework import serializers

from ..models import AppointmentAttachment, TaskAttachment
from .common import UserLiteSerializer


class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserLiteSerializer(source='uploaded_by', read_only=True)
    url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = TaskAttachment
        fields = [
            'id', 'name', 'original_name', 'mime', 'size',
            'uploaded_by', 'uploaded_by_details', 'created',
            'url', 'preview_url',
        ]
        read_only_fields = fields

    def get_name(self, obj):
        return obj.original_name or Path(obj.file.name).name

    def get_url(self, obj):
        return f'/tasks/tasks/{obj.task_id}/attachments/{obj.pk}/download/'

    def get_preview_url(self, obj):
        return f'/tasks/tasks/{obj.task_id}/attachments/{obj.pk}/download/?inline=1'


class AppointmentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserLiteSerializer(source='uploaded_by', read_only=True)
    url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = AppointmentAttachment
        fields = [
            'id', 'name', 'original_name', 'mime', 'size',
            'uploaded_by', 'uploaded_by_details', 'created',
            'url', 'preview_url',
        ]
        read_only_fields = fields

    def get_name(self, obj):
        return obj.original_name or Path(obj.file.name).name

    def get_url(self, obj):
        return f'/tasks/appointments/{obj.appointment_id}/attachments/{obj.pk}/download/'

    def get_preview_url(self, obj):
        return f'/tasks/appointments/{obj.appointment_id}/attachments/{obj.pk}/download/?inline=1'

