import logging
import os

from django.core.files.base import ContentFile
from django.db.models import Q
from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from core.utils import NumericPagination, get_user_cabinet
from cabinets.permissions import HasLibraryPermission, can_manage_content

from users.models import User
from .models import Document
from .serializers import DocumentSerializer

logger = logging.getLogger(__name__)


class DocumentViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing Document instances.
    Provides list, create, retrieve, update, and destroy operations.
    Supports both JSON and FormData (multipart/form-data) requests.
    
    Endpoints:
    - GET /api/v1/library/documents/ - List all documents (paginated)
    - GET /api/v1/library/documents/?all=true - List all documents (unpaginated array)
    - GET /api/v1/library/documents/{id}/ - Retrieve single document
    - POST /api/v1/library/documents/ - Create new document (multipart/form-data)
    - PATCH /api/v1/library/documents/{id}/ - Update document (multipart/form-data or JSON)
    - DELETE /api/v1/library/documents/{id}/ - Delete document
    - POST /api/v1/library/documents/{id}/copy-to-cabinet/ - Copy a shared document into this cabinet
    """
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, HasLibraryPermission]
    pagination_class = NumericPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'tags', 'status', 'is_shared']
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'created', 'modified']
    ordering = ['-created']

    def get_queryset(self):
        """
        Return this cabinet's documents plus platform-shared documents.
        Archived documents are hidden from the default library unless
        the caller is managing content and asks for them.
        """
        user = self.request.user
        cabinet = get_user_cabinet(user)
        if not cabinet:
            return Document.objects.none()
        qs = (
            Document.objects.filter(Q(cabinet=cabinet) | Q(is_shared=True))
            .select_related('created_by', 'updated_by', 'cabinet')
            .prefetch_related('tags')
            .distinct()
        )
        return qs

    def _apply_status_filter(self, queryset):
        status_param = (self.request.query_params.get('status') or '').strip().lower()
        include_archived = (self.request.query_params.get('include_archived') or '').lower() == 'true'
        if status_param == Document.DocumentStatus.ARCHIVED:
            return queryset.filter(status=Document.DocumentStatus.ARCHIVED)
        if status_param == Document.DocumentStatus.PUBLISHED:
            return queryset.filter(status=Document.DocumentStatus.PUBLISHED)
        if not include_archived:
            return queryset.exclude(status=Document.DocumentStatus.ARCHIVED)
        return queryset

    def _deny_shared_mutation(self, instance: Document) -> None:
        user = self.request.user
        is_platform_admin = bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
        if instance.is_shared and not is_platform_admin:
            raise PermissionDenied(
                "Public library documents cannot be edited or deleted from a cabinet."
            )

    def _delete_stored_file(self, instance: Document) -> None:
        file_field = getattr(instance, "file", None)
        name = getattr(file_field, "name", "") or ""
        if not name:
            return
        try:
            file_field.storage.delete(name)
        except Exception:
            logger.exception("Failed to delete stored file %s for document id=%s", name, instance.pk)
    
    def list(self, request, *args, **kwargs):
        """
        Override list to support unpaginated responses when ?all=true is passed.
        """
        # Check if client wants unpaginated response
        if request.query_params.get('all', '').lower() == 'true':
            queryset = self._apply_status_filter(self.filter_queryset(self.get_queryset()))
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        # Default paginated response — hide archived unless asked.
        queryset = self._apply_status_filter(self.filter_queryset(self.get_queryset()))
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer: DocumentSerializer) -> None:
        """
        Create document with user and cabinet association.
        """
        user: User = self.request.user
        cabinet = get_user_cabinet(user)
        if not cabinet:
            raise PermissionDenied("User must belong to a cabinet to create documents.")
        serializer.save(created_by=user, updated_by=user, cabinet=cabinet, is_shared=False)

    def perform_update(self, serializer: DocumentSerializer) -> None:
        serializer.save(updated_by=self.request.user)

    def update(self, request, *args, **kwargs):
        self._deny_shared_mutation(self.get_object())
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._deny_shared_mutation(self.get_object())
        return super().partial_update(request, *args, **kwargs)

    def perform_destroy(self, instance: Document) -> None:
        self._delete_stored_file(instance)
        super().perform_destroy(instance)

    def destroy(self, request, *args, **kwargs):
        """
        Delete document and return 204 No Content.
        """
        instance = self.get_object()
        self._deny_shared_mutation(instance)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        if not can_manage_content(request.user):
            raise PermissionDenied("Only administrators can archive library documents.")
        instance = self.get_object()
        self._deny_shared_mutation(instance)
        instance.status = Document.DocumentStatus.ARCHIVED
        instance.updated_by = request.user
        instance.save(update_fields=['status', 'updated_by', 'modified'])
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        if not can_manage_content(request.user):
            raise PermissionDenied("Only administrators can restore library documents.")
        instance = self.get_object()
        self._deny_shared_mutation(instance)
        instance.status = Document.DocumentStatus.PUBLISHED
        instance.updated_by = request.user
        instance.save(update_fields=['status', 'updated_by', 'modified'])
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk(self, request):
        if not can_manage_content(request.user):
            raise PermissionDenied("Only administrators can perform bulk library actions.")
        ids = request.data.get('ids') or []
        action_name = (request.data.get('action') or '').lower()
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Select at least one document.'}, status=400)
        qs = self.get_queryset().filter(pk__in=ids)
        if action_name == 'archive':
            updated = qs.exclude(is_shared=True).update(status=Document.DocumentStatus.ARCHIVED)
            return Response({'updated': updated})
        if action_name == 'restore' or action_name == 'publish':
            updated = qs.exclude(is_shared=True).update(status=Document.DocumentStatus.PUBLISHED)
            return Response({'updated': updated})
        if action_name == 'delete':
            deleted = 0
            for doc in qs:
                if doc.is_shared and not (
                    request.user.is_staff or request.user.is_superuser
                ):
                    continue
                self._delete_stored_file(doc)
                doc.delete()
                deleted += 1
            return Response({'deleted': deleted})
        return Response({'detail': 'Unsupported bulk action.'}, status=400)

    @action(detail=True, methods=['post'], url_path='copy-to-cabinet')
    def copy_to_cabinet(self, request, pk=None):
        """Copy a platform-shared document into the current cabinet's library."""
        source = self.get_object()
        if not source.is_shared:
            return Response(
                {"detail": "Only public library documents can be added to your library."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cabinet = get_user_cabinet(request.user)
        if not cabinet:
            raise PermissionDenied(
                "User must belong to a cabinet to add documents."
            )

        file_name = getattr(getattr(source, "file", None), "name", "") or ""
        if not file_name:
            return Response(
                {"detail": "The shared file is currently unavailable."},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            source.file.open("rb")
            try:
                file_copy = ContentFile(
                    source.file.read(),
                    name=os.path.basename(file_name),
                )
            finally:
                source.file.close()
        except (OSError, ValueError, FileNotFoundError):
            return Response(
                {"detail": "The shared file is currently unavailable."},
                status=status.HTTP_409_CONFLICT,
            )

        copy = Document(
            title=source.title,
            category=source.category,
            description=source.description,
            cabinet=cabinet,
            created_by=request.user,
            updated_by=request.user,
            is_shared=False,
            status=Document.DocumentStatus.PUBLISHED,
        )
        copy.file.save(file_copy.name, file_copy, save=False)
        copy.save()
        copy.tags.set(source.tags.all())

        serializer = self.get_serializer(copy)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
