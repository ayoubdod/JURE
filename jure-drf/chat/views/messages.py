from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.exceptions import PermissionDenied

from cabinets.permissions import HasConversationsPermission

from ..models import Conversation, ConversationMembership, Message, MessagePin
from ..serializers import MessageSerializer
from .helpers import (
    _broadcast_messages_updated,
    _message_queryset_with_shares,
    _record_delivery_and_broadcast,
)


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
