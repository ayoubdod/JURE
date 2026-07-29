# cabinets/views.py
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import decorators, response, status
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from users.models import User, PasswordSetupToken
from .serializers import (
    CabinetMemberSerializer,
    CabinetMemberSelectionSerializer,
    CabinetMemberCreateSerializer,
    CabinetSerializer,
)
from core.permissions import IsCabinetMember
from rest_flex_fields.views import FlexFieldsModelViewSet
from .permissions import can_manage_roles, DEFAULT_ROLE_PERMISSIONS
from django.db.models import Q
from allauth.account.models import EmailAddress

from .invitation_mailer import InvitationMailer
from core.utils import get_user_cabinet

logger = logging.getLogger(__name__)

# Default expiry for set-password link (e.g. 7 days)
PASSWORD_SETUP_TOKEN_EXPIRY_DAYS = 7

# Create your views here.
class CabinetMemberViewSet(FlexFieldsModelViewSet):
    queryset = User.objects.all()
    serializer_class = CabinetMemberSerializer
    permission_classes = [IsAuthenticated, IsCabinetMember]
    
    def get_serializer_class(self):
        """Use CabinetMemberCreateSerializer for create, CabinetMemberSerializer for other actions."""
        if self.action == 'create':
            return CabinetMemberCreateSerializer
        return CabinetMemberSerializer

    def get_queryset(self):
        """Filter queryset to show members of the current user's cabinet, including the current user."""
        user: User = self.request.user
        _cabinet = user.get_owned_cabinet_or_none()
        cabinet = _cabinet if _cabinet else user.cabinet
        
        if not cabinet:
            return User.objects.none()
        
        # Team members (cabinet FK + flag) and cabinet owner — all visible for assign / pickers, including self
        return (
            User.objects.filter(
                Q(cabinet=cabinet, is_cabinet_member=True) | Q(pk=cabinet.owner_id)
            )
            .distinct()
            .order_by('first_name', 'last_name', 'id')
        )
    
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @decorators.action(detail=False,methods=['GET'], pagination_class=None, serializer_class=CabinetMemberSelectionSerializer)
    def select_list(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)
    
    @decorators.action(detail=False,methods=['GET'])
    def get_my_cabinet_member(self, request, *args, **kwargs):

        user : User = self.request.user

        serializer = self.get_serializer(user)

        return response.Response(serializer.data)
    
    @decorators.action(detail=False,methods=['GET'], pagination_class=None)
    def all(self, request, *args, **kwargs):
        """Get all members of the cabinet (including owner)."""
        return super().list(request, *args, **kwargs)
    

    # def get_queryset(self):
        
    #     user : User = self.request.user

    #     _owned_cabinet = user.get_owned_cabinet_or_none()
        
    #     cabinet = _owned_cabinet if user.is_cabinet_owner() else user.cabinet


    #     if cabinet:
    #         return self.queryset.filter(cabinet=cabinet)

    #     return self.queryset
    
    def create(self, request, *args, **kwargs):
        # Verify user has cabinet access before proceeding
        user = request.user
        if not user.is_authenticated:
            return response.Response(
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
            return response.Response(
                {"detail": "You must be a cabinet member or owner to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Perform create - this will set serializer.instance
        self.perform_create(serializer)
        
        # Ensure instance was created
        if not serializer.instance:
            return response.Response(
                {"detail": "Failed to create team member."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Use the created instance directly
        read_data = CabinetMemberSerializer(instance=serializer.instance).data
        headers = self.get_success_headers(serializer.data)
        return response.Response(read_data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        """Create a new cabinet member (lawyer/team member)."""
        user: User = self.request.user
        _cabinet = user.get_owned_cabinet_or_none()
        cabinet = _cabinet if _cabinet else user.cabinet
        
        if not cabinet:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError("You must belong to a cabinet to create team members.")
        
        # Get validated data
        validated_data = serializer.validated_data.copy()
        
        # Unusable password until they set it via invitation link
        password = secrets.token_urlsafe(32)
        
        # Get role from request data or use default
        role = self.request.data.get('role', User.Role.VIEWER)
        if role not in [choice[0] for choice in User.Role.choices]:
            role = User.Role.VIEWER
        
        # Extract fields
        email = validated_data.get('email', '').lower().strip()
        first_name = validated_data.get('first_name', '').strip()
        last_name = validated_data.get('last_name', '').strip()
        phone = validated_data.get('phone')
        country = validated_data.get('country', 'US')
        address = validated_data.get('address', '')
        is_active = validated_data.get('is_active', True)
        
        # Create member user using UserManager
        try:
            member_user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                country=country,
                address=address,
                is_active=is_active,
                cabinet=cabinet,
                is_cabinet_member=True,  # Mark as cabinet member
                role=role,
                professional_card_number='9999',
                bar_association='N/A',
                bar_inscription_year='2024',
                accept_terms=True,
                accept_data_processing=True,
            )
            
            serializer.instance = member_user
            
            # Automatically verify the email address for team members
            email_address, created = EmailAddress.objects.get_or_create(
                user=member_user,
                email=member_user.email,
                defaults={'verified': True, 'primary': True}
            )
            if not email_address.verified:
                email_address.verified = True
                email_address.primary = True
                email_address.save()
            
            # One-time Set Password token for invitation link
            token_value = secrets.token_urlsafe(32)
            expires_at = timezone.now() + timedelta(days=PASSWORD_SETUP_TOKEN_EXPIRY_DAYS)
            PasswordSetupToken.objects.create(
                user=member_user,
                token=token_value,
                expires_at=expires_at,
            )
            
            # Trigger InvitationMailer: log SMTP failures without crashing
            try:
                InvitationMailer.send_invitation(
                    recipient_email=member_user.email,
                    token=token_value,
                    first_name=member_user.first_name or "",
                )
            except Exception as e:
                from rest_framework import serializers as drf_serializers
                from django.core.exceptions import ValidationError as DjangoValidationError
                # Invalid email: return specific error to API
                if isinstance(e, DjangoValidationError):
                    msg = e.messages[0] if getattr(e, "messages", None) else str(e)
                    raise drf_serializers.ValidationError(msg or "Invalid email address.")
                if isinstance(e, drf_serializers.ValidationError):
                    raise
                logger.warning("InvitationMailer: failed to send invitation to %s: %s", member_user.email, e)
            
        except Exception as e:
            from rest_framework import serializers as drf_serializers
            if isinstance(e, drf_serializers.ValidationError):
                raise
            raise drf_serializers.ValidationError(f"Error creating team member: {str(e)}")

    @decorators.action(detail=True, methods=["POST"], url_path="resend-invitation")
    def resend_invitation(self, request, pk=None):
        """
        Resend the set-password / invitation link to this team member's email.
        Use when the member forgot credentials and needs a new link to set their password.
        Generates a new one-time token (any previous link is invalidated) and sends the same
        welcome email with the new link.
        """
        member = self.get_object()  # 404 if not in cabinet or not found
        if member == request.user:
            return response.Response(
                {"detail": "You cannot resend an invitation to yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not can_manage_roles(request.user):
            return response.Response(
                {"detail": "You do not have permission to resend invitations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Replace any existing token with a new one
        PasswordSetupToken.objects.filter(user=member).delete()
        token_value = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(days=PASSWORD_SETUP_TOKEN_EXPIRY_DAYS)
        PasswordSetupToken.objects.create(
            user=member,
            token=token_value,
            expires_at=expires_at,
        )

        try:
            InvitationMailer.send_invitation(
                recipient_email=member.email,
                token=token_value,
                first_name=member.first_name or "",
            )
        except Exception as e:
            from django.core.exceptions import ValidationError as DjangoValidationError
            from rest_framework import serializers as drf_serializers
            if isinstance(e, DjangoValidationError):
                msg = e.messages[0] if getattr(e, "messages", None) else str(e)
                return response.Response(
                    {"detail": msg or "Invalid email address."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            logger.warning("Resend invitation: SMTP failure to %s: %s", member.email, e)
            return response.Response(
                {"detail": "Invitation could not be sent. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return response.Response(
            {"detail": "Invitation link has been sent to the member's email."},
            status=status.HTTP_200_OK,
        )


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
