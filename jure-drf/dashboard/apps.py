from django.apps import AppConfig


class DashboardConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "dashboard"

    def ready(self):
        from dashboard.signals import connect_overview_cache_invalidation

        connect_overview_cache_invalidation()
