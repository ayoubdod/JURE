"""Format MAD amounts for API strings (e.g. dashboard tva_status)."""
from decimal import Decimal


def format_mad_string(value) -> str:
    if value is None:
        return '0,00 MAD'
    d = Decimal(str(value)).quantize(Decimal('0.01'))
    integral, _, frac = f'{d:.2f}'.partition('.')
    try:
        n = int(integral)
    except ValueError:
        n = 0
    s = f'{n:,}'.replace(',', ' ')
    return f'{s},{frac} MAD'
