# chat/routing.py
from django.urls import re_path
from notifications.consumers import NotificationConsumer

from .consumers import ChatConsumer, ConversationConsumer, CallConsumer

websocket_urlpatterns = [
    # Chat consumer with JWT token authentication
    # Usage: ws://localhost:8000/ws/chat/ or ws://localhost:8000/ws/chat/?token=<jwt_token>
    re_path(r"^ws/chat/?$", ChatConsumer.as_asgi()),
    # Legacy support: ws://localhost:8000/ws/chat/<jwt_token>/
    re_path(r"^ws/chat/(?P<access_token>[^/]+)/?$", ChatConsumer.as_asgi()),
    
    re_path(r"^ws/conversation/(?P<conversation_id>\d+)/?$", ConversationConsumer.as_asgi()),
    re_path(r"^ws/calls/?$", CallConsumer.as_asgi()),
    re_path(r"^ws/notifications/?$", NotificationConsumer.as_asgi()),
]
