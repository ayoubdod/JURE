from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import FileResponse, Http404

from juria.constants import ActivityAction, PermissionLevel, ResourceType
from juria.models import JuriaFile
from juria.serializers.artifact_serializer import JuriaFileSerializer
from juria.services.activity import log_activity
from juria.services.permissions import get_project_for_user, require_resource_permission, require_write
from juria.services.chat import detect_file_type
from juria.services.retrieval import ensure_file_extracted
from juria.services.sources import connect_upload
from juria.views.mixins import JuriaEnabledMixin


class JuriaProjectFileListCreateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        files = access.project.files.filter(is_removed=False)
        q = (request.query_params.get("search") or "").strip()
        if q:
            files = files.filter(original_name__icontains=q)
        return Response(JuriaFileSerializer(files, many=True, context={"request": request}).data)

    def post(self, request, pk):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "file is required."}, status=400)
        name = upload.name or "upload"
        kind = detect_file_type(name)
        if kind not in ("pdf", "docx"):
            return Response({"detail": "Unsupported file type. Use PDF or DOCX."}, status=400)
        jfile = JuriaFile.objects.create(
            project=access.project,
            file=upload,
            original_name=name,
            content_type=getattr(upload, "content_type", "") or "",
            file_kind=kind,
            size_bytes=getattr(upload, "size", None),
            uploaded_by=request.user,
        )
        connect_upload(access.project, jfile, request.user)
        ensure_file_extracted(jfile)
        log_activity(
            access.project,
            request.user,
            ActivityAction.DOCUMENT_ADDED,
            file_id=str(jfile.id),
            name=jfile.original_name,
        )
        return Response(
            JuriaFileSerializer(jfile, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JuriaProjectFileDetailView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, file_id):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        jfile = access.project.files.filter(pk=file_id, is_removed=False).first()
        if jfile is None:
            return Response(status=404)
        jfile.is_removed = True
        jfile.save(update_fields=["is_removed"])
        access.project.sources.filter(juria_file=jfile).delete()
        log_activity(access.project, request.user, ActivityAction.DOCUMENT_REMOVED, file_id=str(jfile.id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class JuriaProjectFileDownloadView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, file_id):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        jfile = access.project.files.filter(pk=file_id, is_removed=False).first()
        if jfile is None or not jfile.file:
            raise Http404()
        fh = jfile.file.open("rb")
        return FileResponse(fh, as_attachment=True, filename=jfile.original_name)
