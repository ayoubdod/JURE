from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils import get_user_cabinet
from jurisdictions.scoping import documents_visible_to_cabinet_q

from ..constants import LAST_ADDED_DAYS, last_added_cutoff
from ..models import Document, LibraryFavorite, LibrarySave


class LibraryQueryMixin:
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

    def _scoped_queryset(self, library: str):
        from library.querysets import library_tab_queryset

        cabinet = get_user_cabinet(self.request.user)
        if not cabinet:
            return Document.objects.none()
        if library not in ('my', 'local', 'international', 'favorites'):
            return self.get_queryset()
        return (
            library_tab_queryset(cabinet, library, user=self.request.user)
            .select_related('created_by', 'updated_by', 'cabinet', 'jurisdiction')
            .prefetch_related('tags')
        )

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
        if library in ('my', 'personal', 'local', 'international', 'favorites'):
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

    @action(detail=False, methods=['get'], url_path='favorites')
    def favorites_library(self, request):
        return self._list_payload(request, self._scoped_queryset('favorites'))
