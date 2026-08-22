# backend/tasks/models.py
from django_extensions.db.models import TimeStampedModel
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model

from cabinets.models import Cabinet

User = get_user_model()


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

    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    cabinet = models.ForeignKey(Cabinet, on_delete=models.CASCADE, null=True, blank=True, related_name='tasks')

    # Connect a task to a client (User with is_cabinet_member=False)
    client = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_tasks')

    # NEW: connect a task to a case (optional)
    case = models.ForeignKey('cases.Case', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')

    @property
    def is_overdue(self):
        return self.due_date and self.status != self.TaskStatus.DONE and self.due_date < timezone.now().date()

    def __str__(self):
        return self.title


class Appointment(TimeStampedModel):
    """
    Calendar appointments/meetings that show on the time grid
    """
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', _('Scheduled')
        DONE = 'done', _('Done')
        CANCELLED = 'cancelled', _('Cancelled')

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_appointments')
    attendees = models.ManyToManyField(User, blank=True, related_name='appointments')
    cabinet = models.ForeignKey(Cabinet, on_delete=models.CASCADE, related_name='appointments')

    location = models.CharField(max_length=255, blank=True)
    client = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_appointments')

    # Optional: attach to a case
    case = models.ForeignKey('cases.Case', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')

    def __str__(self):
        return self.title
