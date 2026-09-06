from datetime import timedelta
from pathlib import Path

from django.http import FileResponse, Http404

PREVIEWABLE_SUFFIXES = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt'}


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
    if not attachment.file:
        raise Http404()
    try:
        fh = attachment.file.open('rb')
    except Exception as exc:
        raise Http404() from exc
    filename = attachment.original_name or Path(attachment.file.name).name
    inline = str(request.query_params.get('inline', '')).lower() in ('1', 'true', 'yes')
    suffix = Path(filename).suffix.lower()
    as_attachment = not (inline and suffix in PREVIEWABLE_SUFFIXES)
    response = FileResponse(fh, as_attachment=as_attachment, filename=filename)
    if attachment.mime:
        response['Content-Type'] = attachment.mime
    return response


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

