"""Migrate existing Juria conversations into project + thread workspaces."""

from django.db import migrations


def forwards(apps, schema_editor):
    User = apps.get_model("users", "User")
    JuriaConversation = apps.get_model("juria", "JuriaConversation")
    JuriaMessage = apps.get_model("juria", "JuriaMessage")
    JuriaProject = apps.get_model("juria", "JuriaProject")
    JuriaProjectMember = apps.get_model("juria", "JuriaProjectMember")
    JuriaProjectPermission = apps.get_model("juria", "JuriaProjectPermission")
    JuriaProjectSource = apps.get_model("juria", "JuriaProjectSource")
    JuriaThread = apps.get_model("juria", "JuriaThread")
    JuriaActivity = apps.get_model("juria", "JuriaActivity")

    default_perms = [
        ("CASE", "NONE"),
        ("DOCUMENTS", "NONE"),
        ("LIBRARY", "NONE"),
        ("CALENDAR", "NONE"),
        ("TASKS", "NONE"),
        ("CLIENTS", "NONE"),
        ("TEAM", "READ"),
    ]

    for conv in JuriaConversation.objects.all().iterator():
        if conv.project_id and conv.thread_id:
            JuriaMessage.objects.filter(conversation_id=conv.id, thread_id__isnull=True).update(thread_id=conv.thread_id)
            continue
        user = User.objects.filter(pk=conv.user_id).first()
        if user is None:
            continue
        cabinet_id = getattr(user, "cabinet_id", None)
        if not cabinet_id:
            # owner cabinet fallback
            from django.apps import apps as django_apps

            Cabinet = django_apps.get_model("cabinets", "Cabinet")
            owned = Cabinet.objects.filter(owner_id=user.id).first()
            cabinet_id = owned.id if owned else None
        if not cabinet_id:
            continue
        name = (conv.title or "").strip() or "Conversation Juria"
        project = JuriaProject.objects.create(
            cabinet_id=cabinet_id,
            owner_id=user.id,
            name=name[:200],
            description="",
            status="ARCHIVED" if conv.is_archived else "ACTIVE",
            preferred_language="fr",
            jurisdiction_code="MA",
            linked_case_id=conv.linked_case_id,
            archived_at=conv.updated_at if conv.is_archived else None,
        )
        JuriaProjectMember.objects.create(
            project=project,
            user_id=user.id,
            role="OWNER",
            invited_by_id=user.id,
        )
        JuriaProjectPermission.objects.bulk_create(
            [
                JuriaProjectPermission(project=project, resource=resource, level=level)
                for resource, level in default_perms
            ]
        )
        if conv.linked_case_id:
            JuriaProjectPermission.objects.filter(project=project, resource="CASE").update(level="READ")
            JuriaProjectSource.objects.create(
                project=project,
                kind="CASE",
                case_id=conv.linked_case_id,
                added_by_id=user.id,
            )
        thread = JuriaThread.objects.create(
            project=project,
            title=name[:200] or "Discussion générale",
            mode=conv.mode or "CHAT",
            created_by_id=user.id,
            is_archived=conv.is_archived,
        )
        conv.project_id = project.id
        conv.thread_id = thread.id
        conv.save(update_fields=["project_id", "thread_id"])
        JuriaMessage.objects.filter(conversation_id=conv.id).update(thread_id=thread.id, author_id=user.id)
        JuriaActivity.objects.create(
            project=project,
            actor_id=user.id,
            action="PROJECT_CREATED",
            metadata={"migrated_from_conversation": str(conv.id)},
        )


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("juria", "0002_project_workspace"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
