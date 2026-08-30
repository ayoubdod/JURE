"""Backend-enforced project access: cabinet → membership → role → resource permission."""

from __future__ import annotations

from dataclasses import dataclass

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound, PermissionDenied

from core.utils import get_user_cabinet
from juria.constants import (
    PERMISSION_RANK,
    PermissionLevel,
    ProjectRole,
    ProjectStatus,
    ROLE_CAN_ADMIN,
    ROLE_CAN_MANAGE_MEMBERS,
    ROLE_CAN_WRITE,
    ResourceType,
    SOURCE_TO_RESOURCE,
    SourceKind,
)
from juria.models import JuriaProject, JuriaProjectMember, JuriaProjectPermission, JuriaThread


@dataclass
class ProjectAccess:
    project: JuriaProject
    member: JuriaProjectMember
    cabinet: object


def require_cabinet(user):
    cabinet = get_user_cabinet(user)
    if not cabinet:
        raise PermissionDenied("No cabinet associated with this user.")
    return cabinet


def get_project_for_user(
    user,
    project_id,
    *,
    allow_archived: bool = True,
    min_role: str | None = None,
) -> ProjectAccess:
    cabinet = require_cabinet(user)
    project = get_object_or_404(JuriaProject.objects.select_related("cabinet", "owner", "linked_case"), pk=project_id)
    if project.cabinet_id != cabinet.id:
        raise NotFound()
    if project.status == ProjectStatus.DELETED:
        raise NotFound()
    if project.status == ProjectStatus.ARCHIVED and not allow_archived:
        raise PermissionDenied("This project is archived.")
    member = JuriaProjectMember.objects.filter(project=project, user=user).first()
    if member is None:
        raise NotFound()
    if min_role:
        allowed = {
            ProjectRole.OWNER: {ProjectRole.OWNER},
            ProjectRole.EDITOR: {ProjectRole.OWNER, ProjectRole.EDITOR},
            ProjectRole.REVIEWER: {ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.REVIEWER},
            ProjectRole.VIEWER: {
                ProjectRole.OWNER,
                ProjectRole.EDITOR,
                ProjectRole.REVIEWER,
                ProjectRole.VIEWER,
            },
        }.get(min_role, {ProjectRole.OWNER})
        if member.role not in allowed:
            raise PermissionDenied("Insufficient project role.")
    return ProjectAccess(project=project, member=member, cabinet=cabinet)


def get_thread_for_user(user, thread_id, *, allow_archived: bool = True) -> tuple[JuriaThread, ProjectAccess]:
    thread = get_object_or_404(
        JuriaThread.objects.select_related("project", "project__cabinet", "project__owner"),
        pk=thread_id,
        is_deleted=False,
    )
    access = get_project_for_user(user, thread.project_id, allow_archived=allow_archived)
    return thread, access


def permission_level_for(project: JuriaProject, resource: str) -> str:
    row = project.permissions.filter(resource=resource).first()
    return row.level if row else PermissionLevel.NONE


def has_resource_permission(project: JuriaProject, resource: str, required: str) -> bool:
    current = permission_level_for(project, resource)
    return PERMISSION_RANK.get(current, 0) >= PERMISSION_RANK.get(required, 0)


def require_resource_permission(project: JuriaProject, resource: str, required: str) -> None:
    if required == PermissionLevel.NONE:
        return
    if not has_resource_permission(project, resource, required):
        raise PermissionDenied(f"Project does not grant {required} on {resource}.")


def require_source_kind_permission(project: JuriaProject, kind: str, required: str = PermissionLevel.READ) -> None:
    resource = SOURCE_TO_RESOURCE.get(kind, ResourceType.DOCUMENTS)
    require_resource_permission(project, resource, required)


def can_write(member: JuriaProjectMember) -> bool:
    return member.role in ROLE_CAN_WRITE


def can_manage_members(member: JuriaProjectMember) -> bool:
    return member.role in ROLE_CAN_MANAGE_MEMBERS


def can_admin(member: JuriaProjectMember) -> bool:
    return member.role in ROLE_CAN_ADMIN


def require_write(member: JuriaProjectMember) -> None:
    if not can_write(member):
        raise PermissionDenied("This project role cannot modify content.")


def require_manage_members(member: JuriaProjectMember) -> None:
    if not can_manage_members(member):
        raise PermissionDenied("This project role cannot manage members.")


def require_admin(member: JuriaProjectMember) -> None:
    if not can_admin(member):
        raise PermissionDenied("Only the project owner can perform this action.")


def same_cabinet_user(cabinet, user_id: int):
    from users.models import User

    user = User.objects.filter(pk=user_id).first()
    if user is None:
        raise NotFound("User not found.")
    from core.utils import get_user_cabinet as _cab

    other = _cab(user)
    if other is None or other.id != cabinet.id:
        raise PermissionDenied("User is not in this cabinet.")
    return user
