"""Helpers to create a full project workspace (permissions, owner membership, default thread)."""

from __future__ import annotations

from django.db import transaction

from juria.constants import (
    ActivityAction,
    DEFAULT_PERMISSIONS,
    PermissionLevel,
    ProjectRole,
    ResourceType,
    SourceKind,
)
from juria.models import (
    JuriaConversation,
    JuriaProject,
    JuriaProjectMember,
    JuriaProjectPermission,
    JuriaProjectSource,
    JuriaThread,
)
from juria.services.activity import log_activity
from juria.services.titles import is_auto_title, untitled_chat_name


def create_project(
    *,
    cabinet,
    owner,
    name: str,
    description: str = "",
    preferred_language: str = "fr",
    jurisdiction_code: str = "MA",
    legal_domain: str = "",
    instructions: str = "",
    linked_case=None,
    is_simple: bool = False,
    permission_overrides: dict[str, str] | None = None,
    default_thread_title: str = "Discussion générale",
    mode: str = "CHAT",
) -> JuriaProject:
    with transaction.atomic():
        if is_simple and not instructions:
            instructions = (
                "Standalone legal AI chat. Answer questions, draft, and analyse from the user's "
                "message and any files they attach in this chat only. Do not assume access to "
                "firm cases, library documents, calendar, tasks, clients, or team data."
            )
        effective_case = None if is_simple else linked_case
        untitled = untitled_chat_name(preferred_language)
        provided = (name or "").strip()
        if is_simple:
            name_is_custom = bool(provided) and not is_auto_title(provided)
            project_name = provided if name_is_custom else untitled
            thread_title = default_thread_title if default_thread_title and default_thread_title != "Discussion générale" else untitled
            thread_is_custom = bool(thread_title) and not is_auto_title(thread_title)
        else:
            name_is_custom = True
            project_name = provided or "Nouveau projet"
            thread_title = default_thread_title or "Discussion générale"
            thread_is_custom = bool(thread_title) and not is_auto_title(thread_title)
        project = JuriaProject.objects.create(
            cabinet=cabinet,
            owner=owner,
            name=project_name,
            description=description or "",
            preferred_language=preferred_language or "fr",
            jurisdiction_code=(jurisdiction_code or "MA").upper(),
            legal_domain=legal_domain or "",
            instructions=instructions or "",
            linked_case=effective_case,
            is_simple=bool(is_simple),
            name_is_custom=name_is_custom,
        )
        JuriaProjectMember.objects.create(
            project=project,
            user=owner,
            role=ProjectRole.OWNER,
            invited_by=owner,
        )
        perms = dict(DEFAULT_PERMISSIONS)
        if is_simple:
            # No firm integrations — only chat + uploaded files for this conversation.
            for resource in (
                ResourceType.CASE,
                ResourceType.DOCUMENTS,
                ResourceType.LIBRARY,
                ResourceType.CALENDAR,
                ResourceType.TASKS,
                ResourceType.CLIENTS,
                ResourceType.TEAM,
            ):
                perms[resource] = PermissionLevel.NONE
        if permission_overrides and not is_simple:
            perms.update(permission_overrides)
        JuriaProjectPermission.objects.bulk_create(
            [
                JuriaProjectPermission(project=project, resource=resource, level=level)
                for resource, level in perms.items()
            ]
        )
        JuriaThread.objects.create(
            project=project,
            title=thread_title,
            title_is_custom=thread_is_custom,
            mode=mode,
            created_by=owner,
        )
        if linked_case and not is_simple:
            JuriaProjectSource.objects.create(
                project=project,
                kind=SourceKind.CASE,
                case=linked_case,
                added_by=owner,
            )
            JuriaProjectPermission.objects.filter(
                project=project, resource=ResourceType.CASE
            ).update(level=PermissionLevel.READ)
        log_activity(project, owner, ActivityAction.PROJECT_CREATED, name=project.name)
        if linked_case and not is_simple:
            log_activity(
                project,
                owner,
                ActivityAction.CASE_LINKED,
                case_id=linked_case.id,
                reference=getattr(linked_case, "reference", ""),
            )
        return project


def ensure_legacy_conversation(thread: JuriaThread, user) -> JuriaConversation:
    """Keep a conversation row so drafting/FAB APIs still work on project threads."""
    existing = thread.legacy_conversations.order_by("created_at").first()
    if existing:
        return existing
    return JuriaConversation.objects.create(
        user=user,
        title=thread.title or "",
        mode=thread.mode or JuriaConversation.Mode.CHAT,
        linked_case=thread.project.linked_case,
        project=thread.project,
        thread=thread,
    )


def duplicate_project(source: JuriaProject, owner) -> JuriaProject:
    clone = create_project(
        cabinet=source.cabinet,
        owner=owner,
        name=f"{source.name} (copie)",
        description=source.description,
        preferred_language=source.preferred_language,
        jurisdiction_code=source.jurisdiction_code,
        legal_domain=source.legal_domain,
        instructions=source.instructions,
        linked_case=None if source.is_simple else source.linked_case,
        is_simple=source.is_simple,
    )
    clone.duplicated_from = source
    clone.name_is_custom = True
    clone.save(update_fields=["duplicated_from", "name_is_custom", "updated_at"])
    if source.is_simple:
        log_activity(clone, owner, ActivityAction.PROJECT_DUPLICATED, source_id=str(source.id))
        return clone
    # Copy permissions
    for row in source.permissions.all():
        JuriaProjectPermission.objects.update_or_create(
            project=clone,
            resource=row.resource,
            defaults={"level": row.level},
        )
    # Copy sources (not files bytes — reconnect references only)
    for src in source.sources.all():
        JuriaProjectSource.objects.create(
            project=clone,
            kind=src.kind,
            case=src.case,
            case_attachment=src.case_attachment,
            library_document=src.library_document,
            client=src.client,
            metadata=src.metadata or {},
            added_by=owner,
        )
    log_activity(clone, owner, ActivityAction.PROJECT_DUPLICATED, source_id=str(source.id))
    return clone
