from rest_framework.permissions import BasePermission
from django.http import HttpRequest
from django.contrib.auth.models import AnonymousUser
from users.models import User

class IsAuthenticatedCabinetLawyer(BasePermission):
    """
    True if the user is authenticated AND is a lawyer AND belongs to (or owns) a cabinet.
    """
    def has_permission(self, request: HttpRequest, view):
        user = request.user
        if isinstance(user, AnonymousUser):
            return False
        in_cabinet = getattr(user, "is_cabinet_member", False) or user.is_cabinet_owner()
        return bool(user.is_authenticated and user.is_lawyer() and in_cabinet)

class IsLawyer(BasePermission):
    def has_permission(self, request:HttpRequest, view):
        user : User = request.user
        return user.is_authenticated and user.is_lawyer()


class IsCabinetMember(BasePermission):
    """
    Permission to allow cabinet members and cabinet owners to access resources.
    """
    def has_permission(self, request: HttpRequest, view):
        user: User = request.user
        if not user.is_authenticated:
            return False
        
        # Check if user is a cabinet member
        if user.is_cabinet_member:
            return True
        
        # Check if user owns a cabinet
        if user.is_cabinet_owner():
            return True
        
        # Also check if user has a cabinet (even if not marked as member)
        if hasattr(user, 'cabinet') and user.cabinet:
            return True
        
        # Check if user has an owned_cabinet
        if hasattr(user, 'owned_cabinet') and user.owned_cabinet:
            return True
        
        return False