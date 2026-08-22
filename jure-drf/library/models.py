from django.db import models
from django_extensions.db.models import TimeStampedModel
from django.utils.translation import gettext_lazy as _
from cabinets.models import Cabinet
from commons.models import Tag
from users.models import User
# Create your models here.

# Legacy category values → canonical slugs. Applied on write and in data migration.
LEGACY_CATEGORY_MAP = {
    'law': 'legislation_regulations',
    'templates': 'forms_templates',
    'contracts': 'contracts_agreements',
    'research': 'legal_research_opinions',
    'legal_forms': 'forms_templates',
    'training': 'training_knowledge',
    'evidence': 'evidence_case_materials',
}


def normalize_document_category(value: str | None) -> str | None:
    """Map legacy category slugs to canonical identifiers. Unknown values are preserved."""
    if not value:
        return value
    return LEGACY_CATEGORY_MAP.get(value, value)


class Document(TimeStampedModel):

    class DocumentCategory(models.TextChoices):
        LEGISLATION_REGULATIONS = 'legislation_regulations', _('Legislation & Regulations')
        CASE_LAW_JURISPRUDENCE = 'case_law_jurisprudence', _('Case Law & Jurisprudence')
        CONTRACTS_AGREEMENTS = 'contracts_agreements', _('Contracts & Agreements')
        PLEADINGS_PROCEEDINGS = 'pleadings_proceedings', _('Pleadings & Proceedings')
        FORMS_TEMPLATES = 'forms_templates', _('Forms & Templates')
        LEGAL_RESEARCH_OPINIONS = 'legal_research_opinions', _('Legal Research & Opinions')
        CORPORATE_GOVERNANCE = 'corporate_governance', _('Corporate & Governance')
        COMPLIANCE_POLICIES = 'compliance_policies', _('Compliance & Policies')
        EVIDENCE_CASE_MATERIALS = 'evidence_case_materials', _('Evidence & Case Materials')
        TRAINING_KNOWLEDGE = 'training_knowledge', _('Training & Knowledge')

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
        if self.category:
            self.category = normalize_document_category(self.category)
        super().save(*args, **kwargs)
