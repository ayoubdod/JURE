DISMISSED_ANNOUNCEMENT_SESSION_KEY = "dismissed_announcement_ids"


def get_dismissed_announcement_ids(request) -> list[int]:
    """Session-scoped dismissed announcement IDs (cleared when the session ends)."""
    raw = request.session.get(DISMISSED_ANNOUNCEMENT_SESSION_KEY) or []
    ids: list[int] = []
    for value in raw:
        try:
            ids.append(int(value))
        except (TypeError, ValueError):
            continue
    return ids


def dismiss_announcement_in_session(request, announcement_id: int) -> None:
    """Mark an announcement as hidden for the current Django session only."""
    dismissed = get_dismissed_announcement_ids(request)
    if announcement_id not in dismissed:
        dismissed.append(announcement_id)
        request.session[DISMISSED_ANNOUNCEMENT_SESSION_KEY] = dismissed
        request.session.modified = True


def _absolute_media_url(announcement, request=None) -> str | None:
    if not announcement.media:
        return None
    url = announcement.media.url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


def serialize_announcement(announcement, request=None) -> dict:
    media_url = _absolute_media_url(announcement, request=request)
    return {
        "id": announcement.id,
        "title": announcement.title,
        "message": announcement.message,
        "type": announcement.announcement_type,
        "media_url": media_url,
        "media_kind": announcement.media_kind or None,
        "start_date": announcement.start_date.isoformat() if announcement.start_date else None,
        "end_date": announcement.end_date.isoformat() if announcement.end_date else None,
    }
