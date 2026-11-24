"""
Durable OCR worker without Celery.

Usage:
  python manage.py process_case_attachment_intelligence
  python manage.py process_case_attachment_intelligence --once --limit 20
  python manage.py process_case_attachment_intelligence --loop --interval 5

Recommended production: a separate Railway/Docker process running --loop,
with ATTACHMENT_OCR_RUNNER=poll_only on the web service so uploads never block
and Daphne threads are not used for heavy OCR.
"""

from __future__ import annotations

import time

from django.core.management.base import BaseCommand

from cases.attachment_intelligence.runner import run_pending_batch


class Command(BaseCommand):
    help = "Process pending case attachment OCR / intelligence jobs."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=10, help="Max jobs per batch.")
        parser.add_argument(
            "--once",
            action="store_true",
            help="Process one batch and exit (default).",
        )
        parser.add_argument(
            "--loop",
            action="store_true",
            help="Poll continuously until interrupted.",
        )
        parser.add_argument(
            "--interval",
            type=float,
            default=5.0,
            help="Seconds between poll batches when --loop is set.",
        )

    def handle(self, *args, **options):
        limit = max(1, int(options["limit"]))
        loop = bool(options["loop"])
        interval = max(0.5, float(options["interval"]))

        if not loop:
            n = run_pending_batch(limit=limit)
            self.stdout.write(self.style.SUCCESS(f"Processed {n} job(s)."))
            return

        self.stdout.write("Polling for attachment intelligence jobs…")
        while True:
            n = run_pending_batch(limit=limit)
            if n:
                self.stdout.write(self.style.SUCCESS(f"Processed {n} job(s)."))
            time.sleep(interval)
