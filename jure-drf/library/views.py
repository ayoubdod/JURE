import os

from django.core.files.base import ContentFile
from django.db.models import Q
from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from core.utils import NumericPagination, get_user_cabinet
from cabinets.permissions import HasLibraryPermission

from users.models import User
from .models import Document
from .serializers import DocumentSerializer


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
    filterset_fields = ['category', 'tags']
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'created', 'modified']
    ordering = ['-created']

    def get_queryset(self):
        """
        Return this cabinet's documents plus platform-shared documents.
        """
        user = self.request.user
        cabinet = get_user_cabinet(user)
        if not cabinet:
            return Document.objects.none()
        return (
            Document.objects.filter(Q(cabinet=cabinet) | Q(is_shared=True))
            .select_related('created_by', 'cabinet')
            .prefetch_related('tags')
            .distinct()
        )

    def _deny_shared_mutation(self, instance: Document) -> None:
        if instance.is_shared:
            raise PermissionDenied(
                "JURE shared documents cannot be edited or deleted from a cabinet."
            )
    
    def list(self, request, *args, **kwargs):
        """
        Override list to support unpaginated responses when ?all=true is passed.
        """
        # Check if client wants unpaginated response
        if request.query_params.get('all', '').lower() == 'true':
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        # Default paginated response
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer: DocumentSerializer) -> None:
        """
        Create document with user and cabinet association.
        """
        user: User = self.request.user
        cabinet = get_user_cabinet(user)
        if not cabinet:
            raise PermissionDenied("User must belong to a cabinet to create documents.")
        serializer.save(created_by=user, cabinet=cabinet, is_shared=False)

    def update(self, request, *args, **kwargs):
        self._deny_shared_mutation(self.get_object())
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._deny_shared_mutation(self.get_object())
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Delete document and return 204 No Content.
        """
        instance = self.get_object()
        self._deny_shared_mutation(instance)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='copy-to-cabinet')
    def copy_to_cabinet(self, request, pk=None):
        """Copy a platform-shared document into the current cabinet's library."""
        source = self.get_object()
        if not source.is_shared:
            return Response(
                {"detail": "Only JURE shared documents can be added to your library."},
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
            is_shared=False,
        )
        copy.file.save(file_copy.name, file_copy, save=False)
        copy.save()
        copy.tags.set(source.tags.all())

        serializer = self.get_serializer(copy)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
