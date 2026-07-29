# chat/views.py
from types import SimpleNamespace

from rest_framework import serializers, viewsets, permissions, response, decorators, status
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import models
from django.db.models import Q, Max, OuterRef, Count, Value, IntegerField, Subquery
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from cabinets.permissions import HasConversationsPermission
from cases.models import Case
from core.utils import get_user_cabinet
from .icons import SUGGESTED_GROUP_ICONS
from .models import (
    Conversation,
    ConversationMembership,
    DeliveryReceipt,
    Message,
    MessagePin,
    ReadReceipt,
)
from .serializers import ConversationSerializer, MessageSerializer, UserThinSerializer
from django.utils import timezone

User = get_user_model()


def _message_queryset_with_shares():
    return Message.objects.select_related(
        "sender",
        "forwarded_from",
        "shared_case",
        "shared_task",
        "shared_appointment",
        "shared_case__assigned_to",
        "shared_task__assigned_to",
        "shared_task__case",
        "shared_appointment__created_by",
        "shared_appointment__case",
    )


def create_message_from_websocket_payload(user, payload: dict):
    """
    Create a chat message from a WebSocket payload (same rules as REST).
    Returns (message, None) on success or (None, err_dict) on failure.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return None, {"detail": "Authentication required."}
    data = {k: v for k, v in payload.items() if k != "type"}
    conv_id = data.pop("conversationId", None) or data.pop("conversation_id", None)
    if conv_id is None:
        return None, {"detail": "conversation_id is required"}
    try:
        conv_id = int(conv_id)
    except (TypeError, ValueError):
        return None, {"detail": "Invalid conversation id."}
    conv = Conversation.objects.filter(pk=conv_id).first()
    if not conv:
        return None, {"detail": "Conversation not found."}
    if not ConversationMembership.objects.filter(
        conversation=conv, user=user, is_deleted=False
    ).exists():
        return None, {"detail": "Forbidden."}
    data["conversation"] = conv_id
    if "content" in data and "body" not in data:
        data["body"] = data.get("content") or ""
    req = SimpleNamespace(user=user)
    ser = MessageSerializer(data=data, context={"request": req})
    if not ser.is_valid():
        return None, ser.errors
    msg = ser.save()
    return msg, None


def _record_delivery_and_broadcast(messages, user_id):
    """Record delivery for messages and broadcast message.updated for new deliveries."""
    channel_layer = get_channel_layer()
    for msg in messages:
        _, created = DeliveryReceipt.objects.get_or_create(
            message=msg, user_id=user_id, defaults={}
        )
        if created and channel_layer:
            msg = (
                _message_queryset_with_shares()
                .filter(pk=msg.pk)
                .select_related("conversation")
                .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
                .first()
            )
            if msg:
                data = MessageSerializer(msg, context={"request": None}).data
                async_to_sync(channel_layer.group_send)(
                    f"conv-{msg.conversation_id}",
                    {"type": "message.updated", "payload": data},
                )
                for p in msg.conversation.participants.values_list("id", flat=True):
                    async_to_sync(channel_layer.group_send)(
                        f"user-{p}",
                        {"type": "message.updated", "payload": data},
                    )


def _broadcast_messages_updated(messages):
    """Broadcast message.updated for each message to conversation and all participants."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    for msg in messages:
        msg = (
            _message_queryset_with_shares()
            .filter(pk=msg.pk)
            .select_related("conversation")
            .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
            .first()
        )
        if msg:
            data = MessageSerializer(msg, context={"request": None}).data
            async_to_sync(channel_layer.group_send)(
                f"conv-{msg.conversation_id}",
                {"type": "message.updated", "payload": data},
            )
            for p in msg.conversation.participants.values_list("id", flat=True):
                async_to_sync(channel_layer.group_send)(
                    f"user-{p}",
                    {"type": "message.updated", "payload": data},
                )


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


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasConversationsPermission]
    serializer_class = MessageSerializer

    def get_queryset(self):
        return (
            _message_queryset_with_shares()
            .filter(conversation__memberships__user=self.request.user)
            .select_related("conversation")
            .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
        )

    def perform_create(self, serializer):
        conv = serializer.validated_data["conversation"]
        if not ConversationMembership.objects.filter(
            conversation=conv, user=self.request.user, is_deleted=False
        ).exists():
            raise PermissionDenied("You are not a participant in this conversation.")
        serializer.save()

    def _ensure_participant(self, message: Message) -> bool:
        return ConversationMembership.objects.filter(
            conversation=message.conversation, user=self.request.user, is_deleted=False
        ).exists()

    def _ensure_sender(self, message: Message) -> bool:
        return message.sender_id == self.request.user.id

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._ensure_sender(instance):
            return response.Response(
                {"detail": "Only the sender can edit this message."}, status=403
            )
        if instance.is_deleted:
            return response.Response(
                {"detail": "Cannot edit a deleted message."}, status=400
            )
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(edited_at=timezone.now())
        return response.Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._ensure_sender(instance):
            return response.Response(
                {"detail": "Only the sender can delete this message."}, status=403
            )
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.body = ""
        instance.save(update_fields=["is_deleted", "deleted_at", "body", "modified"])
        return response.Response(status=204)

    @decorators.action(detail=True, methods=["POST"], url_path="forward")
    def forward(self, request, pk=None):
        """Forward this message to another conversation. Creates new message with forwarded_from."""
        source = get_object_or_404(Message, pk=pk)
        if not self._ensure_participant(source):
            return response.Response({"detail": "Forbidden"}, status=403)

        target_conv_id = (request.data or {}).get("target_conversation_id") or (
            request.data or {}
        ).get("conversation_id")
        if not target_conv_id:
            return response.Response(
                {"detail": "target_conversation_id is required"}, status=400
            )

        target_conv = get_object_or_404(Conversation, pk=target_conv_id)
        if not ConversationMembership.objects.filter(
            conversation=target_conv, user=request.user, is_deleted=False
        ).exists():
            return response.Response({"detail": "Forbidden"}, status=403)

        # Create forwarded message (body + forwarded_from; attachments not copied by default)
        forwarded = Message.objects.create(
            conversation=target_conv,
            sender=request.user,
            body=source.body if not source.is_deleted else "",
            forwarded_from=source,
        )
        return response.Response(
            MessageSerializer(forwarded, context={"request": request}).data,
            status=201,
        )

    @decorators.action(detail=True, methods=["POST"], url_path="pin")
    def pin(self, request, pk=None):
        """Pin or unpin this message for the current user."""
        message = self.get_object()
        if not self._ensure_participant(message):
            return response.Response({"detail": "Forbidden"}, status=403)

        pinned = (request.data or {}).get("pinned", (request.data or {}).get("isPinned", True))
        pinned = bool(pinned)

        if pinned:
            MessagePin.objects.get_or_create(message=message, user=request.user)
        else:
            MessagePin.objects.filter(message=message, user=request.user).delete()

        # Broadcast to all participants so they see the pin/unpin in real time
        message = (
            _message_queryset_with_shares()
            .filter(pk=message.pk)
            .prefetch_related("attachments", "pinned_by", "deliveries", "read_by")
            .first()
        )
        channel_layer = get_channel_layer()
        if channel_layer:
            message_data = MessageSerializer(message, context={"request": request}).data
            event = {"type": "message.updated", "payload": message_data}
            # 1) Conversation channel - for users connected to ws/conversation/{id}
            async_to_sync(channel_layer.group_send)(
                f"conv-{message.conversation_id}",
                event,
            )
            # 2) Each participant's user channel - for users connected to ws/chat/
            for participant in message.conversation.participants.all():
                async_to_sync(channel_layer.group_send)(
                    f"user-{participant.id}",
                    event,
                )

        return response.Response(
            {"status": "pinned" if pinned else "unpinned"},
            status=200,
        )

    @decorators.action(detail=True, methods=["POST"])
    def mark_read(self, request, pk=None):
        """Mark a specific message (and all before it) as read. Broadcasts for read receipt updates."""
        message = get_object_or_404(Message, pk=pk)

        if not ConversationMembership.objects.filter(
            conversation=message.conversation, user=request.user
        ).exists():
            return response.Response({"detail": "Forbidden"}, status=403)

        to_mark = list(
            message.conversation.messages.filter(
                created__lte=message.created
            ).exclude(read_by=request.user)
        )
        for msg in to_mark:
            msg.read_by.add(request.user)

        _broadcast_messages_updated(to_mark)
        return response.Response({"status": "marked as read"})
    
    # def create(self, request, *args, **kwargs):
    #     conversation_id = request.data.get('conversation_id')
    #     content = request.data.get('content', '').strip()
        
    #     if not content:
    #         return response.Response({"detail": "Message content is required"}, status=400)
        
    #     # Verify user is a member of the conversation
    #     conv = get_object_or_404(Conversation, pk=conversation_id)
    #     if not ConversationMembership.objects.filter(conversation=conv, user=request.user).exists():
    #         return response.Response({"detail": "Forbidden"}, status=403)
        
    #     # Create the message
    #     message = Message.objects.create(
    #         conversation=conv,
    #         sender=request.user,
    #         body=content
    #     )
        
    #     # Mark as read for sender
    #     membership = ConversationMembership.objects.get(conversation=conv, user=request.user)
    #     membership.last_read_at = timezone.now()
    #     membership.save()
        
    #     return response.Response(
    #         MessageSerializer(message, context={'request': request}).data,
    #         status=status.HTTP_201_CREATED
    #     )
    
    def list(self, request, *args, **kwargs):
        conversation_id = request.query_params.get("conversation_id")
        if not conversation_id:
            return response.Response({"detail": "conversation_id is required"}, status=400)

        conv = get_object_or_404(Conversation, pk=conversation_id)
        if not ConversationMembership.objects.filter(
            conversation=conv, user=request.user
        ).exists():
            return response.Response({"detail": "Forbidden"}, status=403)

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
