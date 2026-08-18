import logging

from rest_framework import mixins, permissions, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .mail import contact_inbox, send_landing_inquiry_emails
from .models import Activity, Contact, Function, Tag
from .serializers import (
    ActivitySerializer,
    ContactSerializer,
    FunctionSerializer,
    TagSerializer,
)

logger = logging.getLogger(__name__)


class LandingInquiryThrottle(AnonRateThrottle):
    rate = "8/hour"


class ContactViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LandingInquiryThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        locale = request.data.get("locale") or request.LANGUAGE_CODE
        try:
            send_landing_inquiry_emails(instance, locale=locale)
        except Exception:
            logger.exception("Failed to email landing inquiry to %s", contact_inbox())
            return Response(
                {
                    "detail": (
                        "We could not deliver your message. "
                        f"Please email {contact_inbox()} directly."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ActivityViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [AllowAny]


class FunctionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Function.objects.all()
    serializer_class = FunctionSerializer
    permission_classes = [AllowAny]


class TagViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
