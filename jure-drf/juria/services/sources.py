"""Attach only explicitly selected, cabinet-visible resources to a project."""

from __future__ import annotations

from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from cases.models import Case, CaseAttachment
from juria.constants import PermissionLevel, ResourceType, SourceKind
from juria.models import JuriaFile, JuriaProject, JuriaProjectPermission, JuriaProjectSource
from library.models import Document
from library.querysets import library_scope_queryset
from users.models import User

LIBRARY_LINK_CAP = 500


def _bump_permission(project: JuriaProject, resource: str, level: str = PermissionLevel.READ) -> None:
    JuriaProjectPermission.objects.update_or_create(
        project=project,
        resource=resource,
        defaults={"level": level},
    )


def connect_case(project: JuriaProject, case: Case, user) -> JuriaProjectSource:
    if case.cabinet_id != project.cabinet_id:
        raise PermissionDenied("Case is not in this cabinet.")
    project.linked_case = case
    project.save(update_fields=["linked_case", "updated_at"])
    source, _ = JuriaProjectSource.objects.get_or_create(
        project=project,
        kind=SourceKind.CASE,
        case=case,
        defaults={"added_by": user},
    )
    _bump_permission(project, ResourceType.CASE, PermissionLevel.READ)
    return source


def connect_case_documents(project: JuriaProject, attachment_ids: list[int], user) -> list[JuriaProjectSource]:
    if not attachment_ids:
        return []
    if not project.linked_case_id:
        raise ValidationError({"case_document_ids": "Link a case before attaching case documents."})
    atts = CaseAttachment.objects.filter(
        Q(case_id=project.linked_case_id) | Q(linked_cases=project.linked_case_id),
        pk__in=attachment_ids,
    ).distinct()
    found = {a.id for a in atts}
    missing = [i for i in attachment_ids if i not in found]
    if missing:
        raise PermissionDenied("One or more case documents are not accessible.")
    created = []
    for att in atts:
        src, _ = JuriaProjectSource.objects.get_or_create(
            project=project,
            kind=SourceKind.CASE_DOCUMENT,
            case_attachment=att,
            defaults={"case": project.linked_case, "added_by": user},
        )
        created.append(src)
    _bump_permission(project, ResourceType.DOCUMENTS, PermissionLevel.READ)
    return created


def _library_scope_for_doc(doc: Document) -> str:
    vis = getattr(doc, "visibility_scope", "") or ""
    if vis == "GLOBAL":
        return "INTERNATIONAL"
    if vis == "JURISDICTION":
        return "LOCAL"
    return "PERSONAL"


def _library_kind_for_doc(doc: Document) -> str:
    vis = getattr(doc, "visibility_scope", "") or ""
    if vis == "GLOBAL":
        return SourceKind.LIBRARY_INTERNATIONAL
    if vis == "JURISDICTION":
        return SourceKind.LIBRARY_LOCAL
    return SourceKind.LIBRARY


def connect_library_documents(
    project: JuriaProject,
    document_ids: list[int],
    user,
    *,
    linked_as: str = "selection",
) -> list[JuriaProjectSource]:
    if not document_ids:
        return []
    qs = library_scope_queryset(project.cabinet, None).filter(pk__in=document_ids).exclude(
        status=Document.DocumentStatus.ARCHIVED
    )
    found = {d.id for d in qs}
    missing = [i for i in document_ids if i not in found]
    if missing:
        raise PermissionDenied("One or more library documents are not accessible.")
    created = []
    for doc in qs:
        kind = _library_kind_for_doc(doc)
        meta = {
            "linked_as": linked_as,
            "library_scope": _library_scope_for_doc(doc),
        }
        src = JuriaProjectSource.objects.filter(project=project, library_document=doc).first()
        if src is None:
            src = JuriaProjectSource.objects.create(
                project=project,
                kind=kind,
                library_document=doc,
                added_by=user,
                metadata=meta,
            )
        else:
            current = dict(src.metadata or {})
            if not (current.get("linked_as") == "scope" and linked_as == "selection"):
                current.update(meta)
                src.metadata = current
                src.save(update_fields=["metadata"])
        created.append(src)
    _bump_permission(project, ResourceType.LIBRARY, PermissionLevel.READ)
    return created


def connect_library_scopes(project: JuriaProject, scopes: list[str] | None, user) -> list[JuriaProjectSource]:
    """Attach every document from the Library hub tabs in the given scopes.

    ``scopes=None`` (or including ``ALL``) links personal, local and international.
    """
    qs = library_scope_queryset(project.cabinet, scopes).exclude(status=Document.DocumentStatus.ARCHIVED)
    ids = list(qs.order_by("-created").values_list("id", flat=True)[:LIBRARY_LINK_CAP])
    return connect_library_documents(project, ids, user, linked_as="scope")


def connect_flag(project: JuriaProject, kind: str, resource: str, user) -> JuriaProjectSource:
    src, _ = JuriaProjectSource.objects.get_or_create(
        project=project,
        kind=kind,
        defaults={"added_by": user},
    )
    _bump_permission(project, resource, PermissionLevel.READ)
    return src


def connect_client(project: JuriaProject, client_id: int, user) -> JuriaProjectSource:
    client = User.objects.filter(pk=client_id).first()
    if client is None:
        raise ValidationError({"client_id": "Client not found."})
    from cases.models import Case

    allowed = Case.objects.filter(cabinet=project.cabinet, client_id=client_id).exists()
    if not allowed and getattr(client, "cabinet_id", None) != project.cabinet_id:
        raise PermissionDenied("Client is not in this cabinet.")
    src, _ = JuriaProjectSource.objects.get_or_create(
        project=project,
        kind=SourceKind.CLIENT,
        client=client,
        defaults={"added_by": user},
    )
    _bump_permission(project, ResourceType.CLIENTS, PermissionLevel.READ)
    return src


def connect_upload(project: JuriaProject, jfile: JuriaFile, user) -> JuriaProjectSource:
    src = JuriaProjectSource.objects.create(
        project=project,
        kind=SourceKind.UPLOAD,
        juria_file=jfile,
        added_by=user,
    )
    _bump_permission(project, ResourceType.DOCUMENTS, PermissionLevel.READ)
    return src
