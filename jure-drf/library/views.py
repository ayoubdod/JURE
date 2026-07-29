from rest_framework import viewsets, filters, status, permissions
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
        Filter documents by user's cabinet (multi-tenant safety).
        """
        user = self.request.user
        cabinet = get_user_cabinet(user)
        if not cabinet:
            return Document.objects.none()
        return Document.objects.filter(cabinet=cabinet).select_related('created_by', 'cabinet').prefetch_related('tags')
    
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
            raise permissions.PermissionDenied("User must belong to a cabinet to create documents.")
        serializer.save(created_by=user, cabinet=cabinet)

    def destroy(self, request, *args, **kwargs):
        """
        Delete document and return 204 No Content.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
