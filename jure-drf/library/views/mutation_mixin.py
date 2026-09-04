import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from cabinets.permissions import can_manage_content, can_publish_shared_library
from core.utils import get_user_cabinet
from jurisdictions.constants import VisibilityScope
from users.models import User

from ..models import Document, LibraryFavorite, LibrarySave
from ..serializers import DocumentSerializer
from .helpers import is_platform_admin

logger = logging.getLogger(__name__)


class LibraryMutationMixin:
    def _deny_shared_mutation(self, instance: Document) -> None:
        if instance.is_shared and not is_platform_admin(self.request.user):
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
        if instance.visibility_scope != VisibilityScope.CABINET and not is_platform_admin(request.user):
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
                if doc.is_shared and not is_platform_admin(request.user):
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
