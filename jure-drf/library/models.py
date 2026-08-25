import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django_extensions.db.models import TimeStampedModel
from django.utils.translation import gettext_lazy as _
from cabinets.models import Cabinet
from commons.models import Tag
from users.models import User
from jurisdictions.constants import VisibilityScope
from jurisdictions.scoping import validate_visibility_scope

from .constants import (
    VISIBILITY_TO_LIBRARY_SCOPE,
    is_recent_timestamp,
    days_remaining_as_new,
    days_since_added,
)

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

    class ResourceType(models.TextChoices):
        LAW = 'law', _('Law')
        CODE = 'code', _('Code')
        REGULATION = 'regulation', _('Regulation')
        DECREE = 'decree', _('Decree')
        CIRCULAR = 'circular', _('Circular')
        CASE_LAW = 'case_law', _('Case Law')
        COURT_DECISION = 'court_decision', _('Court Decision')
        ADMINISTRATIVE_DECISION = 'administrative_decision', _('Administrative Decision')
        TREATY = 'treaty', _('Treaty')
        CONVENTION = 'convention', _('Convention')
        DIRECTIVE = 'directive', _('Directive')
        LEGAL_COMMENTARY = 'legal_commentary', _('Legal Commentary')
        LEGAL_ARTICLE = 'legal_article', _('Legal Article')
        LEGAL_GUIDE = 'legal_guide', _('Legal Guide')
        TEMPLATE = 'template', _('Template')
        LEGAL_FORM = 'legal_form', _('Legal Form')
        REPORT = 'report', _('Report')
        RESEARCH_PAPER = 'research_paper', _('Research Paper')
        REGULATORY_UPDATE = 'regulatory_update', _('Regulatory Update')
        OTHER = 'other', _('Other')

    resource_uid = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
        help_text=_('Stable identifier for RAG ingestion and cross-system references.'),
    )
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=255, choices=DocumentCategory.choices)
    resource_type = models.CharField(
        max_length=64,
        choices=ResourceType.choices,
        default=ResourceType.OTHER,
        db_index=True,
    )
    legal_area = models.CharField(max_length=64, blank=True, default='')
    tags = models.ManyToManyField(Tag, related_name='documents', blank=True)
    description = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='documents/', blank=True, null=True)
    external_url = models.URLField(max_length=2000, blank=True, default='')

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
    country = models.CharField(max_length=64, blank=True, default='')
    language = models.CharField(max_length=16, blank=True, default='')
    source = models.CharField(max_length=255, blank=True, default='')
    author = models.CharField(max_length=255, blank=True, default='')
    issuing_authority = models.CharField(max_length=255, blank=True, default='')
    publication_date = models.DateField(null=True, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    reference_number = models.CharField(max_length=128, blank=True, default='')
    keywords = models.TextField(blank=True, default='')

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
            models.Index(fields=["visibility_scope", "created"], name="library_doc_scope_created_idx"),
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

    @property
    def library_scope(self) -> str:
        return VISIBILITY_TO_LIBRARY_SCOPE.get(self.visibility_scope, "PERSONAL")

    @property
    def is_recent(self) -> bool:
        return is_recent_timestamp(self.created)

    @property
    def days_since_added(self) -> int | None:
        return days_since_added(self.created)

    @property
    def days_remaining_as_new(self) -> int:
        return days_remaining_as_new(self.created)

    def has_content_source(self) -> bool:
        has_file = bool(getattr(self.file, "name", "") or "")
        has_url = bool((self.external_url or "").strip())
        return has_file or has_url

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
        if not self.has_content_source():
            raise ValidationError(
                {"file": _("Upload a document or provide an external URL.")}
            )

    def save(self, *args, **kwargs):
        self.sync_visibility_fields()
        if self.category:
            self.category = normalize_document_category(self.category)
        super().save(*args, **kwargs)


class LibraryFavorite(TimeStampedModel):
    """User ↔ resource favorite. Does not copy the document."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='library_favorites')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='favorites')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'document'], name='library_favorite_user_doc_uniq'),
        ]
        indexes = [
            models.Index(fields=['user', '-created'], name='library_fav_user_created_idx'),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.document_id}"


class LibrarySave(TimeStampedModel):
    """Cabinet reference to a shared resource (Add to My Library). Does not duplicate the file."""

    cabinet = models.ForeignKey(Cabinet, on_delete=models.CASCADE, related_name='library_saves')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='cabinet_saves')
    added_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='library_saves',
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['cabinet', 'document'], name='library_save_cabinet_doc_uniq'),
        ]
        indexes = [
            models.Index(fields=['cabinet', '-created'], name='library_save_cab_created_idx'),
        ]

    def __str__(self):
        return f"{self.cabinet_id}:{self.document_id}"
