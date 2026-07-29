# chat/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, MessageViewSet

router = DefaultRouter()
router.register("conversations", ConversationViewSet, basename="chat-conversations")
router.register("messages", MessageViewSet, basename="chat-messages")

# Explicit paths for bulk archive/pin - must come BEFORE router so they match
# before the detail route (which would match "archive"/"pin" as pk)
urlpatterns = [
    path(
        "conversations/suggested-icons/",
        ConversationViewSet.as_view(actions={"get": "suggested_icons"}),
        name="conversations-suggested-icons",
    ),
    path(
        "conversations/archive/",
        ConversationViewSet.as_view(actions={"post": "archive_bulk"}),
        name="conversations-archive-bulk",
    ),
    path(
        "conversations/pin/",
        ConversationViewSet.as_view(actions={"post": "pin_bulk"}),
        name="conversations-pin-bulk",
    ),
    path("", include(router.urls)),
]
