from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from juria.models import JuriaUsage
from juria.views.mixins import JuriaEnabledMixin


class JuriaUsageView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        year, month = now.year, now.month
        row, _ = JuriaUsage.objects.get_or_create(
            user=request.user,
            year=year,
            month=month,
            defaults={
                "total_messages": 0,
                "total_tokens": 0,
                "contract_analyses": 0,
                "documents_drafted": 0,
                "research_queries": 0,
            },
        )
        month_label = now.strftime("%B")
        return Response(
            {
                "total_messages": row.total_messages,
                "total_tokens": row.total_tokens,
                "contract_analyses": row.contract_analyses,
                "documents_drafted": row.documents_drafted,
                "research_queries": row.research_queries,
                "month": month_label,
                "year": year,
            }
        )
