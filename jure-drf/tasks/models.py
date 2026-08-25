# backend/tasks/models.py
import uuid
from datetime import timedelta
from pathlib import Path

from django_extensions.db.models import TimeStampedModel
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model

from cabinets.models import Cabinet

User = get_user_model()


def task_attachment_upload_to(instance, filename):
    ext = Path(filename).suffix[:12]
    parent_id = getattr(instance, "task_id", None) or "pending"
    return f"task_attachments/{parent_id}/{uuid.uuid4().hex}{ext}"


def appointment_attachment_upload_to(instance, filename):
    ext = Path(filename).suffix[:12]
    parent_id = getattr(instance, "appointment_id", None) or "pending"
    return f"appointment_attachments/{parent_id}/{uuid.uuid4().hex}{ext}"


class Task(TimeStampedModel):
    class TaskPriority(models.TextChoices):
        LOW = 'low', _('Low')
        MEDIUM = 'medium', _('Medium')
        HIGH = 'high', _('High')

    class TaskStatus(models.TextChoices):
        TODO = 'todo', _('To Do')
        IN_PROGRESS = 'in_progress', _('In Progress')
        DONE = 'done', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=20, choices=TaskPriority.choices, default=TaskPriority.LOW)
    status = models.CharField(max_length=20, choices=TaskStatus.choices, default=TaskStatus.TODO)

    # Tasks appear as all-day items on their due date
    due_date = models.DateField(null=True, blank=True)

    estimated_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Legacy primary assignee — kept in sync with the first M2M assignee for filters/feeds.
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks'
    )
    assignees = models.ManyToManyField(
        User,
        through='TaskAssignee',
        related_name='collaborative_tasks',
        blank=True,
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tasks'
    )
    cabinet = models.ForeignKey(Cabinet, on_delete=models.CASCADE, null=True, blank=True, related_name='tasks')

    # Connect a task to a client (User with is_cabinet_member=False)
    client = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_tasks')

    # NEW: connect a task to a case (optional)
    case = models.ForeignKey('cases.Case', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')

    @property
    def is_overdue(self):
        return self.due_date and self.status != self.TaskStatus.DONE and self.due_date < timezone.now().date()

    def assignee_id_list(self):
        ids = list(self.assignees.values_list('id', flat=True))
        if self.assigned_to_id and self.assigned_to_id not in ids:
            ids.append(self.assigned_to_id)
        return ids

    def __str__(self):
        return self.title


class TaskAssignee(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='task_assignees')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='task_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('task', 'user')
        ordering = ['assigned_at', 'id']

    def __str__(self):
        return f'{self.task_id} → {self.user_id}'


class Appointment(TimeStampedModel):
    """
    Calendar appointments/meetings that show on the time grid
    """
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', _('Scheduled')
        DONE = 'done', _('Done')
        CANCELLED = 'cancelled', _('Cancelled')

    class MeetingType(models.TextChoices):
        IN_PERSON = 'in_person', _('In-person')
        VIDEO = 'video', _('Video conference')

    class ParticipantScope(models.TextChoices):
        TEAM = 'team', _('Team members')
        WITH_CLIENT = 'with_client', _('With client')

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    meeting_type = models.CharField(
        max_length=20, choices=MeetingType.choices, default=MeetingType.IN_PERSON
    )
    participant_scope = models.CharField(
        max_length=20,
        choices=ParticipantScope.choices,
        default=ParticipantScope.TEAM,
        db_default=ParticipantScope.TEAM,
    )

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_appointments')
    attendees = models.ManyToManyField(User, blank=True, related_name='appointments')
    cabinet = models.ForeignKey(Cabinet, on_delete=models.CASCADE, related_name='appointments')

    location = models.CharField(max_length=500, blank=True)
    conversation = models.ForeignKey(
        'chat.Conversation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointments',
    )
    client = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_appointments')

    # Optional: attach to a case
    case = models.ForeignKey('cases.Case', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')

    def conference_path(self):
        # Open the meeting chat; user joins the conference from the in-chat button.
        if self.meeting_type == self.MeetingType.VIDEO and self.conversation_id:
            return f'/dashboard/conversations?selected={self.conversation_id}'
        return None

    def is_joinable(self, *, now=None, early_minutes: int = 15) -> bool:
        """Scheduled video appointments can be joined from early_minutes before start through end."""
        if self.status != self.Status.SCHEDULED:
            return False
        if self.meeting_type != self.MeetingType.VIDEO or not self.conversation_id:
            return False
        now = now or timezone.now()
        window_start = self.start_at - timedelta(minutes=early_minutes)
        return window_start <= now <= self.end_at

    def __str__(self):
        return self.title


class TaskAttachment(TimeStampedModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to=task_attachment_upload_to)
    original_name = models.CharField(max_length=255, blank=True)
    mime = models.CharField(max_length=150, blank=True)
    size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_task_attachments'
    )

    class Meta:
        ordering = ['-created', '-id']

    def __str__(self):
        return self.original_name or Path(self.file.name).name


class AppointmentAttachment(TimeStampedModel):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to=appointment_attachment_upload_to)
    original_name = models.CharField(max_length=255, blank=True)
    mime = models.CharField(max_length=150, blank=True)
    size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_appointment_attachments'
    )

    class Meta:
        ordering = ['-created', '-id']

    def __str__(self):
        return self.original_name or Path(self.file.name).name
