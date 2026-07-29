import re
from django.db import transaction
from django.db.models import Max

from finance.models import Invoice


def next_invoice_number(cabinet_id: int, year: int) -> str:
    """
    Sequential per firm per calendar year: FAC-YYYY-XXX (3 digits).
    """
    prefix = f'FAC-{year}-'
    qs = Invoice.objects.filter(cabinet_id=cabinet_id, invoice_number__startswith=prefix)
    last = qs.aggregate(m=Max('invoice_number'))['m']
    if not last:
        seq = 1
    else:
        m = re.match(r'^FAC-\d{4}-(\d+)$', last)
        seq = int(m.group(1)) + 1 if m else 1
    return f'{prefix}{seq:03d}'


def allocate_invoice_number(cabinet_id: int, year: int) -> str:
    with transaction.atomic():
        Invoice.objects.select_for_update().filter(cabinet_id=cabinet_id).exists()
        return next_invoice_number(cabinet_id, year)
