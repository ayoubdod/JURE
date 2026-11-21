from datetime import timedelta
from core.downloads import serve_file_field


def _user_cabinet(user):
    return user.get_owned_cabinet_or_none() or user.cabinet


def _week_bounds(today):
    start = today - timedelta(days=today.weekday())
    return start, start + timedelta(days=7)


def _user_lite(user):
    if not user:
        return None
    return {
        'id': user.id,
        'email': getattr(user, 'email', None),
        'first_name': getattr(user, 'first_name', ''),
        'last_name': getattr(user, 'last_name', ''),
        'image': getattr(user, 'image', None) and str(user.image) or None,
    }


def _save_uploaded_files(files, *, model, fk_field, parent, user):
    created = []
    for uploaded in files:
        if not uploaded:
            continue
        kwargs = {
            fk_field: parent,
            'file': uploaded,
            'original_name': getattr(uploaded, 'name', '') or '',
            'mime': getattr(uploaded, 'content_type', '') or '',
            'size': getattr(uploaded, 'size', 0) or 0,
            'uploaded_by': user,
        }
        created.append(model.objects.create(**kwargs))
    return created


def _download_attachment(request, attachment):
    return serve_file_field(
        request,
        attachment.file,
        filename=attachment.original_name or None,
        content_type=attachment.mime or None,
    )


def _safe_delete_file(file_field):
    try:
        if file_field:
            try:
                file_field.close()
            except Exception:
                pass
            file_field.delete(save=False)
    except OSError:
        # Windows may keep a lock briefly after FileResponse; DB row still removed.
        pass

