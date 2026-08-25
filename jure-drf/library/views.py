import logging
from django.db.models import Q
from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from core.utils import NumericPagination, get_user_cabinet
from cabinets.permissions import (
    HasLibraryPermission,
    can_manage_content,
    can_publish_shared_library,
)
from jurisdictions.constants import VisibilityScope
from jurisdictions.scoping import documents_visible_to_cabinet_q

from users.models import User
from .constants import LAST_ADDED_DAYS, last_added_cutoff
from .filters import DocumentFilter
from .models import Document, LibraryFavorite, LibrarySave
from .serializers import DocumentSerializer

logger = logging.getLogger(__name__)


def _is_platform_admin(user) -> bool:
    return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))


class DocumentViewSet(viewsets.ModelViewSet):
    """
    Unified library resources with PERSONAL / LOCAL / INTERNATIONAL scopes.

    Endpoints:
    - GET  /api/v1/library/documents/                  mixed visible set (legacy)
    - GET  /api/v1/library/my/                         cabinet + saved references
    - POST /api/v1/library/my/                         create personal resource
    - GET  /api/v1/library/local/                      current jurisdiction only
    - GET  /api/v1/library/international/              global shared resources
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

    def get_queryset(self):
        user = self.request.user
        cabinet = get_user_cabinet(user)
        if not cabinet:
            return Document.objects.none()
        qs = (
            Document.objects.filter(documents_visible_to_cabinet_q(cabinet))
            .select_related('created_by', 'updated_by', 'cabinet', 'jurisdiction')
            .prefetch_related('tags')
            .distinct()
        )
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        cabinet = get_user_cabinet(user)
        context['cabinet'] = cabinet
        if user and user.is_authenticated:
            context['favorited_ids'] = set(
                LibraryFavorite.objects.filter(user=user).values_list('document_id', flat=True)
            )
        else:
            context['favorited_ids'] = set()
        if cabinet:
            context['saved_ids'] = set(
                LibrarySave.objects.filter(cabinet=cabinet).values_list('document_id', flat=True)
            )
        else:
            context['saved_ids'] = set()
        return context

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
        if instance.is_shared and not _is_platform_admin(self.request.user):
            raise PermissionDenied(
                "Shared library documents cannot be edited or deleted from a cabinet."
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

    def _scoped_queryset(self, library: str):
        cabinet = get_user_cabinet(self.request.user)
        if not cabinet:
            return Document.objects.none()

        base = (
            Document.objects.select_related('created_by', 'updated_by', 'cabinet', 'jurisdiction')
            .prefetch_related('tags')
        )
        if library == 'my':
            saved_ids = LibrarySave.objects.filter(cabinet=cabinet).values_list('document_id', flat=True)
            visible_shared = documents_visible_to_cabinet_q(cabinet)
            return base.filter(
                Q(visibility_scope=VisibilityScope.CABINET, cabinet=cabinet)
                | (Q(pk__in=saved_ids) & visible_shared)
            ).distinct()
        if library == 'local':
            jurisdiction_id = getattr(cabinet, 'jurisdiction_id', None)
            if not jurisdiction_id:
                return base.none()
            return base.filter(
                visibility_scope=VisibilityScope.JURISDICTION,
                jurisdiction_id=jurisdiction_id,
            )
        if library == 'international':
            return base.filter(visibility_scope=VisibilityScope.GLOBAL)
        return self.get_queryset()

    def _list_payload(self, request, queryset):
        queryset = self._apply_status_filter(self.filter_queryset(queryset))
        recent_qs = queryset.filter(created__gte=last_added_cutoff()).order_by('-created')[:24]
        recent_data = self.get_serializer(recent_qs, many=True).data

        if request.query_params.get('all', '').lower() == 'true':
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'results': serializer.data,
                'recent': recent_data,
                'recent_window_days': LAST_ADDED_DAYS,
                'count': len(serializer.data),
            })

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['recent'] = recent_data
            response.data['recent_window_days'] = LAST_ADDED_DAYS
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'recent': recent_data,
            'recent_window_days': LAST_ADDED_DAYS,
            'count': len(serializer.data),
        })

    def list(self, request, *args, **kwargs):
        library = (request.query_params.get('library') or kwargs.get('library_scope') or '').strip().lower()
        if library in ('my', 'personal', 'local', 'international'):
            mapped = 'my' if library == 'personal' else library
            return self._list_payload(request, self._scoped_queryset(mapped))

        if request.query_params.get('all', '').lower() == 'true':
            queryset = self._apply_status_filter(self.filter_queryset(self.get_queryset()))
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        queryset = self._apply_status_filter(self.filter_queryset(self.get_queryset()))
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer: DocumentSerializer) -> None:
        user: User = self.request.user
        cabinet = get_user_cabinet(user)
        if not cabinet:
            raise PermissionDenied("User must belong to a cabinet to create documents.")
        extra = {
            'created_by': user,
            'updated_by': user,
            'cabinet': cabinet,
            'is_shared': False,
            'visibility_scope': VisibilityScope.CABINET,
            'jurisdiction': None,
        }
        if not serializer.validated_data.get('language') and getattr(cabinet, 'jurisdiction', None):
            extra['language'] = getattr(cabinet.jurisdiction, 'default_language', '') or ''
        serializer.save(**extra)

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
        instance = self.get_object()
        cabinet = get_user_cabinet(request.user)
        if instance.visibility_scope != VisibilityScope.CABINET and not _is_platform_admin(request.user):
            if cabinet and LibrarySave.objects.filter(cabinet=cabinet, document=instance).exists():
                LibrarySave.objects.filter(cabinet=cabinet, document=instance).delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            raise PermissionDenied("Shared library documents cannot be deleted from a cabinet.")
        self._deny_shared_mutation(instance)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        instance = self._admin_get_object(pk) if can_publish_shared_library(request.user) else self.get_object()
        if instance.is_shared:
            if not can_publish_shared_library(request.user):
                raise PermissionDenied("Only platform administrators can archive shared library resources.")
        elif not can_manage_content(request.user):
            raise PermissionDenied("Only administrators can archive library documents.")
        instance.status = Document.DocumentStatus.ARCHIVED
        instance.updated_by = request.user
        instance.save(update_fields=['status', 'updated_by', 'modified'])
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        instance = self._admin_get_object(pk) if can_publish_shared_library(request.user) else self.get_object()
        if instance.is_shared:
            if not can_publish_shared_library(request.user):
                raise PermissionDenied("Only platform administrators can restore shared library resources.")
        elif not can_manage_content(request.user):
            raise PermissionDenied("Only administrators can restore library documents.")
        instance.status = Document.DocumentStatus.PUBLISHED
        instance.updated_by = request.user
        instance.save(update_fields=['status', 'updated_by', 'modified'])
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        return self.restore(request, pk=pk)

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
                if doc.is_shared and not _is_platform_admin(request.user):
                    continue
                self._delete_stored_file(doc)
                doc.delete()
                deleted += 1
            return Response({'deleted': deleted})
        return Response({'detail': 'Unsupported bulk action.'}, status=400)

    @action(detail=True, methods=['post', 'delete'], url_path='favorite')
    def favorite(self, request, pk=None):
        instance = self.get_object()
        if request.method == 'DELETE':
            LibraryFavorite.objects.filter(user=request.user, document=instance).delete()
            return Response(self.get_serializer(instance).data)
        LibraryFavorite.objects.get_or_create(user=request.user, document=instance)
        return Response(self.get_serializer(instance).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='add-to-my-library')
    def add_to_my_library(self, request, pk=None):
        source = self.get_object()
        cabinet = get_user_cabinet(request.user)
        if not cabinet:
            raise PermissionDenied("User must belong to a cabinet to add documents.")
        if source.visibility_scope == VisibilityScope.CABINET:
            if source.cabinet_id == cabinet.id:
                return Response(self.get_serializer(source).data, status=status.HTTP_200_OK)
            raise PermissionDenied("This resource is private to another cabinet.")
        LibrarySave.objects.get_or_create(
            cabinet=cabinet,
            document=source,
            defaults={'added_by': request.user},
        )
        return Response(self.get_serializer(source).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='copy-to-cabinet')
    def copy_to_cabinet(self, request, pk=None):
        """Legacy file-copy. Prefer add-to-my-library, which stores a reference."""
        return self.add_to_my_library(request, pk=pk)

    def _require_platform_admin(self):
        if not can_publish_shared_library(self.request.user):
            raise PermissionDenied(
                "Only platform administrators can publish shared library resources."
            )

    def _publish_shared(self, request, visibility_scope: str):
        self._require_platform_admin()
        cabinet = get_user_cabinet(request.user)
        serializer = self.get_serializer(data=request.data, context={
            **self.get_serializer_context(),
            'allow_scope_write': True,
        })
        serializer.is_valid(raise_exception=True)
        extra = {
            'created_by': request.user,
            'updated_by': request.user,
            'cabinet': None,
            'visibility_scope': visibility_scope,
            'is_shared': True,
            'status': Document.DocumentStatus.PUBLISHED,
        }
        if visibility_scope == VisibilityScope.JURISDICTION:
            jurisdiction = serializer.validated_data.get('jurisdiction')
            if jurisdiction is None and cabinet is not None:
                jurisdiction = getattr(cabinet, 'jurisdiction', None)
            if jurisdiction is None:
                return Response(
                    {'jurisdiction': 'Select a jurisdiction for the Local Library.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            extra['jurisdiction'] = jurisdiction
            if not serializer.validated_data.get('country'):
                extra['country'] = getattr(jurisdiction, 'country_code', '') or ''
            if not serializer.validated_data.get('language'):
                extra['language'] = getattr(jurisdiction, 'default_language', '') or ''
        else:
            extra['jurisdiction'] = None
        serializer.save(**extra)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get', 'post'], url_path='my')
    def my_library(self, request):
        if request.method == 'POST':
            return self.create(request)
        return self._list_payload(request, self._scoped_queryset('my'))

    @action(detail=False, methods=['get'], url_path='local')
    def local_library(self, request):
        return self._list_payload(request, self._scoped_queryset('local'))

    @action(detail=False, methods=['get'], url_path='international')
    def international_library(self, request):
        return self._list_payload(request, self._scoped_queryset('international'))

    @action(detail=False, methods=['post'], url_path='admin/local')
    def admin_publish_local(self, request):
        return self._publish_shared(request, VisibilityScope.JURISDICTION)

    @action(detail=False, methods=['post'], url_path='admin/international')
    def admin_publish_international(self, request):
        return self._publish_shared(request, VisibilityScope.GLOBAL)

    def admin_update(self, request, pk=None):
        self._require_platform_admin()
        instance = self._admin_get_object(pk)
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True,
            context={**self.get_serializer_context(), 'allow_scope_write': True},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)

    def admin_destroy(self, request, pk=None):
        self._require_platform_admin()
        instance = self._admin_get_object(pk)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _admin_get_object(self, pk):
        try:
            return Document.objects.select_related(
                'created_by', 'updated_by', 'cabinet', 'jurisdiction'
            ).prefetch_related('tags').get(pk=pk)
        except Document.DoesNotExist:
            raise NotFound()
