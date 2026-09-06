from ..models import Client


def _profile_payload_from_request(data):
    """Extract optional B2B profile fields already sent by the frontend."""
    payload = {}
    if 'ice' in data:
        ice = (data.get('ice') or '').strip()
        payload['ice'] = ice or None
    if 'if' in data or 'fiscal_if' in data:
        raw = data.get('if') if 'if' in data else data.get('fiscal_if')
        payload['if_number'] = (raw or '').strip() or None
    client_type = data.get('client_type')
    if client_type in (Client.ClientType.INDIVIDUAL, Client.ClientType.COMPANY):
        payload['client_type'] = client_type
    return payload


def _sync_client_profile(user, data, *, create=False):
    defaults = _profile_payload_from_request(data)
    if create and 'client_type' not in defaults:
        defaults['client_type'] = Client.ClientType.INDIVIDUAL
    if defaults:
        Client.objects.update_or_create(user=user, defaults=defaults)
    elif create:
        Client.objects.get_or_create(user=user)

