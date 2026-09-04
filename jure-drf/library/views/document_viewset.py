from rest_framework import filters, permissions, viewsets
from django_filters.rest_framework import DjangoFilterBackend

from cabinets.permissions import HasLibraryPermission
from core.utils import NumericPagination

from ..filters import DocumentFilter
from ..serializers import DocumentSerializer
from .admin_mixin import LibraryAdminMixin
from .mutation_mixin import LibraryMutationMixin
from .query_mixin import LibraryQueryMixin


class DocumentViewSet(
    LibraryQueryMixin,
    LibraryMutationMixin,
    LibraryAdminMixin,
    viewsets.ModelViewSet,
):
    """
    Unified library resources with PERSONAL / LOCAL / INTERNATIONAL scopes.

    Endpoints:
    - GET  /api/v1/library/documents/                  mixed visible set (legacy)
    - GET  /api/v1/library/my/                         cabinet + saved references
    - POST /api/v1/library/my/                         create personal resource
    - GET  /api/v1/library/local/                      current jurisdiction only
    - GET  /api/v1/library/international/              global shared resources
    - GET  /api/v1/library/favorites/                  current user's reading list
    - GET  /api/v1/library/documents/{id}/
    - POST /api/v1/library/documents/{id}/favorite/
    - DELETE /api/v1/library/documents/{id}/favorite/
    - POST /api/v1/library/documents/{id}/add-to-my-library/
    - POST /api/v1/library/admin/local/
    - POST /api/v1/library/admin/international/
    """
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, HasLibraryPermission]
    pagination_class = NumericPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DocumentFilter
    search_fields = [
        'title',
        'description',
        'author',
        'source',
        'keywords',
        'reference_number',
        'issuing_authority',
        'country',
        'language',
        'resource_type',
        'category',
        'tags__slug',
        'jurisdiction__name',
        'jurisdiction__code',
    ]
    ordering_fields = ['title', 'created', 'modified']
    ordering = ['-created']
