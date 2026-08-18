import secrets
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from core.utils import NumericPagination
from core.permissions import IsCabinetMember
from cabinets.permissions import HasClientsPermission
from users.models import User

from .models import Client
from .serializers import ClientReadSerializer, ClientWriteSerializer


def _profile_payload_from_request(data):
    """Extract optional B2B profile fields already sent by the frontend."""
    payload = {}
    if 'ice' in data:
        ice = (data.get('ice') or '').strip()
        payload['ice'] = ice or None
    if 'if' in data or 'fiscal_if' in data:
        raw = data.get('if') if 'if' in data else data.get('fiscal_if')
        payload['if_number'] = (raw or '').strip() or None
    client_type = data.get('client_type')
    if client_type in (Client.ClientType.INDIVIDUAL, Client.ClientType.COMPANY):
        payload['client_type'] = client_type
    return payload


def _sync_client_profile(user, data, *, create=False):
    defaults = _profile_payload_from_request(data)
    if create and 'client_type' not in defaults:
        defaults['client_type'] = Client.ClientType.INDIVIDUAL
    if defaults:
        Client.objects.update_or_create(user=user, defaults=defaults)
    elif create:
        Client.objects.get_or_create(user=user)


class ClientViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsCabinetMember, HasClientsPermission]
    pagination_class = NumericPagination

    def get_queryset(self):
        user: User = self.request.user
        _cabinet = user.get_owned_cabinet_or_none()
        cabinet = _cabinet if _cabinet else user.cabinet
        
        if not cabinet:
            # Return empty queryset if user doesn't belong to a cabinet
            return User.objects.none()
        
        # Get clients for the cabinet
        # Exclude: cabinet members, cabinet owner, and the current user
        clients = (
            User.objects
            .filter(cabinet=cabinet, is_cabinet_member=False)
            .exclude(id=cabinet.owner_id)  # Exclude cabinet owner
            .exclude(id=user.id)  # Exclude current user
            .select_related('firm_client_profile')
            .annotate(cases_count=Count('client_cases'))
            .distinct()
            .order_by('id')
        )
        
        return clients

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return ClientReadSerializer
        return ClientWriteSerializer

    def perform_create(self, serializer):
        user: User = self.request.user
        _cabinet = user.get_owned_cabinet_or_none()
        cabinet = _cabinet if _cabinet else user.cabinet
        if not cabinet:
            raise serializers.ValidationError("You must belong to a cabinet to create clients.")
        
        # Get validated data
        validated_data = serializer.validated_data.copy()
        
        # Generate a random password for the client
        password = secrets.token_urlsafe(12)
        
        # Set default values for required fields that are lawyer-specific
        # These fields are required by the User model but not relevant for clients
        email = validated_data.get('email', '').lower().strip()
        first_name = validated_data.get('first_name', '').strip()
        last_name = validated_data.get('last_name', '').strip()
        phone = validated_data.get('phone')
        country = validated_data.get('country', 'US')
        address = validated_data.get('address', '')
        
        # Create client user using UserManager to ensure proper creation
        try:
            client_user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                country=country,
                address=address,
                is_active=True,
                cabinet=cabinet,
                is_cabinet_member=False,
                # Set default values for lawyer-specific required fields
                professional_card_number='9999',  # Valid numeric value for clients
                bar_association='N/A',
                bar_inscription_year='2024',
                accept_terms=True,  # Clients implicitly accept terms when created by lawyer
                accept_data_processing=True,
            )
            
            _sync_client_profile(client_user, self.request.data, create=True)

            # Set the instance in serializer for response
            serializer.instance = client_user
            
        except Exception as e:
            raise serializers.ValidationError(f"Error creating client: {str(e)}")

    def perform_update(self, serializer):
        serializer.save()
        _sync_client_profile(serializer.instance, self.request.data)

    def create(self, request, *args, **kwargs):
        # Verify user has cabinet access before proceeding
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user has cabinet access
        has_cabinet = (
            user.is_cabinet_member or 
            user.is_cabinet_owner() or 
            (hasattr(user, 'cabinet') and user.cabinet) or
            (hasattr(user, 'owned_cabinet') and user.owned_cabinet)
        )
        
        if not has_cabinet:
            return Response(
                {"detail": "You must be a cabinet member or owner to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Use the created instance directly instead of querying the filtered queryset
        read_data = ClientReadSerializer(instance=serializer.instance).data
        headers = self.get_success_headers(serializer.data)
        return Response(read_data, status=status.HTTP_201_CREATED, headers=headers)
