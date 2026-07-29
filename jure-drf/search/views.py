from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cases.models import Case
from core.utils import get_user_cabinet
from tasks.models import Appointment, Task


def _case_search_priority(case: Case) -> str | None:
    data = case.case_specific_data or {}
    if case.case_type in (Case.CaseType.LITIGATION, Case.CaseType.ADMINISTRATIVE):
        p = data.get("priority")
        return str(p).upper() if p else None
    return None


class ShareableSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"detail": "Query q must be at least 2 characters."}, status=400)

        type_filter = (request.query_params.get("type") or "all").strip().lower()
        cab = get_user_cabinet(request.user)
        if not cab:
            return Response({"cases": [], "tasks": [], "appointments": []})

        out = {"cases": [], "tasks": [], "appointments": []}

        if type_filter in ("all", "case"):
            cq = Case.objects.filter(cabinet=cab).filter(
                Q(title__icontains=q) | Q(reference__icontains=q)
            )[:5]
            out["cases"] = [
                {
                    "id": str(c.id),
                    "reference": c.reference,
                    "title": c.title,
                    "status": c.status,
                    "caseType": c.case_type,
                    "priority": _case_search_priority(c),
                }
                for c in cq
            ]

        if type_filter in ("all", "task"):
            tq = Task.objects.filter(cabinet=cab, title__icontains=q).select_related("case")[:5]
            out["tasks"] = []
            for t in tq:
                rc = None
                if t.case_id:
                    rc = {"reference": t.case.reference, "title": t.case.title}
                due = t.due_date.isoformat() if t.due_date else None
                out["tasks"].append(
                    {
                        "id": str(t.id),
                        "title": t.title,
                        "status": t.status,
                        "priority": str(t.priority).upper() if t.priority else None,
                        "dueDate": due,
                        "relatedCase": rc,
                    }
                )

        if type_filter in ("all", "appointment"):
            aq = Appointment.objects.filter(cabinet=cab, title__icontains=q).select_related("case")[:5]
            out["appointments"] = []
            for a in aq:
                rc = None
                if a.case_id:
                    rc = {"reference": a.case.reference, "title": a.case.title}
                duration_m = None
                if a.start_at and a.end_at:
                    duration_m = int((a.end_at - a.start_at).total_seconds() // 60)
                out["appointments"].append(
                    {
                        "id": str(a.id),
                        "title": a.title,
                        "status": a.status,
                        "date": a.start_at.isoformat() if a.start_at else None,
                        "duration": duration_m,
                        "relatedCase": rc,
                    }
                )

        return Response(out)
