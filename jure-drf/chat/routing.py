# chat/routing.py
from django.urls import re_path
from notifications.consumers import NotificationConsumer

from .consumers import ChatConsumer, ConversationConsumer, CallConsumer

websocket_urlpatterns = [
    # Chat consumer authenticated by httpOnly JWT cookies.
    re_path(r"^ws/chat/?$", ChatConsumer.as_asgi()),

    re_path(r"^ws/conversation/(?P<conversation_id>\d+)/?$", ConversationConsumer.as_asgi()),
    re_path(r"^ws/calls/?$", CallConsumer.as_asgi()),
    re_path(r"^ws/notifications/?$", NotificationConsumer.as_asgi()),
]
