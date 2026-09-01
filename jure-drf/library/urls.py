from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')

app_name = 'library'

urlpatterns = [
    path('my/', DocumentViewSet.as_view({'get': 'my_library', 'post': 'my_library'}), name='my-library'),
    path('local/', DocumentViewSet.as_view({'get': 'local_library'}), name='local-library'),
    path('international/', DocumentViewSet.as_view({'get': 'international_library'}), name='international-library'),
    path('favorites/', DocumentViewSet.as_view({'get': 'favorites_library'}), name='favorites-library'),
    path('admin/local/', DocumentViewSet.as_view({'post': 'admin_publish_local'}), name='admin-local'),
    path('admin/international/', DocumentViewSet.as_view({'post': 'admin_publish_international'}), name='admin-international'),
    path(
        'admin/resources/<int:pk>/',
        DocumentViewSet.as_view({
            'patch': 'admin_update',
            'put': 'admin_update',
            'delete': 'admin_destroy',
        }),
        name='admin-resource',
    ),
    path(
        'admin/resources/<int:pk>/publish/',
        DocumentViewSet.as_view({'post': 'publish'}),
        name='admin-publish',
    ),
    path(
        'admin/resources/<int:pk>/archive/',
        DocumentViewSet.as_view({'post': 'archive'}),
        name='admin-archive',
    ),
    path('resources/<int:pk>/add-to-my-library/', DocumentViewSet.as_view({'post': 'add_to_my_library'}), name='add-to-my-library'),
    path('', include(router.urls)),
]
