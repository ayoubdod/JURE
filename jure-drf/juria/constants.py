"""Shared enums for the Juria workspace."""

from django.db import models


class ProjectStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    ARCHIVED = "ARCHIVED", "ARCHIVED"
    DELETED = "DELETED", "DELETED"


class ProjectRole(models.TextChoices):
    OWNER = "OWNER", "OWNER"
    EDITOR = "EDITOR", "EDITOR"
    REVIEWER = "REVIEWER", "REVIEWER"
    VIEWER = "VIEWER", "VIEWER"


class ResourceType(models.TextChoices):
    CASE = "CASE", "CASE"
    DOCUMENTS = "DOCUMENTS", "DOCUMENTS"
    LIBRARY = "LIBRARY", "LIBRARY"
    CALENDAR = "CALENDAR", "CALENDAR"
    TASKS = "TASKS", "TASKS"
    CLIENTS = "CLIENTS", "CLIENTS"
    TEAM = "TEAM", "TEAM"


class PermissionLevel(models.TextChoices):
    NONE = "NONE", "NONE"
    READ = "READ", "READ"
    CREATE = "CREATE", "CREATE"
    UPDATE = "UPDATE", "UPDATE"


PERMISSION_RANK = {
    PermissionLevel.NONE: 0,
    PermissionLevel.READ: 1,
    PermissionLevel.CREATE: 2,
    PermissionLevel.UPDATE: 3,
}


class SourceKind(models.TextChoices):
    CASE = "CASE", "CASE"
    CASE_DOCUMENT = "CASE_DOCUMENT", "CASE_DOCUMENT"
    LIBRARY = "LIBRARY", "LIBRARY"
    LIBRARY_LOCAL = "LIBRARY_LOCAL", "LIBRARY_LOCAL"
    LIBRARY_INTERNATIONAL = "LIBRARY_INTERNATIONAL", "LIBRARY_INTERNATIONAL"
    CALENDAR = "CALENDAR", "CALENDAR"
    TASKS = "TASKS", "TASKS"
    CLIENT = "CLIENT", "CLIENT"
    TEAM = "TEAM", "TEAM"
    UPLOAD = "UPLOAD", "UPLOAD"


class LanguageCode(models.TextChoices):
    FR = "fr", "French"
    EN = "en", "English"
    AR = "ar", "Arabic"
    DARIJA = "darija", "Darija"


class JurisdictionCode(models.TextChoices):
    MA = "MA", "Morocco"
    FR = "FR", "France"
    AE = "AE", "United Arab Emirates"
    QA = "QA", "Qatar"
    OTHER = "OTHER", "Other"


class OcrStatus(models.TextChoices):
    PENDING = "PENDING", "PENDING"
    NOT_NEEDED = "NOT_NEEDED", "NOT_NEEDED"
    REQUIRED = "REQUIRED", "REQUIRED"
    COMPLETED = "COMPLETED", "COMPLETED"
    FAILED = "FAILED", "FAILED"


class ArtifactType(models.TextChoices):
    MISE_EN_DEMEURE = "MISE_EN_DEMEURE", "Mise en demeure"
    STATUTS_SARL = "STATUTS_SARL", "Statuts SARL"
    PROCURATION = "PROCURATION", "Procuration"
    REQUETE = "REQUETE", "Requête"
    CONTRAT_TRAVAIL = "CONTRAT_TRAVAIL", "Contrat de travail"
    CONCLUSIONS = "CONCLUSIONS", "Conclusions"
    CONTRAT_BAIL = "CONTRAT_BAIL", "Contrat de bail"
    AUTRE = "AUTRE", "Autre"


