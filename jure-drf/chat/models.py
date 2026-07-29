# chat/models.py
import os
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django_extensions.db.models import TimeStampedModel

User = settings.AUTH_USER_MODEL


def conversation_icon_upload_to(instance, filename):
    """Unique path per conversation icon for cache busting."""
    ext = os.path.splitext(filename)[1].lower() or ".png"
    ident = instance.pk if instance.pk else uuid.uuid4().hex[:12]
    return f"chat/icons/{ident}_{uuid.uuid4().hex[:8]}{ext}"


class Conversation(TimeStampedModel):
    class Type(models.TextChoices):
        DIRECT = "direct", "Direct"
        GROUP = "group", "Group"

    type = models.CharField(max_length=10, choices=Type.choices)
    title = models.CharField(max_length=255, blank=True)  # used for groups
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversations_created")
    participants = models.ManyToManyField(User, through="ConversationMembership")

    linked_case = models.ForeignKey(
        "cases.Case",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_conversations",
    )
    linked_case_at = models.DateTimeField(null=True, blank=True)

    # Group icon: preset (emoji/key) or custom upload. Use icon_image if set, else icon_preset.
    icon_preset = models.CharField(max_length=50, blank=True, default="group")
    icon_image = models.ImageField(upload_to=conversation_icon_upload_to, null=True, blank=True)

    messages : models.QuerySet['Message']

class ConversationMembership(TimeStampedModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_memberships")
    is_admin = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)  # archive per-user
    is_pinned = models.BooleanField(default=False)  # pin per-user, shows at top
    is_deleted = models.BooleanField(default=False)
    last_read_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("conversation", "user")


class Message(TimeStampedModel):
    class MessageType(models.TextChoices):
        TEXT = "TEXT", "TEXT"
        SHARED_CASE = "SHARED_CASE", "SHARED_CASE"
        SHARED_TASK = "SHARED_TASK", "SHARED_TASK"
        SHARED_APPOINTMENT = "SHARED_APPOINTMENT", "SHARED_APPOINTMENT"

    conversation: models.ForeignKey[Conversation] = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_messages")
    body = models.TextField(blank=True)  # text content

    message_type = models.CharField(
        max_length=30,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )
    shared_case = models.ForeignKey(
        "cases.Case",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="shared_in_messages",
    )
    shared_task = models.ForeignKey(
        "tasks.Task",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="shared_in_messages",
    )
    shared_appointment = models.ForeignKey(
        "tasks.Appointment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="shared_in_messages",
    )
    reply_to = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)  # reply
    forwarded_from = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="forwards"
    )
    edited_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    # Soft delete: when set, body is masked as "[Message deleted]" for all participants
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Message pinning: when any participant pins, message is pinned for ALL participants
    pinned_by = models.ManyToManyField(
        User, related_name="pinned_messages", blank=True, through="MessagePin"
    )

    # Optional counters (can be filled by signals/async workers)
    delivered_count = models.PositiveIntegerField(default=0)
    read_count = models.PositiveIntegerField(default=0)

    read_by = models.ManyToManyField(User)

    class Meta:
        indexes = [
            models.Index(fields=["conversation", "-id"]),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        super().clean()
        fk_count = sum(
            1
            for x in (self.shared_case_id, self.shared_task_id, self.shared_appointment_id)
            if x
        )
        if fk_count > 1:
            raise ValidationError("Only one shared item reference is allowed per message.")
        if self.message_type == self.MessageType.SHARED_CASE and not self.shared_case_id:
            raise ValidationError("shared_case is required when message_type is SHARED_CASE.")
        if self.message_type == self.MessageType.SHARED_TASK and not self.shared_task_id:
            raise ValidationError("shared_task is required when message_type is SHARED_TASK.")
        if self.message_type == self.MessageType.SHARED_APPOINTMENT and not self.shared_appointment_id:
            raise ValidationError("shared_appointment is required when message_type is SHARED_APPOINTMENT.")
        if self.message_type == self.MessageType.TEXT and fk_count:
            raise ValidationError("Text messages cannot reference a shared item.")


class MessagePin(TimeStampedModel):
    """Tracks who pinned a message. When any participant pins, message is pinned for all."""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="pin_records")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="message_pins")
    pinned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")


class Attachment(TimeStampedModel):
    class Kind(models.TextChoices):
        IMAGE = "image"
        VIDEO = "video"
        AUDIO = "audio"
        FILE = "file"

    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    file = models.FileField(upload_to="chat/")
    mime = models.CharField(max_length=100, blank=True)
    size = models.PositiveIntegerField(default=0)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)  # audio/video/voice
    thumbnail = models.ImageField(upload_to="chat/thumbs/", null=True, blank=True)


class Reaction(TimeStampedModel):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=20)

    class Meta:
        unique_together = ("message", "user", "emoji")


class ReadReceipt(TimeStampedModel):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="receipts")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")


class DeliveryReceipt(TimeStampedModel):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="deliveries")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    delivered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user")


class Call(TimeStampedModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    kind = models.CharField(max_length=10, choices=(("voice", "voice"), ("video", "video")))
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)


class CallParticipant(TimeStampedModel):
    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
