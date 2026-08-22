from django.db import models
from django.db.models import Q
from django_extensions.db.models import TimeStampedModel
from django.utils.translation import gettext_lazy as _
from cabinets.models import Cabinet
from commons.models import Tag
from users.models import User
from jurisdictions.constants import VisibilityScope
from jurisdictions.scoping import validate_visibility_scope

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
    visibility_scope = models.CharField(
        max_length=16,
        choices=VisibilityScope.choices,
        default=VisibilityScope.CABINET,
        db_index=True,
    )
    jurisdiction = models.ForeignKey(
        'jurisdictions.Jurisdiction',
        on_delete=models.PROTECT,
        related_name='documents',
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='updated_documents',
        null=True,
        blank=True,
    )
    is_shared = models.BooleanField(
        _('public library'),
        default=False,
        db_index=True,
        help_text=_('If enabled, this document appears only in Public library for every cabinet. Upload from Django admin.'),
    )

    class DocumentStatus(models.TextChoices):
        PUBLISHED = 'published', _('Published')
        ARCHIVED = 'archived', _('Archived')

    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PUBLISHED,
        blank=True,
        db_index=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["visibility_scope", "jurisdiction"], name="library_doc_scope_jur_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                name="library_document_scope_jurisdiction_consistent",
                condition=(
                    Q(visibility_scope=VisibilityScope.GLOBAL, jurisdiction__isnull=True)
                    | Q(visibility_scope=VisibilityScope.JURISDICTION, jurisdiction__isnull=False)
                    | Q(visibility_scope=VisibilityScope.CABINET)
                ),
            ),
        ]

    def __str__(self):
        return self.title

    def sync_visibility_fields(self):
        """Keep is_shared / cabinet / jurisdiction aligned with visibility_scope."""
        if self.is_shared and self.visibility_scope == VisibilityScope.CABINET:
            self.visibility_scope = VisibilityScope.GLOBAL
        if self.visibility_scope == VisibilityScope.GLOBAL:
            self.jurisdiction = None
            self.cabinet = None
            self.is_shared = True
        elif self.visibility_scope == VisibilityScope.JURISDICTION:
            self.cabinet = None
            self.is_shared = True
        else:
            self.is_shared = False

    def clean(self):
        super().clean()
        validate_visibility_scope(
            visibility_scope=self.visibility_scope,
            jurisdiction=self.jurisdiction,
            cabinet=self.cabinet,
            require_cabinet=self.visibility_scope == VisibilityScope.CABINET,
        )
        self.sync_visibility_fields()

    def save(self, *args, **kwargs):
        self.sync_visibility_fields()
        if self.category:
            self.category = normalize_document_category(self.category)
        super().save(*args, **kwargs)
