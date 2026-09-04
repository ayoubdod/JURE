from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db.models import OuterRef, Subquery
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import decorators, permissions, response, serializers, status, viewsets

from cabinets.permissions import HasConversationsPermission
from cases.models import Case
from core.utils import get_user_cabinet

from ..icons import SUGGESTED_GROUP_ICONS
from ..models import Conversation, ConversationMembership, Message, MessagePin
from ..serializers import ConversationSerializer, MessageSerializer
from .helpers import (
    _broadcast_messages_updated,
    _message_queryset_with_shares,
    _record_delivery_and_broadcast,
)

User = get_user_model()


class IsParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return ConversationMembership.objects.filter(is_deleted=False,conversation=obj, user=request.user).exists()


class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasConversationsPermission]
    serializer_class = ConversationSerializer
    queryset = Conversation.objects.all()

    def get_permissions(self):
        if self.action in ("archive", "archive_bulk", "pin", "pin_bulk", "mark_read", "rename", "suggested_icons"):
            return [permissions.IsAuthenticated()]
        if self.action == "partial_update":
            data = getattr(self.request, "data", {}) or {}
            files = getattr(self.request, "FILES", {}) or {}
            allowed = {"archived", "is_pinned", "title", "icon_preset", "icon"}
            if set(data.keys()) | set(files.keys()) <= allowed:
                return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset().filter(
            memberships__user=self.request.user, memberships__is_deleted=False
        )
        # Exclude archived by default for LIST only (detail actions need to find archived too)
        if self.action == "list" and not self.request.query_params.get("include_archived"):
            qs = qs.filter(memberships__archived=False)
        # Multiple memberships__ filters add JOINs that can duplicate rows
        qs = qs.distinct().select_related("linked_case")
        # Annotate with current user's membership for ordering
        membership = ConversationMembership.objects.filter(
            conversation=OuterRef("pk"), user=self.request.user, is_deleted=False
        )
        qs = qs.annotate(
            _is_pinned=Subquery(membership.values("is_pinned")[:1]),
            _last_activity=Subquery(
                Message.objects.filter(conversation=OuterRef("pk")).order_by("-created").values("created")[:1]
            ),
        )
        # Order: pinned first, then by most recent activity
        return qs.order_by("-_is_pinned", "-_last_activity", "-created")

    def destroy(self, request, *args, **kwargs):
        
        conversation : Conversation = self.get_object()
        # return super().destroy(request, *args, **kwargs)

        user: User = request.user


        if conversation.participants.contains(user):

            if conversation.participants.count() > 1:

                ConversationMembership.objects.filter(conversation=conversation, user=user).update(is_deleted=True)
                return response.Response({"detail": "Conversation membership deleted"}, status=204)

            return super().destroy(request, *args, **kwargs)

        raise serializers.ValidationError("You cannot delete a conversation you are a participant of")

    def partial_update(self, request, *args, **kwargs):
        """Support PATCH with archived/is_pinned - update membership, title - rename group."""
        instance = self.get_object()
        data = request.data or {}
        archived = data.get("archived", data.get("isArchived"))  # support camelCase
        is_pinned = data.get("is_pinned", data.get("isPinned"))
        title = data.get("title")
        if archived is not None or is_pinned is not None:
            membership = ConversationMembership.objects.filter(
                conversation=instance, user=request.user, is_deleted=False
            ).first()
            if membership:
                if archived is not None:
                    membership.archived = bool(archived)
                if is_pinned is not None:
                    membership.is_pinned = bool(is_pinned)
                membership.save(update_fields=["archived", "is_pinned"])
        if title is not None:
            if instance.type != Conversation.Type.GROUP:
                return response.Response(
                    {"detail": "Only group conversations can be renamed."}, status=400
                )
            instance.title = str(title)[:255]
            instance.save(update_fields=["title"])
            self._broadcast_conversation_updated(instance)

        icon_preset = data.get("icon_preset")
        icon_file = (request.FILES or {}).get("icon") or (request.FILES or {}).get("icon_image")
        if icon_preset is not None or icon_file is not None:
            if instance.type != Conversation.Type.GROUP:
                return response.Response(
                    {"detail": "Only group conversations can have an icon."}, status=400
                )
            if icon_file is not None:
                if instance.icon_image:
                    instance.icon_image.delete(save=False)
                instance.icon_image = icon_file
                instance.icon_preset = ""
                instance.save(update_fields=["icon_image", "icon_preset"])
            elif icon_preset is not None:
                instance.icon_preset = str(icon_preset)[:50]
                if instance.icon_image:
                    instance.icon_image.delete(save=False)
                    instance.icon_image = None
                instance.save(update_fields=["icon_preset", "icon_image"])
            self._broadcast_conversation_updated(instance)

        data = {k: v for k, v in (request.data or {}).items() if k not in ("archived", "is_pinned", "title", "icon_preset", "icon")}
        if data:
            serializer = self.get_serializer(instance, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
        return response.Response(self.get_serializer(instance).data)

    def _broadcast_conversation_updated(self, conv: Conversation):
        """Broadcast conversation update (e.g. rename) to all participants."""
        channel_layer = get_channel_layer()
        if channel_layer:
            payload = ConversationSerializer(conv, context={"request": self.request}).data
            event = {"type": "conversation.updated", "payload": payload}
            async_to_sync(channel_layer.group_send)(f"conv-{conv.pk}", event)
            for participant in conv.participants.all():
                async_to_sync(channel_layer.group_send)(f"user-{participant.id}", event)

    @decorators.action(detail=True, methods=["GET"], url_path="pinned-messages")
    def pinned_messages(self, request, pk=None):
        """List messages pinned in this conversation (visible to all participants)."""
        conv = get_object_or_404(Conversation, pk=pk)
        if not ConversationMembership.objects.filter(
            conversation=conv, user=request.user, is_deleted=False
        ).exists():
            return response.Response({"detail": "Forbidden"}, status=403)

        pinned_ids = MessagePin.objects.filter(message__conversation=conv).values_list(
            "message_id", flat=True
        ).distinct()
        messages = (
            _message_queryset_with_shares()
            .filter(id__in=pinned_ids)
            .order_by("-sent_at")
            .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
        )

        return response.Response(
            MessageSerializer(messages, many=True, context={"request": request}).data
        )

    @decorators.action(detail=True, methods=["GET", "POST"])
    def messages(self, request, pk=None):
        conv = get_object_or_404(Conversation, pk=pk)
        if not ConversationMembership.objects.filter(conversation=conv, user=request.user).exists():
            return response.Response({"detail": "Forbidden"}, status=403)

        if request.method == "POST":
            if not ConversationMembership.objects.filter(
                conversation=conv, user=request.user, is_deleted=False
            ).exists():
                return response.Response({"detail": "Forbidden"}, status=403)
            data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
            data["conversation"] = conv.id
            ser = MessageSerializer(data=data, context={"request": request})
            ser.is_valid(raise_exception=True)
            ser.save()
            return response.Response(ser.data, status=status.HTTP_201_CREATED)

        limit = int(request.query_params.get("limit", 50))
        before_id = request.query_params.get("before_id")

        qs = (
            _message_queryset_with_shares()
            .filter(conversation=conv)
            .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
        )
        if before_id:
            qs = qs.filter(id__lt=before_id)

        qs = qs.order_by("-id")[:limit]
        messages = list(qs)
        messages.reverse()

        # Record delivery for messages not from current user
        _record_delivery_and_broadcast(
            [m for m in messages if m.sender_id != request.user.id],
            request.user.id,
        )

        return response.Response(
            MessageSerializer(messages, many=True, context={"request": request}).data
        )

    @decorators.action(detail=True, methods=["POST"])
    def mark_read(self, request, pk=None):
        conv = get_object_or_404(Conversation, pk=pk)
        if not ConversationMembership.objects.filter(
            conversation=conv, user=request.user, is_deleted=False
        ).exists():
            return response.Response({"detail": "Forbidden"}, status=403)

        # Mark all unread messages in this conversation as read (using read_by M2M)
        unread_messages = list(
            Message.objects.filter(conversation=conv).exclude(read_by=request.user)
        )
        for msg in unread_messages:
            msg.read_by.add(request.user)

        # Broadcast message.updated so senders see read_count increase (blue check)
        _broadcast_messages_updated(unread_messages)

        return response.Response({"status": "marked as read"})

    def _get_conversation_for_member_action(self, request, pk):
        """Get conversation for archive/pin - includes archived (user must be member, not deleted)."""
        if pk is None:
            return None, "Conversation ID required"
        conv = Conversation.objects.filter(
            memberships__user=request.user,
            memberships__is_deleted=False,
            pk=pk,
        ).first()
        if not conv:
            return None, "Conversation not found"
        membership = ConversationMembership.objects.get(
            conversation=conv, user=request.user, is_deleted=False
        )
        return membership, None

    @decorators.action(detail=False, methods=["POST"], url_path="archive")
    def archive_bulk(self, request):
        """POST /conversations/archive/ with body {conversation_id: N, archived: true}"""
        conv_id = (request.data or {}).get("conversation_id") or (request.data or {}).get("id")
        if conv_id is None:
            return response.Response({"detail": "conversation_id required"}, status=400)
        membership, err = self._get_conversation_for_member_action(request, conv_id)
        if err:
            return response.Response({"detail": err}, status=404 if "not found" in err else 400)
        archived = (request.data or {}).get("archived", (request.data or {}).get("isArchived", True))
        membership.archived = bool(archived)
        membership.save(update_fields=["archived"])
        return response.Response({"status": "archived" if archived else "unarchived"})

    @decorators.action(detail=True, methods=["POST"])
    def archive(self, request, pk=None):
        pk = pk or (getattr(request, "resolver_match", None) and request.resolver_match.kwargs.get("pk"))
        if pk is None:
            return response.Response({"detail": "Conversation ID required"}, status=400)
        membership, err = self._get_conversation_for_member_action(request, pk)
        if err:
            return response.Response({"detail": err}, status=404 if "not found" in err else 400)
        data = request.data or {}
        archived = data.get("archived", data.get("isArchived", True))
        membership.archived = bool(archived)
        membership.save(update_fields=["archived"])
        return response.Response({"status": "archived" if archived else "unarchived"})

    @decorators.action(detail=False, methods=["POST"], url_path="pin")
    def pin_bulk(self, request):
        """POST /conversations/pin/ with body {conversation_id: N, pinned: true}"""
        conv_id = (request.data or {}).get("conversation_id") or (request.data or {}).get("id")
        if conv_id is None:
            return response.Response({"detail": "conversation_id required"}, status=400)
        membership, err = self._get_conversation_for_member_action(request, conv_id)
        if err:
            return response.Response({"detail": err}, status=404 if "not found" in err else 400)
        pinned = (request.data or {}).get("pinned", (request.data or {}).get("isPinned", True))
        membership.is_pinned = bool(pinned)
        membership.save(update_fields=["is_pinned"])
        return response.Response({"status": "pinned" if pinned else "unpinned"})

    @decorators.action(detail=True, methods=["POST"])
    def pin(self, request, pk=None):
        pk = pk or (getattr(request, "resolver_match", None) and request.resolver_match.kwargs.get("pk"))
        if pk is None:
            return response.Response({"detail": "Conversation ID required"}, status=400)
        membership, err = self._get_conversation_for_member_action(request, pk)
        if err:
            return response.Response({"detail": err}, status=404 if "not found" in err else 400)
        data = request.data or {}
        pinned = data.get("pinned", data.get("isPinned", True))
        membership.is_pinned = bool(pinned)
        membership.save(update_fields=["is_pinned"])
        return response.Response({"status": "pinned" if pinned else "unpinned"})

    @decorators.action(detail=False, methods=["GET"], url_path="suggested-icons")
    def suggested_icons(self, request):
        """Return list of suggested group chat icons (preset emoji)."""
        return response.Response(SUGGESTED_GROUP_ICONS)

    @decorators.action(detail=True, methods=["POST"])
    def rename(self, request, pk=None):
        """Rename a group conversation. POST /conversations/{id}/rename/ with body { title: 'New Name' }"""
        conv = self.get_object()
        if conv.type != Conversation.Type.GROUP:
            return response.Response(
                {"detail": "Only group conversations can be renamed."}, status=400
            )
        title = (request.data or {}).get("title") or (request.data or {}).get("name")
        if title is None:
            return response.Response({"detail": "title is required"}, status=400)
        conv.title = str(title)[:255]
        conv.save(update_fields=["title"])
        self._broadcast_conversation_updated(conv)
        return response.Response(self.get_serializer(conv).data)

    @decorators.action(detail=True, methods=["post", "delete"], url_path="link-case")
    def link_case(self, request, pk=None):
        conv = self.get_object()
        if conv.type != Conversation.Type.GROUP:
            return response.Response(
                {"detail": "Only group conversations support a linked case."}, status=400
            )
        if request.method == "POST":
            case_id = (request.data or {}).get("caseId") or (request.data or {}).get("case_id")
            if case_id is None:
                return response.Response({"detail": "caseId is required"}, status=400)
            case = Case.objects.filter(pk=case_id).first()
            if not case:
                return response.Response({"detail": "Case not found."}, status=404)
            cab = get_user_cabinet(request.user)
            if not cab or case.cabinet_id != cab.id:
                return response.Response({"detail": "Case not found."}, status=404)
            conv.linked_case = case
            conv.linked_case_at = timezone.now()
            conv.save(update_fields=["linked_case", "linked_case_at", "modified"])
            return response.Response(self.get_serializer(conv).data)
        conv.linked_case = None
        conv.linked_case_at = None
        conv.save(update_fields=["linked_case", "linked_case_at", "modified"])
        return response.Response(self.get_serializer(conv).data)
