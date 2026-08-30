from django.db.models import Count, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cases.models import Case
from core.utils import NumericPagination, get_user_cabinet
from juria.constants import (
    ActivityAction,
    PermissionLevel,
    ProjectRole,
    ProjectStatus,
    ResourceType,
    SourceKind,
)
from juria.models import (
    JuriaProject,
    JuriaProjectMember,
    JuriaProjectPermission,
    JuriaProjectSource,
)
from juria.serializers.project_serializer import (
    JuriaMemberInviteSerializer,
    JuriaMemberRoleSerializer,
    JuriaPermissionUpdateSerializer,
    JuriaProjectCreateSerializer,
    JuriaProjectDetailSerializer,
    JuriaProjectListSerializer,
    JuriaProjectMemberSerializer,
    JuriaProjectSourceSerializer,
    JuriaProjectUpdateSerializer,
    JuriaSourceCreateSerializer,
)
from juria.services.activity import log_activity
from juria.services.context_engine import build_context_summary
from juria.services.permissions import (
    get_project_for_user,
    require_admin,
    require_cabinet,
    require_manage_members,
    require_resource_permission,
    require_write,
    same_cabinet_user,
)
from juria.services.sources import (
    connect_case,
    connect_case_documents,
    connect_client,
    connect_flag,
    connect_library_documents,
)
from juria.services.workspace import create_project, duplicate_project, ensure_legacy_conversation
from juria.views.conversation_views import get_case_for_user
from juria.views.mixins import JuriaEnabledMixin


def _member_projects(user):
    cabinet = get_user_cabinet(user)
    if not cabinet:
        return JuriaProject.objects.none()
    return (
        JuriaProject.objects.filter(cabinet=cabinet, members__user=user)
        .exclude(status=ProjectStatus.DELETED)
        .select_related("owner", "linked_case", "cabinet")
        .annotate(
            member_count=Count("members", distinct=True),
            thread_count=Count(
                "threads",
                filter=Q(threads__is_deleted=False, threads__is_archived=False),
                distinct=True,
            ),
        )
        .distinct()
    )


class JuriaProjectListCreateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _member_projects(request.user).order_by("-updated_at")
        p = request.query_params
        status_filter = (p.get("status") or "ACTIVE").upper()
        if status_filter == "ARCHIVED":
            qs = qs.filter(status=ProjectStatus.ARCHIVED)
        elif status_filter == "ALL":
            qs = qs.exclude(status=ProjectStatus.DELETED)
        else:
            qs = qs.filter(status=ProjectStatus.ACTIVE)
        q = (p.get("search") or "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        if p.get("favorite") in ("1", "true", "yes"):
            qs = qs.filter(is_favorite=True)
        paginator = NumericPagination()
        page = paginator.paginate_queryset(qs, request)
        ser = JuriaProjectListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(ser.data)

    def post(self, request):
        cabinet = require_cabinet(request.user)
        ser = JuriaProjectCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        linked_id = data.get("linked_case_id")
        is_simple = bool(data.get("is_simple"))
        if is_simple:
            linked_id = None
        case = get_case_for_user(request.user, linked_id) if linked_id else None
        if linked_id and case is None:
            return Response({"linked_case_id": "Case not found or not accessible."}, status=400)
        overrides = data.get("permissions") or {}
        project = create_project(
            cabinet=cabinet,
            owner=request.user,
            name=data["name"],
            description=data.get("description") or "",
            preferred_language=data.get("preferred_language") or "fr",
            jurisdiction_code=data.get("jurisdiction_code") or "MA",
            legal_domain=data.get("legal_domain") or "",
            instructions=data.get("instructions") or "",
            linked_case=case,
            is_simple=is_simple,
            permission_overrides=overrides,
        )
        if data.get("is_favorite"):
            project.is_favorite = True
            project.save(update_fields=["is_favorite"])
        if not is_simple:
            if data.get("case_document_ids"):
                connect_case_documents(project, data["case_document_ids"], request.user)
            if data.get("library_document_ids"):
                connect_library_documents(project, data["library_document_ids"], request.user)
            if data.get("connect_calendar"):
                connect_flag(project, SourceKind.CALENDAR, ResourceType.CALENDAR, request.user)
            if data.get("connect_tasks"):
                connect_flag(project, SourceKind.TASKS, ResourceType.TASKS, request.user)
                JuriaProjectPermission.objects.update_or_create(
                    project=project,
                    resource=ResourceType.TASKS,
                    defaults={"level": PermissionLevel.CREATE},
                )
            if data.get("client_id"):
                connect_client(project, data["client_id"], request.user)
            for uid in data.get("member_ids") or []:
                if uid == request.user.id:
                    continue
                other = same_cabinet_user(cabinet, uid)
                if other is None:
                    continue
                JuriaProjectMember.objects.get_or_create(
                    project=project,
                    user=other,
                    defaults={"role": ProjectRole.EDITOR, "invited_by": request.user},
                )
                log_activity(project, request.user, ActivityAction.MEMBER_INVITED, user_id=uid)
        thread = project.threads.order_by("created_at").first()
        if thread:
            ensure_legacy_conversation(thread, request.user)
        project = JuriaProject.objects.prefetch_related(
            "permissions", "members__user", "sources"
        ).select_related("owner", "linked_case").get(pk=project.pk)
        return Response(
            JuriaProjectDetailSerializer(project, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JuriaProjectDetailView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk)
        project = (
            JuriaProject.objects.filter(pk=access.project.pk)
            .select_related("owner", "linked_case")
            .prefetch_related("permissions", "members__user", "sources")
            .first()
        )
        return Response(JuriaProjectDetailSerializer(project, context={"request": request}).data)

    def patch(self, request, pk):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        ser = JuriaProjectUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        project = access.project
        fields = []
        for key in (
            "name",
            "description",
            "preferred_language",
            "jurisdiction_code",
            "legal_domain",
            "instructions",
            "is_favorite",
        ):
            if key in data:
                setattr(project, key, data[key])
                fields.append(key)
        if "linked_case_id" in data:
            linked_id = data["linked_case_id"]
            if linked_id is None:
                project.linked_case = None
                JuriaProjectSource.objects.filter(project=project, kind=SourceKind.CASE).delete()
                log_activity(project, request.user, ActivityAction.CASE_UNLINKED)
            else:
                case = get_case_for_user(request.user, linked_id)
                if case is None:
                    return Response({"linked_case_id": "Case not found or not accessible."}, status=400)
                connect_case(project, case, request.user)
                log_activity(project, request.user, ActivityAction.CASE_LINKED, case_id=case.id)
            fields.append("linked_case")
        if fields:
            project.save(update_fields=fields + ["updated_at"])
            log_activity(project, request.user, ActivityAction.PROJECT_UPDATED, fields=fields)
        if "permissions" in data:
            require_admin(access.member)
            for resource, level in (data["permissions"] or {}).items():
                JuriaProjectPermission.objects.update_or_create(
                    project=project, resource=resource, defaults={"level": level}
                )
            log_activity(project, request.user, ActivityAction.PERMISSION_CHANGED)
        project.refresh_from_db()
        project = (
            JuriaProject.objects.filter(pk=project.pk)
            .select_related("owner", "linked_case")
            .prefetch_related("permissions", "members__user", "sources")
            .first()
        )
        return Response(JuriaProjectDetailSerializer(project, context={"request": request}).data)

    def delete(self, request, pk):
        access = get_project_for_user(request.user, pk)
        require_admin(access.member)
        access.project.soft_delete()
        log_activity(access.project, request.user, ActivityAction.PROJECT_DELETED)
        return Response(status=status.HTTP_204_NO_CONTENT)


class JuriaProjectArchiveView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        access = get_project_for_user(request.user, pk)
        require_admin(access.member)
        access.project.archive()
        log_activity(access.project, request.user, ActivityAction.PROJECT_ARCHIVED)
        return Response(JuriaProjectListSerializer(access.project, context={"request": request}).data)


class JuriaProjectRestoreView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        require_admin(access.member)
        access.project.restore()
        log_activity(access.project, request.user, ActivityAction.PROJECT_RESTORED)
        return Response(JuriaProjectListSerializer(access.project, context={"request": request}).data)


class JuriaProjectDuplicateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        clone = duplicate_project(access.project, request.user)
        clone = (
            JuriaProject.objects.filter(pk=clone.pk)
            .select_related("owner", "linked_case")
            .prefetch_related("permissions", "members__user", "sources")
            .first()
        )
        return Response(
            JuriaProjectDetailSerializer(clone, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JuriaProjectContextView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        return Response(build_context_summary(access.project))


class JuriaProjectPermissionView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        rows = access.project.permissions.all()
        return Response([{"resource": r.resource, "level": r.level} for r in rows])

    def patch(self, request, pk):
        access = get_project_for_user(request.user, pk)
        require_admin(access.member)
        ser = JuriaPermissionUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        row, _ = JuriaProjectPermission.objects.update_or_create(
            project=access.project,
            resource=ser.validated_data["resource"],
            defaults={"level": ser.validated_data["level"]},
        )
        log_activity(
            access.project,
            request.user,
            ActivityAction.PERMISSION_CHANGED,
            resource=row.resource,
            level=row.level,
        )
        return Response({"resource": row.resource, "level": row.level})


class JuriaProjectMemberListView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        require_resource_permission(access.project, ResourceType.TEAM, PermissionLevel.READ)
        members = access.project.members.select_related("user")
        return Response(
            JuriaProjectMemberSerializer(members, many=True, context={"request": request}).data
        )

    def post(self, request, pk):
        access = get_project_for_user(request.user, pk)
        require_manage_members(access.member)
        ser = JuriaMemberInviteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        other = same_cabinet_user(access.cabinet, ser.validated_data["user_id"])
        if other.id == access.project.owner_id and ser.validated_data["role"] != ProjectRole.OWNER:
            return Response({"detail": "Cannot change the owner's membership this way."}, status=400)
        member, created = JuriaProjectMember.objects.get_or_create(
            project=access.project,
            user=other,
            defaults={"role": ser.validated_data["role"], "invited_by": request.user},
        )
        if not created:
            member.role = ser.validated_data["role"]
            member.save(update_fields=["role"])
        log_activity(
            access.project,
            request.user,
            ActivityAction.MEMBER_INVITED,
            user_id=other.id,
            role=member.role,
        )
        return Response(
            JuriaProjectMemberSerializer(member, context={"request": request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class JuriaProjectMemberDetailView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, member_id):
        access = get_project_for_user(request.user, pk)
        require_manage_members(access.member)
        ser = JuriaMemberRoleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        member = access.project.members.filter(pk=member_id).select_related("user").first()
        if member is None:
            return Response(status=404)
        if member.user_id == access.project.owner_id:
            return Response({"detail": "Cannot change the project owner's role."}, status=400)
        member.role = ser.validated_data["role"]
        member.save(update_fields=["role"])
        log_activity(
            access.project,
            request.user,
            ActivityAction.MEMBER_ROLE_CHANGED,
            user_id=member.user_id,
            role=member.role,
        )
        return Response(JuriaProjectMemberSerializer(member, context={"request": request}).data)

    def delete(self, request, pk, member_id):
        access = get_project_for_user(request.user, pk)
        require_manage_members(access.member)
        member = access.project.members.filter(pk=member_id).first()
        if member is None:
            return Response(status=404)
        if member.user_id == access.project.owner_id:
            return Response({"detail": "Cannot remove the project owner."}, status=400)
        uid = member.user_id
        member.delete()
        log_activity(access.project, request.user, ActivityAction.MEMBER_REMOVED, user_id=uid)
        return Response(status=status.HTTP_204_NO_CONTENT)


class JuriaProjectSourceListView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        sources = access.project.sources.select_related(
            "case", "case_attachment", "library_document", "juria_file", "client"
        )
        return Response(
            JuriaProjectSourceSerializer(sources, many=True, context={"request": request}).data
        )

    def post(self, request, pk):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        if access.project.is_simple:
            return Response(
                {"detail": "Simple chat cannot connect firm sources (case, library, calendar, team)."},
                status=400,
            )
        ser = JuriaSourceCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        kind = data["kind"]
        project = access.project
        if kind == SourceKind.CASE:
            case = get_case_for_user(request.user, data.get("case_id"))
            if case is None:
                return Response({"case_id": "Case not found or not accessible."}, status=400)
            src = connect_case(project, case, request.user)
        elif kind == SourceKind.CASE_DOCUMENT:
            ids = list(data.get("case_document_ids") or [])
            if data.get("case_attachment_id"):
                ids.append(data["case_attachment_id"])
            created = connect_case_documents(project, ids, request.user)
            src = created[0] if created else None
        elif kind in (SourceKind.LIBRARY, SourceKind.LIBRARY_LOCAL, SourceKind.LIBRARY_INTERNATIONAL):
            ids = list(data.get("library_document_ids") or [])
            if data.get("library_document_id"):
                ids.append(data["library_document_id"])
            created = connect_library_documents(project, ids, request.user)
            src = created[0] if created else None
        elif kind == SourceKind.CALENDAR:
            src = connect_flag(project, SourceKind.CALENDAR, ResourceType.CALENDAR, request.user)
        elif kind == SourceKind.TASKS:
            src = connect_flag(project, SourceKind.TASKS, ResourceType.TASKS, request.user)
        elif kind == SourceKind.CLIENT:
            src = connect_client(project, data["client_id"], request.user)
        elif kind == SourceKind.TEAM:
            src = connect_flag(project, SourceKind.TEAM, ResourceType.TEAM, request.user)
        else:
            return Response({"kind": "Unsupported source kind."}, status=400)
        if src is None:
            return Response({"detail": "Could not connect source."}, status=400)
        log_activity(project, request.user, ActivityAction.SOURCE_ADDED, kind=kind, source_id=str(src.id))
        return Response(
            JuriaProjectSourceSerializer(src, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JuriaProjectSourceDetailView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, source_id):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        src = access.project.sources.filter(pk=source_id).first()
        if src is None:
            return Response(status=404)
        kind = src.kind
        src.delete()
        log_activity(access.project, request.user, ActivityAction.SOURCE_REMOVED, kind=kind)
        return Response(status=status.HTTP_204_NO_CONTENT)


class JuriaProjectCaseOptionsView(JuriaEnabledMixin, APIView):
    """Cases the user may connect — cabinet scoped, not auto-attached."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        q = (request.query_params.get("search") or "").strip()
        qs = Case.objects.filter(cabinet=access.cabinet).order_by("-modified")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(reference__icontains=q))
        qs = qs[:30]
        return Response(
            [
                {
                    "id": c.id,
                    "reference": c.reference,
                    "title": c.title,
                    "status": c.status,
                    "case_type": c.case_type,
                }
                for c in qs
            ]
        )
