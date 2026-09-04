from rest_framework import response, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from users.models import User

from ..permissions import DEFAULT_ROLE_PERMISSIONS, can_manage_roles
from ..serializers import CabinetMemberSerializer


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_cabinet_member_role(request, member_id):
    """
    Update a cabinet member's role
    
    PATCH /api/v1/cabinets/members/{id}/role/
    Body: {
        "role": "ADMIN"
    }
    
    Note: member_id is the User ID
    """
    try:
        # Get the user (member) by ID
        member_user = User.objects.get(id=member_id)
        
        # Check if user is a cabinet member
        if not member_user.is_cabinet_member:
            return response.Response(
                {'error': 'User is not a cabinet member'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if current user has permission to manage roles
        if not can_manage_roles(request.user):
            return response.Response(
                {'error': 'You do not have permission to manage roles'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Prevent users from changing their own role (security measure)
        if member_user == request.user:
            return response.Response(
                {'error': 'You cannot change your own role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate role
        role = request.data.get('role')
        if role and role not in [choice[0] for choice in User.Role.choices]:
            return response.Response(
                {'error': f'Invalid role. Must be one of: {", ".join([choice[0] for choice in User.Role.choices])}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update role if provided
        if role:
            member_user.role = role
            member_user.save(update_fields=['role'])
        
        # Return updated member data
        serializer = CabinetMemberSerializer(member_user)
        return response.Response(serializer.data)
    
    except User.DoesNotExist:
        return response.Response(
            {'error': 'Member not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_role_permissions(request):
    """
    Get all roles and their default permissions
    
    GET /api/v1/cabinets/roles/permissions/
    """
    roles_data = []
    for role, permissions in DEFAULT_ROLE_PERMISSIONS.items():
        roles_data.append({
            'role': role,
            'permissions': permissions
        })
    
    return response.Response(roles_data)

