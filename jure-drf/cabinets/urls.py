from django.urls import path, include
from .views import (
    CabinetMemberViewSet,
    update_cabinet_member_role,
    get_role_permissions,
    my_cabinet,
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

router.register('members', CabinetMemberViewSet, basename='cabinet-members') 

urlpatterns = [
    path('', include(router.urls)),
    path('me/', my_cabinet, name='my-cabinet'),
    path('members/<int:member_id>/role/', update_cabinet_member_role, name='update-member-role'),
    path('roles/permissions/', get_role_permissions, name='role-permissions'),
]

