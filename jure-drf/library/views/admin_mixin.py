from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response

from cabinets.permissions import can_publish_shared_library
from core.utils import get_user_cabinet
from jurisdictions.constants import VisibilityScope

from ..models import Document


class LibraryAdminMixin:
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
