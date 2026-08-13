"""Generate invoice PDF bytes (ReportLab)."""

from __future__ import annotations

from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from finance.services.invoice_totals_service import (
    invoice_amount_outstanding,
    invoice_amount_paid,
)


def _mad(amount) -> str:
    d = Decimal(str(amount)).quantize(Decimal('0.01'))
    text = f'{d:.2f}'.replace('.', ',')
    return f'{text} MAD'


def build_invoice_pdf(invoice) -> bytes:
    """
    Build PDF for a finance.Invoice instance.
    Expects select_related: cabinet, case, client__user, fee (optional).
    Prefetch items when available.
    """
    inv = invoice
    cab = inv.cabinet
    case = inv.case
    client_user = inv.client.user

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name='InvTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=12,
    )
    normal = styles['Normal']
    small = ParagraphStyle(name='Small', parent=normal, fontSize=9, textColor=colors.grey)

    story = []
    story.append(Paragraph('FACTURE', title_style))
    story.append(Spacer(1, 0.3 * cm))

    emitter_lines = [
        f'<b>{escape(cab.trade_name)}</b>',
        escape(cab.business_address or ''),
    ]
    for line in emitter_lines:
        if line.strip():
            story.append(Paragraph(line, normal))
    story.append(Spacer(1, 0.6 * cm))

    amount_paid = invoice_amount_paid(inv)
    amount_outstanding = invoice_amount_outstanding(inv)

    meta_data = [
        ['N° facture', escape(inv.invoice_number)],
        ['Date d\'émission', inv.issued_date.isoformat() if inv.issued_date else '—'],
        ['Date d\'échéance', inv.due_date.isoformat() if inv.due_date else '—'],
        ['Statut de paiement', escape(inv.status)],
        ['Montant payé', _mad(amount_paid)],
        ['Reste à payer', _mad(amount_outstanding)],
    ]
    t_meta = Table(meta_data, colWidths=[4 * cm, 12 * cm])
    t_meta.setStyle(
        TableStyle(
            [
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
            ]
        )
    )
    story.append(t_meta)
    story.append(Spacer(1, 0.5 * cm))

    client_name = escape(
        f'{client_user.first_name} {client_user.last_name}'.strip() or client_user.email or ''
    )
    story.append(Paragraph('<b>Client</b>', normal))
    story.append(Paragraph(client_name, normal))
    if inv.client.ice:
        story.append(Paragraph(f'ICE : {escape(inv.client.ice)}', normal))
    if inv.client.if_number:
        story.append(Paragraph(f'IF : {escape(inv.client.if_number)}', normal))
    story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph('<b>Dossier</b>', normal))
    story.append(
        Paragraph(
            escape(f'{case.reference} — {case.title}'),
            normal,
        )
    )
    story.append(Spacer(1, 0.5 * cm))

    items = list(getattr(inv, 'items', []).all()) if hasattr(inv, 'items') else []
    line_data = [['Description', 'Qté', 'P.U. HT', 'Montant HT']]
    if items:
        for item in items:
            line_data.append(
                [
                    Paragraph(escape(item.description or 'Ligne'), normal),
                    f'{Decimal(str(item.quantity)):.2f}'.replace('.', ','),
                    _mad(item.unit_price),
                    _mad(item.amount),
                ]
            )
    else:
        desc = 'Honoraires'
        if inv.fee_id:
            desc = f'Honoraires (réf. honoraire #{inv.fee_id})'
        line_data.append(
            [
                Paragraph(escape(desc), normal),
                '1,00',
                _mad(inv.amount_ht),
                _mad(inv.amount_ht),
            ]
        )

    t_line = Table(line_data, colWidths=[8 * cm, 2 * cm, 3 * cm, 3 * cm])
    t_line.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.grey),
                ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.grey),
            ]
        )
    )
    story.append(t_line)
    story.append(Spacer(1, 0.4 * cm))

    totals = [
        ['Total HT', _mad(inv.amount_ht)],
        ['TVA (' + str(inv.tva_rate) + '%)', _mad(inv.tva_amount)],
        ['Total TTC', _mad(inv.amount_ttc)],
        ['Payé', _mad(amount_paid)],
        ['Reste à payer', _mad(amount_outstanding)],
    ]
    t_tot = Table(totals, colWidths=[12 * cm, 4 * cm])
    t_tot.setStyle(
        TableStyle(
            [
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('LINEABOVE', (0, 2), (-1, 2), 1, colors.black),
            ]
        )
    )
    story.append(t_tot)

    if not inv.tva_applicable and inv.tva_exoneration_note:
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(f'<i>{escape(inv.tva_exoneration_note)}</i>', small))

    if inv.notes:
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph('<b>Notes</b>', normal))
        story.append(Paragraph(escape(inv.notes).replace('\n', '<br/>'), normal))

    story.append(Spacer(1, 1 * cm))
    gen = timezone.now().strftime('%Y-%m-%d %H:%M')
    story.append(Paragraph(f'<i>Document généré le {escape(gen)}</i>', small))

    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes
