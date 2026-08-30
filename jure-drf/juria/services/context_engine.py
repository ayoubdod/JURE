"""Resolve authorized, relevant context for a Juria prompt. Never dump the cabinet."""

from __future__ import annotations

from typing import Any

from juria.constants import (
    JURISDICTION_LABELS,
    LANGUAGE_LABELS,
    PermissionLevel,
    ResourceType,
    SourceKind,
)
from juria.models import JuriaProject
from juria.serializers.conversation_serializer import build_case_context
from juria.services.permissions import has_resource_permission
from juria.services.retrieval import authorized_source_rows, retrieve_for_query


def build_context_summary(project: JuriaProject) -> dict[str, Any]:
    """What Juria can actually access — used by the context indicator/panel."""
    if getattr(project, "is_simple", False):
        return {
            "case": None,
            "documents_count": 0,
            "library_count": 0,
            "calendar_connected": False,
            "tasks_connected": False,
            "clients": [],
            "team_count": 0,
            "permissions": {
                row.resource: row.level for row in project.permissions.all()
            },
            "is_simple": True,
        }
    sources = authorized_source_rows(project)
    case_source = next((s for s in sources if s.kind == SourceKind.CASE and s.case_id), None)
    case_docs = [s for s in sources if s.kind == SourceKind.CASE_DOCUMENT]
    uploads = [s for s in sources if s.kind == SourceKind.UPLOAD and s.juria_file_id and not (s.juria_file and s.juria_file.is_removed)]
    library = [
        s
        for s in sources
        if s.kind in (SourceKind.LIBRARY, SourceKind.LIBRARY_LOCAL, SourceKind.LIBRARY_INTERNATIONAL)
    ]
    calendar = any(s.kind == SourceKind.CALENDAR for s in sources)
    tasks = any(s.kind == SourceKind.TASKS for s in sources)
    clients = [s for s in sources if s.kind == SourceKind.CLIENT]
    team = [s for s in sources if s.kind == SourceKind.TEAM]

    linked = None
    if case_source and case_source.case:
        c = case_source.case
        linked = {
            "id": c.id,
            "reference": c.reference,
            "title": c.title,
            "status": c.status,
            "case_type": c.case_type,
            "court": c.court,
        }
    elif project.linked_case_id and has_resource_permission(project, ResourceType.CASE, PermissionLevel.READ):
        c = project.linked_case
        if c:
            linked = {
                "id": c.id,
                "reference": c.reference,
                "title": c.title,
                "status": c.status,
                "case_type": c.case_type,
                "court": c.court,
            }

    client_payload = []
    for s in clients:
        if s.client:
            client_payload.append(
                {
                    "id": s.client.id,
                    "first_name": s.client.first_name,
                    "last_name": s.client.last_name,
                }
            )

    return {
        "case": linked,
        "documents_count": len(case_docs) + len(uploads),
        "library_count": len(library),
        "calendar_connected": calendar,
        "tasks_connected": tasks,
        "clients": client_payload,
        "team_count": project.members.count() if has_resource_permission(project, ResourceType.TEAM, PermissionLevel.READ) else 0,
        "permissions": {
            row.resource: row.level for row in project.permissions.all()
        },
    }


def resolve_prompt_context(
    project: JuriaProject,
    prompt: str,
    *,
    language: str | None = None,
) -> dict[str, Any]:
    lang = language or project.preferred_language or "fr"
    jurisdiction = project.jurisdiction_code or "MA"

    if getattr(project, "is_simple", False):
        return {
            "language": lang,
            "language_label": LANGUAGE_LABELS.get(lang, lang),
            "jurisdiction": jurisdiction,
            "jurisdiction_label": JURISDICTION_LABELS.get(jurisdiction, jurisdiction),
            "legal_domain": project.legal_domain or "",
            "instructions": project.instructions or "",
            "case_context": None,
            "retrieved": [],
            "retrieved_block": (
                "This is a standalone chat. You have no access to firm cases, library documents, "
                "calendar, tasks, clients, or team data. Answer only from the user's message, "
                "conversation history, and any file they attached to the current message. "
                "Do not invent citations from JURE internal sources."
            ),
            "summary": build_context_summary(project),
        }

    hits = retrieve_for_query(project, prompt)

    case_context = None
    if has_resource_permission(project, ResourceType.CASE, PermissionLevel.READ) and project.linked_case_id:
        case_context = build_case_context(project.linked_case)

    context_block_parts: list[str] = []
    if hits:
        context_block_parts.append("Sources autorisées et pertinentes du projet (ne pas inventer d'autres sources) :")
        for i, hit in enumerate(hits, start=1):
            page = f", page {hit['page']}" if hit.get("page") else ""
            context_block_parts.append(
                f"[{i}] {hit['document']}{page} (id={hit['document_id']}, type={hit['source_type']})\n{hit['chunk']}"
            )
    else:
        context_block_parts.append(
            "Aucune source documentaire du projet n'a été jugée pertinente pour cette question. "
            "Si tu n'as pas de support dans les sources connectées, dis-le explicitement. "
            "N'invente jamais une citation."
        )

    return {
        "language": lang,
        "language_label": LANGUAGE_LABELS.get(lang, lang),
        "jurisdiction": jurisdiction,
        "jurisdiction_label": JURISDICTION_LABELS.get(jurisdiction, jurisdiction),
        "legal_domain": project.legal_domain or "",
        "instructions": project.instructions or "",
        "case_context": case_context,
        "retrieved": hits,
        "retrieved_block": "\n\n".join(context_block_parts),
        "summary": build_context_summary(project),
    }
