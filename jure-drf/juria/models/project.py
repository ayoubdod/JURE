import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from juria.constants import (
    DEFAULT_PERMISSIONS,
    JurisdictionCode,
    LanguageCode,
    PermissionLevel,
    ProjectRole,
    ProjectStatus,
    ResourceType,
    SourceKind,
)


class JuriaProject(models.Model):
    """Persistent AI legal workspace. The primary object in Juria 2.0."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cabinet = models.ForeignKey(
        "cabinets.Cabinet",
        on_delete=models.CASCADE,
        related_name="juria_projects",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_juria_projects",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=ProjectStatus.choices,
        default=ProjectStatus.ACTIVE,
        db_index=True,
    )
    preferred_language = models.CharField(
        max_length=16,
        choices=LanguageCode.choices,
        default=LanguageCode.FR,
    )
    jurisdiction_code = models.CharField(
        max_length=8,
        choices=JurisdictionCode.choices,
        default=JurisdictionCode.MA,
    )
    legal_domain = models.CharField(max_length=120, blank=True, default="")
    instructions = models.TextField(blank=True, default="")
    linked_case = models.ForeignKey(
        "cases.Case",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="juria_projects",
    )
    is_favorite = models.BooleanField(default=False)
    is_simple = models.BooleanField(
        default=False,
        help_text="Standalone AI chat without JURE matter / library / team context.",
    )
    name_is_custom = models.BooleanField(
        default=False,
        help_text="True after the user sets the name; AI auto-titles are skipped.",
    )
    duplicated_from = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="duplicates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["cabinet", "status"]),
            models.Index(fields=["cabinet", "owner"]),
        ]

    def __str__(self) -> str:
        return f"JuriaProject({self.name})"

    def archive(self) -> None:
        self.status = ProjectStatus.ARCHIVED
        self.archived_at = timezone.now()
        self.save(update_fields=["status", "archived_at", "updated_at"])

    def restore(self) -> None:
        self.status = ProjectStatus.ACTIVE
        self.archived_at = None
        self.save(update_fields=["status", "archived_at", "updated_at"])

    def soft_delete(self) -> None:
        self.status = ProjectStatus.DELETED
        self.deleted_at = timezone.now()
        self.save(update_fields=["status", "deleted_at", "updated_at"])


class JuriaProjectMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        JuriaProject,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="juria_project_memberships",
    )
    role = models.CharField(max_length=16, choices=ProjectRole.choices, default=ProjectRole.VIEWER)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="juria_members_invited",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["project", "user"]]
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"JuriaProjectMember({self.project_id}, {self.user_id}, {self.role})"


class JuriaProjectPermission(models.Model):
    """Per-resource permission on a project. Enforced on every API request."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        JuriaProject,
        on_delete=models.CASCADE,
        related_name="permissions",
    )
    resource = models.CharField(max_length=20, choices=ResourceType.choices)
    level = models.CharField(
        max_length=16,
        choices=PermissionLevel.choices,
        default=PermissionLevel.NONE,
    )

    class Meta:
        unique_together = [["project", "resource"]]

    def __str__(self) -> str:
        return f"JuriaProjectPermission({self.project_id}, {self.resource}={self.level})"


class JuriaProjectSource(models.Model):
    """Explicitly connected resource. Only these enter Juria's AI context."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        JuriaProject,
        on_delete=models.CASCADE,
        related_name="sources",
    )
    kind = models.CharField(max_length=32, choices=SourceKind.choices)
    case = models.ForeignKey(
        "cases.Case",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="juria_sources",
    )
    case_attachment = models.ForeignKey(
        "cases.CaseAttachment",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="juria_sources",
    )
    library_document = models.ForeignKey(
        "library.Document",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="juria_sources",
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="juria_client_sources",
    )
    juria_file = models.ForeignKey(
        "juria.JuriaFile",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="sources",
    )
    metadata = models.JSONField(default=dict, blank=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="juria_sources_added",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "kind"]),
        ]

    def __str__(self) -> str:
        return f"JuriaProjectSource({self.kind}, {self.project_id})"


def ensure_default_permissions(project: JuriaProject) -> None:
    existing = set(project.permissions.values_list("resource", flat=True))
    to_create = [
        JuriaProjectPermission(project=project, resource=resource, level=level)
        for resource, level in DEFAULT_PERMISSIONS.items()
        if resource not in existing
    ]
    if to_create:
        JuriaProjectPermission.objects.bulk_create(to_create)
