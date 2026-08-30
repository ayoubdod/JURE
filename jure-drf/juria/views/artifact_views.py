import difflib

from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from juria.constants import ActivityAction, ArtifactType
from juria.models import JuriaArtifact, JuriaArtifactVersion
from juria.serializers.artifact_serializer import (
    JuriaArtifactSerializer,
    JuriaArtifactWriteSerializer,
)
from juria.services.activity import log_activity
from juria.services.export import export_bytes
from juria.services.permissions import get_project_for_user, require_write
from juria.views.mixins import JuriaEnabledMixin


def _html_from_markdown(text: str) -> str:
    import markdown as md

    return md.markdown(text or "", extensions=["extra"])


def _snapshot(artifact, user, note=""):
    return JuriaArtifactVersion.objects.create(
        artifact=artifact,
        version_number=artifact.current_version,
        content_html=artifact.content_html,
        content_markdown=artifact.content_markdown,
        created_by=user,
        note=note or "",
    )


class JuriaProjectArtifactListCreateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        arts = access.project.artifacts.filter(is_deleted=False).prefetch_related("versions").select_related("created_by")
        return Response(JuriaArtifactSerializer(arts, many=True, context={"request": request}).data)

    def post(self, request, pk):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        ser = JuriaArtifactWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        md = data.get("content_markdown") or ""
        html = data.get("content_html") or (_html_from_markdown(md) if md else "")
        art = JuriaArtifact.objects.create(
            project=access.project,
            thread_id=data.get("thread_id"),
            title=(data.get("title") or "Document").strip(),
            artifact_type=data.get("artifact_type") or ArtifactType.AUTRE,
            content_html=html,
            content_markdown=md,
            created_by=request.user,
            current_version=1,
        )
        _snapshot(art, request.user, note="Création")
        log_activity(access.project, request.user, ActivityAction.ARTIFACT_CREATED, artifact_id=str(art.id))
        return Response(
            JuriaArtifactSerializer(art, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JuriaArtifactDetailView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        art = (
            access.project.artifacts.filter(pk=artifact_id, is_deleted=False)
            .prefetch_related("versions__created_by")
            .select_related("created_by")
            .first()
        )
        if art is None:
            return Response(status=404)
        return Response(JuriaArtifactSerializer(art, context={"request": request}).data)

    def patch(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        ser = JuriaArtifactWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        content_changed = False
        if "title" in data:
            art.title = data["title"]
        if "artifact_type" in data:
            art.artifact_type = data["artifact_type"]
        if "content_html" in data or "content_markdown" in data:
            if "content_markdown" in data:
                art.content_markdown = data["content_markdown"]
                if "content_html" not in data:
                    art.content_html = _html_from_markdown(art.content_markdown)
            if "content_html" in data:
                art.content_html = data["content_html"]
            art.current_version += 1
            _snapshot(art, request.user, note=data.get("note") or "")
            content_changed = True
        art.save()
        if content_changed:
            log_activity(access.project, request.user, ActivityAction.ARTIFACT_MODIFIED, artifact_id=str(art.id), version=art.current_version)
        art = (
            access.project.artifacts.filter(pk=art.pk)
            .prefetch_related("versions__created_by")
            .select_related("created_by")
            .first()
        )
        return Response(JuriaArtifactSerializer(art, context={"request": request}).data)

    def delete(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        art.is_deleted = True
        art.save(update_fields=["is_deleted", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class JuriaArtifactDuplicateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        clone = JuriaArtifact.objects.create(
            project=access.project,
            thread=art.thread,
            title=f"{art.title} (copie)",
            artifact_type=art.artifact_type,
            content_html=art.content_html,
            content_markdown=art.content_markdown,
            created_by=request.user,
            current_version=1,
        )
        _snapshot(clone, request.user, note="Duplication")
        log_activity(access.project, request.user, ActivityAction.ARTIFACT_CREATED, artifact_id=str(clone.id), duplicated_from=str(art.id))
        return Response(
            JuriaArtifactSerializer(clone, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JuriaArtifactExportView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        fmt = (request.query_params.get("format") or "docx").lower()
        content, content_type, filename = export_bytes(art, fmt)
        log_activity(
            access.project,
            request.user,
            ActivityAction.ARTIFACT_EXPORTED,
            artifact_id=str(art.id),
            format=fmt,
        )
        resp = HttpResponse(content, content_type=content_type)
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp


class JuriaArtifactCompareView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        try:
            a = int(request.query_params.get("from") or 1)
            b = int(request.query_params.get("to") or art.current_version)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid version numbers."}, status=400)
        va = art.versions.filter(version_number=a).first()
        vb = art.versions.filter(version_number=b).first()
        if va is None or vb is None:
            return Response({"detail": "Version not found."}, status=404)
        old = (va.content_markdown or va.content_html or "").splitlines()
        new = (vb.content_markdown or vb.content_html or "").splitlines()
        diff = list(difflib.unified_diff(old, new, fromfile=f"v{a}", tofile=f"v{b}", lineterm=""))
        return Response(
            {
                "from": a,
                "to": b,
                "old": va.content_markdown or va.content_html,
                "new": vb.content_markdown or vb.content_html,
                "diff": diff,
            }
        )
