from django.urls import path

from juria.views.conversation_views import (
    JuriaConversationDetailDestroyView,
    JuriaConversationListCreateView,
)
from juria.views.document_views import (
    JuriaConversationDraftView,
    JuriaGeneratedDocumentDownloadView,
)
from juria.views.message_views import JuriaConversationMessageCreateView
from juria.views.usage_views import JuriaUsageView

urlpatterns = [
    path("conversations/", JuriaConversationListCreateView.as_view(), name="juria-conversation-list"),
    path(
        "conversations/<uuid:pk>/",
        JuriaConversationDetailDestroyView.as_view(),
        name="juria-conversation-detail",
    ),
    path(
        "conversations/<uuid:conversation_id>/messages/",
        JuriaConversationMessageCreateView.as_view(),
        name="juria-conversation-messages",
    ),
    path(
        "conversations/<uuid:conversation_id>/draft/",
        JuriaConversationDraftView.as_view(),
        name="juria-conversation-draft",
    ),
    path(
        "documents/<uuid:message_id>/download/",
        JuriaGeneratedDocumentDownloadView.as_view(),
        name="juria-document-download",
    ),
    path("usage/", JuriaUsageView.as_view(), name="juria-usage"),
]
