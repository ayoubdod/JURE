from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from cabinets.permissions import HasCasesPermission
from core.utils import NumericPagination
from tasks.models import Task
from tasks.serializers import TaskSerializer

from .engine import CalculationError, calculate_deadline, resolve_active_rule
from .models import CalculatedDeadline, DeadlineReminder, DeadlineRule, LegalHoliday, LegalSource
from .serializers import (
    CalculateDeadlineSerializer,
    CalculatedDeadlineSerializer,
    CalculatedDeadlineUpdateSerializer,
    CreateTaskFromDeadlineSerializer,
    DeadlineRuleSerializer,
    DomainSerializer,
    LegalHolidaySerializer,
    LegalSourceSerializer,
    SaveDeadlineSerializer,
)
from .seed import seed_all


def _user_cabinet(user):
    return user.get_owned_cabinet_or_none() or user.cabinet


class LegalDomainListView(APIView):
    """List legal domains; only Civil Procedure is active for MVP."""

    permission_classes = [permissions.IsAuthenticated, HasCasesPermission]

    def get(self, request):
        payload = []
        for value, label in DeadlineRule.LegalDomain.choices:
            available = value == DeadlineRule.LegalDomain.CIVIL_PROCEDURE
            payload.append(
                {
                    "value": value,
                    "label": str(label),
                    "available": available,
                    "message": ""
                    if available
                    else "No verified rule is currently available for this procedure.",
                }
            )
        return Response(DomainSerializer(payload, many=True).data)


class DeadlineRuleListView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCasesPermission]

    def get(self, request):
        domain = request.query_params.get("domain", DeadlineRule.LegalDomain.CIVIL_PROCEDURE)
        jurisdiction = request.query_params.get("jurisdiction", "MA")
        as_of_raw = request.query_params.get("as_of")
        as_of = parse_date(as_of_raw) if as_of_raw else timezone.localdate()
        if as_of is None:
            return Response({"detail": "Invalid as_of date."}, status=status.HTTP_400_BAD_REQUEST)

        if domain != DeadlineRule.LegalDomain.CIVIL_PROCEDURE:
            return Response(
                {
                    "detail": "No verified rule is currently available for this procedure.",
                    "results": [],
                }
            )

        qs = (
            DeadlineRule.objects.filter(
                jurisdiction=jurisdiction,
                legal_domain=domain,
                active=True,
                verification_status=DeadlineRule.VerificationStatus.VERIFIED,
                effective_from__lte=as_of,
            )
            .filter(models_q_effective_until(as_of))
            .select_related("source")
            .order_by("procedure_type", "-effective_from")
        )
        # Deduplicate by procedure_type keeping the newest effective rule.
        seen = set()
        rules = []
        for rule in qs:
            if rule.procedure_type in seen:
                continue
            seen.add(rule.procedure_type)
            rules.append(rule)
        return Response(DeadlineRuleSerializer(rules, many=True).data)


def models_q_effective_until(as_of):
    from django.db.models import Q

    return Q(effective_until__isnull=True) | Q(effective_until__gte=as_of)


class LegalHolidayListView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCasesPermission]

    def get(self, request):
        year = request.query_params.get("year")
        jurisdiction = request.query_params.get("jurisdiction", "MA")
        qs = LegalHoliday.objects.filter(jurisdiction=jurisdiction, is_legally_relevant=True)
        if year:
            qs = qs.filter(year=int(year))
        return Response(LegalHolidaySerializer(qs.order_by("date"), many=True).data)


class LegalSourceListView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCasesPermission]

    def get(self, request):
        qs = LegalSource.objects.filter(jurisdiction=request.query_params.get("jurisdiction", "MA"))
        return Response(LegalSourceSerializer(qs, many=True).data)


class CalculateDeadlineView(APIView):
    """Preview a calculation without persisting."""

    permission_classes = [permissions.IsAuthenticated, HasCasesPermission]

    def post(self, request):
        ser = CalculateDeadlineSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        try:
            rule = _resolve_rule(data)
            result = calculate_deadline(
                data["triggering_date"],
                rule,
                contextual_parameters=data.get("contextual_parameters") or {},
            )
        except CalculationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except DeadlineRule.DoesNotExist:
            return Response(
                {"detail": "No verified rule is currently available for this procedure."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "rule": DeadlineRuleSerializer(rule).data,
                "calculated_deadline": result.calculated_deadline.isoformat(),
                "explanation": result.explanation,
            }
        )


def _resolve_rule(data) -> DeadlineRule:
    if data.get("rule_id"):
        rule = DeadlineRule.objects.select_related("source").get(pk=data["rule_id"])
        if rule.verification_status != DeadlineRule.VerificationStatus.VERIFIED or not rule.active:
            raise CalculationError("No verified rule is currently available for this procedure.")
        if not rule.is_effective_on(data["triggering_date"]):
            raise CalculationError(
                "The selected legal rule is not effective on the triggering event date."
            )
        return rule
    return resolve_active_rule(
        jurisdiction=data.get("jurisdiction", "MA"),
        legal_domain=data.get("legal_domain", DeadlineRule.LegalDomain.CIVIL_PROCEDURE),
        procedure_type=data["procedure_type"],
        event_type=data.get("event_type"),
        as_of=data["triggering_date"],
        require_verified=True,
    )


class CalculatedDeadlineViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasCasesPermission]
    pagination_class = NumericPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        cabinet = _user_cabinet(self.request.user)
        qs = CalculatedDeadline.objects.none()
        if not cabinet:
            return qs
        qs = (
            CalculatedDeadline.objects.filter(cabinet=cabinet)
            .select_related("rule", "rule__source", "case", "created_by", "linked_task")
            .prefetch_related("reminders")
        )
        case_id = self.request.query_params.get("case")
        if case_id:
            qs = qs.filter(case_id=case_id)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def get_serializer_class(self):
        if self.action in ("partial_update", "update"):
            return CalculatedDeadlineUpdateSerializer
        if self.action == "create":
            return SaveDeadlineSerializer
        return CalculatedDeadlineSerializer

    def create(self, request, *args, **kwargs):
        ser = SaveDeadlineSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        cabinet = _user_cabinet(request.user)
        if not cabinet:
            return Response({"detail": "No cabinet."}, status=status.HTTP_403_FORBIDDEN)
        case = data["case"]
        if case.cabinet_id != cabinet.id:
            return Response(
                {"detail": "You are not authorized to access this matter."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            rule = _resolve_rule(data)
            result = calculate_deadline(
                data["triggering_date"],
                rule,
                contextual_parameters=data.get("contextual_parameters") or {},
            )
        except CalculationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        manual = data.get("manual_deadline")
        is_override = bool(manual and manual != result.calculated_deadline)
        final = manual if is_override else result.calculated_deadline

        with transaction.atomic():
            obj = CalculatedDeadline.objects.create(
                cabinet=cabinet,
                case=case,
                created_by=request.user,
                rule=rule,
                rule_snapshot=rule.to_snapshot(),
                triggering_event_type=rule.event_type,
                triggering_date=data["triggering_date"],
                calculated_deadline=result.calculated_deadline,
                final_deadline=final,
                is_manual_override=is_override,
                original_calculated_deadline=result.calculated_deadline if is_override else None,
                override_reason=data.get("override_reason", "") if is_override else "",
                override_by=request.user if is_override else None,
                override_at=timezone.now() if is_override else None,
                calculation_explanation=result.explanation,
                contextual_parameters=data.get("contextual_parameters") or {},
                notes=data.get("notes") or "",
            )
            obj.refresh_status()
            obj.save(update_fields=["status"])
            for days in data.get("reminder_offsets") or []:
                DeadlineReminder.objects.get_or_create(
                    deadline=obj,
                    days_before=days,
                    defaults={"created_by": request.user},
                )
        out = CalculatedDeadlineSerializer(obj, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        ser = CalculatedDeadlineUpdateSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        if "notes" in data:
            obj.notes = data["notes"]
        if "status" in data:
            obj.status = data["status"]
        if "manual_deadline" in data and data["manual_deadline"]:
            manual = data["manual_deadline"]
            if manual != obj.final_deadline:
                if not obj.original_calculated_deadline:
                    obj.original_calculated_deadline = obj.calculated_deadline
                obj.final_deadline = manual
                obj.is_manual_override = True
                obj.override_reason = data.get("override_reason") or obj.override_reason
                obj.override_by = request.user
                obj.override_at = timezone.now()
        if "reminder_offsets" in data:
            offsets = set(data["reminder_offsets"])
            obj.reminders.exclude(days_before__in=offsets).delete()
            for days in offsets:
                DeadlineReminder.objects.get_or_create(
                    deadline=obj,
                    days_before=days,
                    defaults={"created_by": request.user},
                )
        if obj.status not in (
            CalculatedDeadline.Status.COMPLETED,
            CalculatedDeadline.Status.CANCELLED,
        ):
            obj.refresh_status()
        obj.save()
        return Response(CalculatedDeadlineSerializer(obj, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.status = CalculatedDeadline.Status.CANCELLED
        obj.save(update_fields=["status", "modified"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="create-task")
    def create_task(self, request, pk=None):
        obj = self.get_object()
        ser = CreateTaskFromDeadlineSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        title = data.get("title") or f"Deadline: {obj.rule.name}"
        task = Task.objects.create(
            title=title,
            description=data.get("description")
            or (
                f"Legal deadline for case {obj.case.reference}.\n"
                f"Triggering date: {obj.triggering_date}\n"
                f"Final deadline: {obj.final_deadline}\n"
                f"Rule: {obj.rule.name} ({obj.rule.version})"
            ),
            priority=data.get("priority", Task.TaskPriority.HIGH),
            status=Task.TaskStatus.TODO,
            due_date=obj.final_deadline,
            assigned_to=data.get("assigned_to"),
            cabinet=obj.cabinet,
            case=obj.case,
            client=obj.case.client,
        )
        obj.linked_task = task
        obj.save(update_fields=["linked_task", "modified"])
        return Response(TaskSerializer(task, context={"request": request}).data, status=status.HTTP_201_CREATED)


class SeedLegalDataView(APIView):
    """Admin/dev helper to (re)seed civil procedure rules and holidays."""

    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        result = seed_all()
        return Response(
            {
                "sources": len(result["sources"]),
                "rules": len(result["rules"]),
                "holidays": len(result["holidays"]),
            }
        )
