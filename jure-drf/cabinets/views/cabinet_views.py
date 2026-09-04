from rest_framework import response, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from core.utils import get_user_cabinet

from ..serializers import CabinetSerializer


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_cabinet(request):
    """
    Get or update the current user's cabinet (for cabinet owners/members).
    
    GET  /api/v1/cabinets/me/ - Get cabinet profile
    PATCH /api/v1/cabinets/me/ - Update cabinet (logo, trade_name, etc.)
    
    Use multipart/form-data for PATCH when uploading a new logo.
    """
    cabinet = get_user_cabinet(request.user)
    if not cabinet:
        return response.Response(
            {'detail': 'You do not belong to a cabinet.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Only cabinet owners can update
    if request.method == 'PATCH' and cabinet.owner_id != request.user.id:
        return response.Response(
            {'detail': 'Only the cabinet owner can update the cabinet profile.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == 'GET':
        serializer = CabinetSerializer(cabinet)
        data = serializer.data
        # Build absolute URL for logo
        if data.get('logo') and request:
            data['logo'] = request.build_absolute_uri(data['logo'])
        return response.Response(data)
    
    # PATCH
    serializer = CabinetSerializer(cabinet, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    data = serializer.data
    if data.get('logo') and request:
        data['logo'] = request.build_absolute_uri(data['logo'])
    return response.Response(data)
