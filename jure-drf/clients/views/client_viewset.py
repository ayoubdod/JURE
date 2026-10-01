import logging
import secrets

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count
from django.utils.translation import gettext as _
from rest_framework import decorators, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from cabinets.permissions import HasClientsPermission, has_permission
from core.permissions import IsCabinetMember
from core.utils import NumericPagination, get_user_cabinet
from users.models import User

from ..serializers import ClientReadSerializer, ClientWriteSerializer
from ..services import issue_client_invitation
from .helpers import _sync_client_profile

logger = logging.getLogger(__name__)


class ClientViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsCabinetMember, HasClientsPermission]
    pagination_class = NumericPagination

    def get_queryset(self):
        user: User = self.request.user
        _cabinet = user.get_owned_cabinet_or_none()
        cabinet = _cabinet if _cabinet else user.cabinet

        if not cabinet:
            return User.objects.none()

        return (
            User.objects.filter(cabinet=cabinet, is_cabinet_member=False)
            .exclude(id=cabinet.owner_id)
            .exclude(id=user.id)
            .select_related("firm_client_profile", "password_setup_token")
            .annotate(cases_count=Count("client_cases"))
            .distinct()
            .order_by("id")
        )

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return ClientReadSerializer
        return ClientWriteSerializer

    def perform_create(self, serializer):
        user: User = self.request.user
        _cabinet = user.get_owned_cabinet_or_none()
        cabinet = _cabinet if _cabinet else user.cabinet
        if not cabinet:
            raise serializers.ValidationError(
                _("You must belong to a cabinet to create clients.")
            )

        validated_data = serializer.validated_data.copy()
        # Temporary password until the client sets one via the invitation link
        password = secrets.token_urlsafe(32)

        email = validated_data.get("email", "").lower().strip()
        first_name = validated_data.get("first_name", "").strip()
        last_name = validated_data.get("last_name", "").strip()
        phone = validated_data.get("phone")
        country = validated_data.get("country", "US")
        address = validated_data.get("address", "")

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
                professional_card_number="9999",
                bar_association="N/A",
                bar_inscription_year="2024",
                accept_terms=True,
                accept_data_processing=True,
            )

            _sync_client_profile(client_user, self.request.data, create=True)
            serializer.instance = client_user

            try:
                issue_client_invitation(user=client_user, cabinet=cabinet, send_email=True)
            except Exception as e:
                if isinstance(e, DjangoValidationError):
                    msg = e.messages[0] if getattr(e, "messages", None) else str(e)
                    raise serializers.ValidationError(msg or _("Invalid email address."))
                if isinstance(e, serializers.ValidationError):
                    raise
                logger.warning(
                    "Client invitation email failed for %s: %s", client_user.email, e
                )

        except Exception as e:
            if isinstance(e, serializers.ValidationError):
                raise
            raise serializers.ValidationError(f"Error creating client: {str(e)}")

    def perform_update(self, serializer):
        serializer.save()
        _sync_client_profile(serializer.instance, self.request.data)

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        has_cabinet = (
            user.is_cabinet_member
            or user.is_cabinet_owner()
            or (hasattr(user, "cabinet") and user.cabinet)
            or (hasattr(user, "owned_cabinet") and user.owned_cabinet)
        )

        if not has_cabinet:
            return Response(
                {
                    "detail": "You must be a cabinet member or owner to perform this action."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        read_data = ClientReadSerializer(instance=serializer.instance).data
        headers = self.get_success_headers(serializer.data)
        return Response(read_data, status=status.HTTP_201_CREATED, headers=headers)

    @decorators.action(detail=True, methods=["POST"], url_path="send-invitation")
    def send_invitation(self, request, pk=None):
        """
        Send (or resend) the client portal set-password invitation email.
        Verifies the email address and replaces any previous setup token.
        """
        client = self.get_object()
        if not has_permission(request.user, "clients.edit") and not has_permission(
            request.user, "clients.create"
        ):
            return Response(
                {"detail": _("You do not have permission to invite clients.")},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not client.email:
            return Response(
                {"detail": _("This client has no email address.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cabinet = get_user_cabinet(request.user) or getattr(client, "cabinet", None)
        try:
            issue_client_invitation(user=client, cabinet=cabinet, send_email=True)
        except DjangoValidationError as e:
            msg = e.messages[0] if getattr(e, "messages", None) else str(e)
            return Response(
                {"detail": msg or _("Invalid email address.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.warning("Send client invitation SMTP failure to %s: %s", client.email, e)
            return Response(
                {"detail": _("Invitation could not be sent. Please try again later.")},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "detail": _("Invitation link has been sent to the client's email."),
                "invitation_pending": True,
            },
            status=status.HTTP_200_OK,
        )
