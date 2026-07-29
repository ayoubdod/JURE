from django.conf import settings
from django.db import models
from django.db.models import F
from django.utils import timezone


class JuriaUsage(models.Model):
    """Cumulative Juria usage per user per calendar month."""

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="juria_usage",
    )
    year = models.IntegerField()
    month = models.IntegerField()
    total_messages = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    contract_analyses = models.IntegerField(default=0)
    documents_drafted = models.IntegerField(default=0)
    research_queries = models.IntegerField(default=0)

    class Meta:
        unique_together = [["user", "year", "month"]]

    def __str__(self) -> str:
        return f"JuriaUsage(user={self.user_id}, {self.year}-{self.month:02d})"


def record_juria_usage(
    user,
    *,
    messages_delta: int = 0,
    tokens_delta: int = 0,
    contract_analyses_delta: int = 0,
    documents_drafted_delta: int = 0,
    research_queries_delta: int = 0,
) -> None:
    """Atomically increment usage counters for the current month."""
    now = timezone.now()
    year, month = now.year, now.month
    defaults = {
        "total_messages": messages_delta,
        "total_tokens": tokens_delta,
        "contract_analyses": contract_analyses_delta,
        "documents_drafted": documents_drafted_delta,
        "research_queries": research_queries_delta,
    }
    obj, created = JuriaUsage.objects.get_or_create(
        user=user,
        year=year,
        month=month,
        defaults=defaults,
    )
    if created:
        return
    JuriaUsage.objects.filter(pk=obj.pk).update(
        total_messages=F("total_messages") + messages_delta,
        total_tokens=F("total_tokens") + tokens_delta,
        contract_analyses=F("contract_analyses") + contract_analyses_delta,
        documents_drafted=F("documents_drafted") + documents_drafted_delta,
        research_queries=F("research_queries") + research_queries_delta,
    )
