from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from juria.serializers.artifact_serializer import JuriaActivitySerializer
from juria.services.permissions import get_project_for_user
from juria.views.mixins import JuriaEnabledMixin


class JuriaProjectActivityView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        rows = access.project.activities.select_related("actor")[:200]
        return Response(JuriaActivitySerializer(rows, many=True, context={"request": request}).data)
