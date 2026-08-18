"""
Render Jure transactional emails for local review.

Usage:
  python manage.py preview_emails
  python manage.py preview_emails --out tmp/email-previews
  python manage.py preview_emails --send you@example.com

Does not change production sending behavior. --send uses the current EMAIL_BACKEND.
"""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string

from core.email_context import (
    PRIORITY_COLORS,
    absolute_frontend_url,
    email_brand_context,
    frontend_origin,
)


class Command(BaseCommand):
    help = "Render all Jure transactional email templates (HTML + text) for review"

    def add_arguments(self, parser):
        parser.add_argument(
            "--out",
            type=str,
            default="",
            help="Directory to write .html and .txt previews",
        )
        parser.add_argument(
            "--send",
            type=str,
            default="",
            help="Optional recipient to send previews through the current email backend",
        )

    def handle(self, *args, **options):
        origin = frontend_origin()
        token = "preview-token-not-a-secret"
        uid = "MQ"
        key = "preview-confirm-key"
        setup_token = "preview-setup-token"

        samples = self._samples(origin, token, uid, key, setup_token)
        out_dir = Path(options["out"]) if options["out"] else None
        if out_dir:
            out_dir.mkdir(parents=True, exist_ok=True)

        self.stdout.write(f"EMAIL_BACKEND: {getattr(settings, 'EMAIL_BACKEND', '?')}")
        self.stdout.write(f"DEFAULT_FROM_EMAIL: {getattr(settings, 'DEFAULT_FROM_EMAIL', '?')}")
        self.stdout.write(f"FRONTEND_BASE_URL: {origin}")
        self.stdout.write("")

        failures = 0
        for name, subject, html_tmpl, txt_tmpl, ctx, must_contain in samples:
            html = render_to_string(html_tmpl, ctx)
            text = render_to_string(txt_tmpl, ctx)

            def _in_html(needle: str) -> bool:
                return needle in html or needle.replace("&", "&amp;") in html

            missing = [
                needle
                for needle in must_contain
                if needle not in text or not _in_html(needle)
            ]
            leaked = self._leak_check(name, html, text, ctx)

            status = "OK"
            if missing or leaked:
                status = "FAIL"
                failures += 1

            self.stdout.write(f"{name}: {status}")
            self.stdout.write(f"  subject: {subject}")
            for needle in must_contain:
                self.stdout.write(f"  url check: {needle}")
            if missing:
                self.stdout.write(self.style.ERROR(f"  missing in html/text: {missing}"))
            if leaked:
                self.stdout.write(self.style.ERROR(f"  leak: {leaked}"))

            if out_dir:
                (out_dir / f"{name}.html").write_text(html, encoding="utf-8")
                (out_dir / f"{name}.txt").write_text(text, encoding="utf-8")
                self.stdout.write(f"  wrote {out_dir / (name + '.html')}")

            send_to = (options["send"] or "").strip()
            if send_to:
                msg = EmailMultiAlternatives(
                    subject=f"[PREVIEW] {subject}",
                    body=text,
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "webmaster@localhost"),
                    to=[send_to],
                )
                msg.attach_alternative(html, "text/html")
                msg.send(fail_silently=False)
                self.stdout.write(f"  sent preview to {send_to}")
            self.stdout.write("")

        if failures:
            self.stderr.write(self.style.ERROR(f"{failures} email preview(s) failed checks."))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("All transactional email templates rendered."))

    def _samples(self, origin, token, uid, key, setup_token):
        user = SimpleNamespace(first_name="Ayoub")
        confirm_url = f"{origin}/verify-email/?token={key}"
        reset_url = f"{origin}/password-reset-confirm/?uuid={uid}&token={token}"
        setup_url = absolute_frontend_url(f"/setup-password?token={setup_token}")
        action_url = "/cases/42"
        cta_url = absolute_frontend_url(action_url)

        case = SimpleNamespace(reference="D-2026-0042", title="Société ABC")
        task = SimpleNamespace(title="Préparer conclusions")
        notification = SimpleNamespace(
            title="Deadline approaching",
            message="Le délai pour le dossier X arrive à échéance dans 2 jours.",
            related_case=case,
            related_task=task,
            related_appointment=None,
            priority="HIGH",
            action_url=action_url,
        )

        confirm_ctx = email_brand_context(
            user=user,
            key=key,
            activate_url=confirm_url,
            preheader="Confirm your Jure email address.",
            email_title="Confirm your Jure email address",
        )
        reset_ctx = email_brand_context(
            user=user,
            password_reset_url=reset_url,
            token=token,
            uid=uid,
            preheader="Reset your Jure password.",
            email_title="Reset your Jure password",
        )
        invite_ctx = email_brand_context(
            first_name="Ayoub",
            login_email="ayoub@example.com",
            setup_url=setup_url,
            firm_name="Cabinet Demo",
            expiry_days=7,
            preheader="Set up your Jure account to join your team.",
            email_title="You're invited to join Jure",
        )
        notif_ctx = email_brand_context(
            email_lang="fr",
            notification=notification,
            bar_color=PRIORITY_COLORS["HIGH"],
            cta_url=cta_url,
            cta_kind="case",
            firm_name="Cabinet Demo",
            preheader=notification.title,
            email_title=notification.title,
            show_priority_label=True,
            priority_label="HIGH",
        )
        contact = SimpleNamespace(
            name="Ayoub Hammady",
            email="ayoub@example.com",
            company="Cabinet Demo",
            phone="+212 665236382",
            subject="Early access",
            message="We would like to try JURE with our team.",
            source="contact",
        )
        team_ctx = email_brand_context(
            preheader="New website inquiry from Ayoub Hammady (ayoub@example.com)",
            email_title="New contact request",
            contact=contact,
            source_label="Formulaire de contact du site",
            visitor_subject="Early access",
            visitor_message=contact.message,
            inbox="contact@jure.ma",
            context_label="JURE website",
            heading="New contact request",
            subtitle="A visitor submitted a request through the JURE website.",
            labels={
                "from": "From",
                "source": "Source",
                "company": "Company",
                "phone": "Phone",
                "subject": "Subject",
                "message": "Message",
            },
            reply_mailto="mailto:ayoub@example.com?subject=Re:%20Early%20access",
            reply_cta="Reply to Ayoub Hammady",
            view_site_cta="View website",
            footer_note="This notification was generated from the JURE website contact form.",
        )
        ack_ctx = email_brand_context(
            email_lang="fr",
            preheader="Merci. L’équipe JURE vous recontactera rapidement.",
            email_title="Merci d’avoir contacté JURE",
            hello="Bonjour Ayoub,",
            title="Merci d’avoir contacté JURE",
            context_label="JURE",
            body="Merci de nous avoir écrit. Nous avons bien reçu votre demande et notre équipe reviendra vers vous dans un délai raisonnable.",
            ref_label="Votre message",
            visitor_subject="Early access",
            visitor_message=contact.message,
            cta_label="Visiter jure.ma",
            footer_note="Vous recevez cet e-mail car vous avez envoyé une demande depuis jure.ma.",
            inbox="contact@jure.ma",
        )

        return [
            (
                "email_confirmation",
                "Confirm your Jure email address",
                "account/email/email_confirmation_message.html",
                "account/email/email_confirmation_message.txt",
                confirm_ctx,
                [confirm_url, "/verify-email/?token="],
            ),
            (
                "password_reset",
                "Reset your Jure password",
                "account/email/password_reset_key_message.html",
                "account/email/password_reset_key_message.txt",
                reset_ctx,
                [reset_url, "/password-reset-confirm/?uuid=", "&token="],
            ),
            (
                "invitation",
                "You're invited to join Jure",
                "emails/invitations/invitation.html",
                "emails/invitations/invitation.txt",
                invite_ctx,
                [setup_url, "/setup-password?token="],
            ),
            (
                "notification",
                "[Jure] Deadline approaching",
                "emails/notifications/notification.html",
                "emails/notifications/notification.txt",
                notif_ctx,
                [cta_url, action_url],
            ),
            (
                "website_contact_team",
                "[JURE website] Contact request from Ayoub Hammady — Early access",
                "emails/contact/team_inquiry.html",
                "emails/contact/team_inquiry.txt",
                team_ctx,
                ["ayoub@example.com", "Early access"],
            ),
            (
                "website_contact_ack",
                "Nous avons bien reçu votre demande — JURE",
                "emails/contact/acknowledgement.html",
                "emails/contact/acknowledgement.txt",
                ack_ctx,
                ["Bonjour Ayoub,", "jure.ma"],
            ),
        ]

    def _leak_check(self, name: str, html: str, text: str, ctx: dict) -> str:
        if "SMTP_PASS" in html or "EMAIL_HOST_PASSWORD" in html:
            return "smtp credential marker found"
        if name == "password_reset":
            # Token may appear only inside the reset URL, never as a labeled secret.
            if "password:" in html.lower() and "reset your password" not in html.lower():
                return "unexpected password label"
        return ""
