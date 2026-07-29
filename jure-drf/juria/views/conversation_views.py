from django.db.models import OuterRef, Subquery
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cases.models import Case
from core.utils import get_user_cabinet, NumericPagination

from juria.models import JuriaConversation, JuriaMessage
from juria.serializers.conversation_serializer import (
    JuriaConversationCreateSerializer,
    JuriaConversationDetailSerializer,
    JuriaConversationListSerializer,
)
from juria.views.mixins import JuriaEnabledMixin


def get_case_for_user(user, case_id: int | None) -> Case | None:
    if case_id is None:
        return None
    cab = get_user_cabinet(user)
    if not cab:
        return None
    try:
        return Case.objects.get(pk=case_id, cabinet=cab)
    except Case.DoesNotExist:
        return None


class JuriaConversationListCreateView(JuriaEnabledMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = NumericPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return JuriaConversationCreateSerializer
        return JuriaConversationListSerializer

    def get_queryset(self):
        user = self.request.user
        last_sub = (
            JuriaMessage.objects.filter(conversation_id=OuterRef("pk"))
            .order_by("-created_at")
            .values("content")[:1]
        )
        qs = (
            JuriaConversation.objects.filter(user=user)
            .annotate(last_preview=Subquery(last_sub))
            .order_by("-updated_at")
        )
        p = self.request.query_params
        lc = p.get("linked_case")
        if lc is not None and str(lc).strip() != "":
            try:
                qs = qs.filter(linked_case_id=int(lc))
            except (TypeError, ValueError):
                pass
        mode = p.get("mode")
        if mode:
            qs = qs.filter(mode=mode.upper())
        ar = p.get("is_archived")
        if ar is not None:
            v = str(ar).lower()
            if v in ("true", "1", "yes"):
                qs = qs.filter(is_archived=True)
            elif v in ("false", "0", "no"):
                qs = qs.filter(is_archived=False)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        linked_id = serializer.validated_data.pop("linked_case_id", None)
        case = get_case_for_user(user, linked_id)
        if linked_id is not None and case is None:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"linked_case_id": "Case not found or not accessible."})
        title = serializer.validated_data.get("title") or ""
        serializer.save(
            user=user,
            linked_case=case,
            title=title.strip(),
        )


class JuriaConversationDetailDestroyView(JuriaEnabledMixin, generics.RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = JuriaConversationDetailSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return JuriaConversation.objects.filter(user=self.request.user).prefetch_related("messages")

    def perform_destroy(self, instance: JuriaConversation):
        instance.is_archived = True
        instance.save(update_fields=["is_archived", "updated_at"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
