from django.db import models
from django_extensions.db.models import TimeStampedModel
from django.utils.translation import gettext_lazy as _
from cabinets.models import Cabinet
from commons.models import Tag
from users.models import User
# Create your models here.

class Document(TimeStampedModel):

    class DocumentCategory(models.TextChoices):
        LAW = 'law', _('Law')
        TEMPLATES = 'templates', _('Templates')
        CONTRACTS = 'contracts', _('Contracts')
        RESEARCH = 'research', _('Research')
        LEGAL_FORMS = 'legal_forms', _('Legal Forms')
        TRAINING = 'training', _('Training')
        EVIDENCE = 'evidence', _('Evidence')

    title = models.CharField(max_length=255)
    category = models.CharField(max_length=255, choices=DocumentCategory.choices)
    tags = models.ManyToManyField(Tag, related_name='documents', blank=True)
    description = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='documents/')

    cabinet = models.ForeignKey(Cabinet, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    is_shared = models.BooleanField(
        _('public library'),
        default=False,
        db_index=True,
        help_text=_('If enabled, this document appears only in Public library for every cabinet. Upload from Django admin.'),
    )

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.is_shared:
            self.cabinet = None
        super().save(*args, **kwargs)
