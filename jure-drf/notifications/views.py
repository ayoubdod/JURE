from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import Notification
from notifications.serializers import NotificationSerializer
from notifications.services.notification_service import get_unread_count, mark_all_as_read, mark_as_read


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "per_page"
    max_page_size = 100


class NotificationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user).select_related(
            "related_case",
            "related_task",
            "related_appointment",
            "related_user",
        )
        p = self.request.query_params
        if p.get("is_read") is not None:
            v = str(p.get("is_read")).lower()
            if v in ("true", "1", "yes"):
                qs = qs.filter(is_read=True)
            elif v in ("false", "0", "no"):
                qs = qs.filter(is_read=False)
        t = p.get("type")
        if t:
            qs = qs.filter(notification_type=t)
        pr = p.get("priority")
        if pr:
            qs = qs.filter(priority=pr.upper())
        return qs


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"count": get_unread_count(request.user.id)})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        n = get_object_or_404(Notification, pk=pk, recipient=request.user)
        mark_as_read(n.id, request.user.id)
        n.refresh_from_db()
        return Response(
            {
                "id": n.id,
                "is_read": n.is_read,
                "read_at": n.read_at,
            }
        )


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        n = mark_all_as_read(request.user.id)
        return Response({"marked_count": n})


class NotificationDestroyView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Notification.objects.all()

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
