from django.urls import path

from juria.views.activity_views import JuriaProjectActivityView
from juria.views.artifact_views import (
    JuriaArtifactCompareView,
    JuriaArtifactDetailView,
    JuriaArtifactDuplicateView,
    JuriaArtifactExportView,
    JuriaProjectArtifactListCreateView,
)
from juria.views.conversation_views import (
    JuriaConversationDetailDestroyView,
    JuriaConversationListCreateView,
)
from juria.views.document_views import (
    JuriaConversationDraftView,
    JuriaGeneratedDocumentDownloadView,
)
from juria.views.file_views import (
    JuriaProjectFileDetailView,
    JuriaProjectFileDownloadView,
    JuriaProjectFileListCreateView,
)
from juria.views.message_views import JuriaConversationMessageCreateView
from juria.views.project_views import (
    JuriaProjectArchiveView,
    JuriaProjectCaseOptionsView,
    JuriaProjectContextView,
    JuriaProjectDetailView,
    JuriaProjectDuplicateView,
    JuriaProjectListCreateView,
    JuriaProjectMemberDetailView,
    JuriaProjectMemberListView,
    JuriaProjectPermissionView,
    JuriaProjectRestoreView,
    JuriaProjectSourceDetailView,
    JuriaProjectSourceListView,
)
from juria.views.thread_message_views import (
    JuriaMessageDeleteView,
    JuriaMessageEditView,
    JuriaThreadMessageListCreateView,
)
from juria.views.thread_views import JuriaThreadDetailView, JuriaThreadListCreateView
from juria.views.lookup_views import (
    JuriaLookupCaseDocumentsView,
    JuriaLookupCasesView,
    JuriaLookupLibraryView,
)
from juria.views.usage_views import JuriaUsageView

urlpatterns = [
    path("projects/", JuriaProjectListCreateView.as_view(), name="juria-project-list"),
    path("projects/<uuid:pk>/", JuriaProjectDetailView.as_view(), name="juria-project-detail"),
    path("projects/<uuid:pk>/archive/", JuriaProjectArchiveView.as_view(), name="juria-project-archive"),
    path("projects/<uuid:pk>/restore/", JuriaProjectRestoreView.as_view(), name="juria-project-restore"),
    path("projects/<uuid:pk>/duplicate/", JuriaProjectDuplicateView.as_view(), name="juria-project-duplicate"),
    path("projects/<uuid:pk>/context/", JuriaProjectContextView.as_view(), name="juria-project-context"),
    path("projects/<uuid:pk>/permissions/", JuriaProjectPermissionView.as_view(), name="juria-project-permissions"),
    path("projects/<uuid:pk>/members/", JuriaProjectMemberListView.as_view(), name="juria-project-members"),
    path(
        "projects/<uuid:pk>/members/<uuid:member_id>/",
        JuriaProjectMemberDetailView.as_view(),
        name="juria-project-member-detail",
    ),
    path("projects/<uuid:pk>/sources/", JuriaProjectSourceListView.as_view(), name="juria-project-sources"),
    path(
        "projects/<uuid:pk>/sources/<uuid:source_id>/",
        JuriaProjectSourceDetailView.as_view(),
        name="juria-project-source-detail",
    ),
    path("projects/<uuid:pk>/cases/", JuriaProjectCaseOptionsView.as_view(), name="juria-project-cases"),
    path("projects/<uuid:pk>/files/", JuriaProjectFileListCreateView.as_view(), name="juria-project-files"),
    path("projects/<uuid:pk>/files/<uuid:file_id>/", JuriaProjectFileDetailView.as_view(), name="juria-project-file-detail"),
    path(
        "projects/<uuid:pk>/files/<uuid:file_id>/download/",
        JuriaProjectFileDownloadView.as_view(),
        name="juria-project-file-download",
    ),
    path("projects/<uuid:pk>/artifacts/", JuriaProjectArtifactListCreateView.as_view(), name="juria-project-artifacts"),
    path(
        "projects/<uuid:pk>/artifacts/<uuid:artifact_id>/",
        JuriaArtifactDetailView.as_view(),
        name="juria-artifact-detail",
    ),
    path(
        "projects/<uuid:pk>/artifacts/<uuid:artifact_id>/duplicate/",
        JuriaArtifactDuplicateView.as_view(),
        name="juria-artifact-duplicate",
    ),
    path(
        "projects/<uuid:pk>/artifacts/<uuid:artifact_id>/export/",
        JuriaArtifactExportView.as_view(),
        name="juria-artifact-export",
    ),
    path(
        "projects/<uuid:pk>/artifacts/<uuid:artifact_id>/compare/",
        JuriaArtifactCompareView.as_view(),
        name="juria-artifact-compare",
    ),
    path("projects/<uuid:pk>/activity/", JuriaProjectActivityView.as_view(), name="juria-project-activity"),
    path("projects/<uuid:project_id>/threads/", JuriaThreadListCreateView.as_view(), name="juria-thread-list"),
    path("threads/<uuid:thread_id>/", JuriaThreadDetailView.as_view(), name="juria-thread-detail"),
    path(
        "threads/<uuid:thread_id>/messages/",
        JuriaThreadMessageListCreateView.as_view(),
        name="juria-thread-messages",
    ),
    path("messages/<uuid:message_id>/edit/", JuriaMessageEditView.as_view(), name="juria-message-edit"),
    path("messages/<uuid:message_id>/", JuriaMessageDeleteView.as_view(), name="juria-message-delete"),
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
    path("lookup/cases/", JuriaLookupCasesView.as_view(), name="juria-lookup-cases"),
    path("lookup/case-documents/", JuriaLookupCaseDocumentsView.as_view(), name="juria-lookup-case-documents"),
    path("lookup/library/", JuriaLookupLibraryView.as_view(), name="juria-lookup-library"),
    path("usage/", JuriaUsageView.as_view(), name="juria-usage"),
]