class ActivityAction(models.TextChoices):
    PROJECT_CREATED = "PROJECT_CREATED", "PROJECT_CREATED"
    PROJECT_UPDATED = "PROJECT_UPDATED", "PROJECT_UPDATED"
    PROJECT_ARCHIVED = "PROJECT_ARCHIVED", "PROJECT_ARCHIVED"
    PROJECT_RESTORED = "PROJECT_RESTORED", "PROJECT_RESTORED"
    PROJECT_DELETED = "PROJECT_DELETED", "PROJECT_DELETED"
    PROJECT_DUPLICATED = "PROJECT_DUPLICATED", "PROJECT_DUPLICATED"
    MEMBER_INVITED = "MEMBER_INVITED", "MEMBER_INVITED"
    MEMBER_REMOVED = "MEMBER_REMOVED", "MEMBER_REMOVED"
    MEMBER_ROLE_CHANGED = "MEMBER_ROLE_CHANGED", "MEMBER_ROLE_CHANGED"
    DOCUMENT_ADDED = "DOCUMENT_ADDED", "DOCUMENT_ADDED"
    DOCUMENT_REMOVED = "DOCUMENT_REMOVED", "DOCUMENT_REMOVED"
    CASE_LINKED = "CASE_LINKED", "CASE_LINKED"
    CASE_UNLINKED = "CASE_UNLINKED", "CASE_UNLINKED"
    THREAD_CREATED = "THREAD_CREATED", "THREAD_CREATED"
    THREAD_ARCHIVED = "THREAD_ARCHIVED", "THREAD_ARCHIVED"
    ARTIFACT_CREATED = "ARTIFACT_CREATED", "ARTIFACT_CREATED"
    ARTIFACT_MODIFIED = "ARTIFACT_MODIFIED", "ARTIFACT_MODIFIED"
    ARTIFACT_EXPORTED = "ARTIFACT_EXPORTED", "ARTIFACT_EXPORTED"
    PERMISSION_CHANGED = "PERMISSION_CHANGED", "PERMISSION_CHANGED"
    SOURCE_ADDED = "SOURCE_ADDED", "SOURCE_ADDED"
    SOURCE_REMOVED = "SOURCE_REMOVED", "SOURCE_REMOVED"


ROLE_CAN_MANAGE_MEMBERS = {ProjectRole.OWNER, ProjectRole.EDITOR}
ROLE_CAN_WRITE = {ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.REVIEWER}
ROLE_CAN_ADMIN = {ProjectRole.OWNER}

DEFAULT_PERMISSIONS = {
    ResourceType.CASE: PermissionLevel.NONE,
    ResourceType.DOCUMENTS: PermissionLevel.NONE,
    ResourceType.LIBRARY: PermissionLevel.NONE,
    ResourceType.CALENDAR: PermissionLevel.NONE,
    ResourceType.TASKS: PermissionLevel.NONE,
    ResourceType.CLIENTS: PermissionLevel.NONE,
    ResourceType.TEAM: PermissionLevel.READ,
}

SOURCE_TO_RESOURCE = {
    SourceKind.CASE: ResourceType.CASE,
    SourceKind.CASE_DOCUMENT: ResourceType.DOCUMENTS,
    SourceKind.LIBRARY: ResourceType.LIBRARY,
    SourceKind.LIBRARY_LOCAL: ResourceType.LIBRARY,
    SourceKind.LIBRARY_INTERNATIONAL: ResourceType.LIBRARY,
    SourceKind.CALENDAR: ResourceType.CALENDAR,
    SourceKind.TASKS: ResourceType.TASKS,
    SourceKind.CLIENT: ResourceType.CLIENTS,
    SourceKind.TEAM: ResourceType.TEAM,
    SourceKind.UPLOAD: ResourceType.DOCUMENTS,
}

JURISDICTION_LABELS = {
    "MA": "Morocco",
    "FR": "France",
    "AE": "United Arab Emirates",
    "QA": "Qatar",
    "OTHER": "Other",
}

LANGUAGE_LABELS = {
    "fr": "French",
    "en": "English",
    "ar": "Arabic",
    "darija": "Darija (Moroccan Arabic)",
}
