"""Phase 1 finance module tests — persistence, calculations, isolation, no demo data."""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from cabinets.models import Cabinet
from cases.models import Case
from dashboard.models import ActivityLog
from finance.models import Expense, Fee, FirmFinanceSettings, Invoice, InvoiceItem, Payment, TaxAdvance
from finance.services.case_finance_service import sync_invoice_status_from_payments

User = get_user_model()

_phone_seq = 0


def _unique_phone() -> str:
    global _phone_seq
    _phone_seq += 1
    # Valid FR mobile pattern used elsewhere in the suite
    return f'+336{(_phone_seq % 100000000):08d}'


def _auth(client, user):
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def _owner(email_prefix='owner'):
    email = f'{email_prefix}-{uuid.uuid4().hex[:8]}@test.com'
    user = User.objects.create_user(
        email=email,
        password='testpass123',
        first_name='Owner',
        last_name='One',
        phone=_unique_phone(),
        country='FR',
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=f'Cabinet {email_prefix}',
        business_address='Casablanca',
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = User.Role.OWNER
    user.save(update_fields=['cabinet', 'is_cabinet_member', 'role'])
    return user, cabinet


def _client_user(email_prefix='client'):
    return User.objects.create_user(
        email=f'{email_prefix}-{uuid.uuid4().hex[:8]}@client.com',
        password='testpass123',
        first_name='Client',
        last_name='Test',
        phone=_unique_phone(),
        country='FR',
    )


def _matter(cabinet, owner, client_user, ref=None):
    return Case.objects.create(
        case_type=Case.CaseType.LITIGATION,
        cabinet=cabinet,
        assigned_to=owner,
        client=client_user,
        title='Matter finance test',
        description='desc',
        court='Tribunal',
        reference=ref or f'REF-{uuid.uuid4().hex[:8].upper()}',
        status=Case.CaseStatus.OPEN,
    )


class FinancePhase1Tests(APITestCase):
    def setUp(self):
        self.owner_a, self.cab_a = _owner('a')
        self.owner_b, self.cab_b = _owner('b')
        self.client_a = _client_user('ca')
        self.client_b = _client_user('cb')
        self.matter_a = _matter(self.cab_a, self.owner_a, self.client_a)
        self.matter_b = _matter(self.cab_b, self.owner_b, self.client_b)
        _auth(self.client, self.owner_a)

    def test_create_fee(self):
        url = f'/api/v1/cases/{self.matter_a.id}/fees/'
        res = self.client.post(
            url,
            {'fee_type': 'FIXED', 'planned_amount': '25000.00', 'description': 'Honoraires'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(Fee.objects.filter(case=self.matter_a).count(), 1)
        fee = Fee.objects.get(pk=res.data['id'])
        self.assertEqual(fee.amount_expected, Decimal('25000.00'))
        self.assertEqual(fee.currency, 'MAD')
        self.assertEqual(fee.created_by_id, self.owner_a.id)
        self.assertTrue(
            ActivityLog.objects.filter(cabinet=self.cab_a, kind='finance_fee_created').exists()
        )

    def test_create_expense(self):
        url = f'/api/v1/cases/{self.matter_a.id}/expenses/'
        res = self.client.post(
            url,
            {
                'description': 'Frais greffe',
                'category': 'COURT',
                'amount': '2500.00',
                'expense_date': '2026-01-15',
                'billable': True,
                'reimbursable': False,
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        exp = Expense.objects.get(pk=res.data['id'])
        self.assertEqual(exp.cabinet_id, self.cab_a.id)
        self.assertEqual(exp.amount, Decimal('2500.00'))

    def test_create_invoice_and_items(self):
        fee = Fee.objects.create(
            case=self.matter_a,
            fee_type=Fee.FeeType.FIXED,
            amount_expected=Decimal('20000.00'),
            created_by=self.owner_a,
        )
        url = f'/api/v1/cases/{self.matter_a.id}/invoices/'
        res = self.client.post(
            url,
            {
                'fee_id': fee.id,
                'items': [
                    {
                        'description': 'Honoraires phase 1',
                        'quantity': '1',
                        'unit_price': '15000.00',
                        'fee_id': fee.id,
                    },
                    {
                        'description': 'Frais',
                        'quantity': '2',
                        'unit_price': '2500.00',
                    },
                ],
                'due_date': '2026-04-01',
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        inv = Invoice.objects.get(pk=res.data['id'])
        self.assertTrue(inv.invoice_number.startswith('FAC-'))
        self.assertEqual(InvoiceItem.objects.filter(invoice=inv).count(), 2)
        self.assertEqual(inv.amount_ht, Decimal('20000.00'))
        self.assertEqual(float(res.data['amount_ht']), 20000.0)

    def test_invoice_item_and_total_calculation(self):
        res = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/invoices/',
            {'amount_ht': '1000.00', 'due_date': '2026-05-01'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        inv = Invoice.objects.get(pk=res.data['id'])
        self.assertEqual(InvoiceItem.objects.filter(invoice=inv).count(), 1)
        item = inv.items.first()
        self.assertEqual(item.amount, Decimal('1000.00'))
        self.assertEqual(inv.amount_ttc, inv.amount_ht + inv.tva_amount)

    def test_partial_and_full_payments(self):
        inv_res = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/invoices/',
            {'amount_ht': '20000.00', 'due_date': (date.today() + timedelta(days=30)).isoformat()},
            format='json',
        )
        inv_id = inv_res.data['id']
        self.client.patch(
            f'/api/v1/finance/invoices/{inv_id}/status/',
            {'status': 'SENT'},
            format='json',
        )

        p1 = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/payments/',
            {
                'amount': '5000.00',
                'payment_method': 'CASH',
                'payment_date': date.today().isoformat(),
                'invoice_id': inv_id,
            },
            format='json',
        )
        self.assertEqual(p1.status_code, status.HTTP_201_CREATED, p1.data)
        inv = Invoice.objects.get(pk=inv_id)
        self.assertEqual(inv.status, Invoice.Status.PARTIALLY_PAID)

        p2 = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/payments/',
            {
                'amount': '3000.00',
                'payment_method': 'CHEQUE',
                'payment_date': date.today().isoformat(),
                'invoice_id': inv_id,
            },
            format='json',
        )
        self.assertEqual(p2.status_code, status.HTTP_201_CREATED, p2.data)
        detail = self.client.get(f'/api/v1/finance/invoices/{inv_id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['amount_paid'], 8000.0)
        self.assertEqual(detail.data['amount_outstanding'], float(inv.amount_ttc) - 8000.0)

        over = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/payments/',
            {
                'amount': str(float(inv.amount_ttc)),
                'payment_method': 'CASH',
                'payment_date': date.today().isoformat(),
                'invoice_id': inv_id,
            },
            format='json',
        )
        self.assertEqual(over.status_code, status.HTTP_400_BAD_REQUEST)

        outstanding = Decimal(str(detail.data['amount_outstanding']))
        p3 = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/payments/',
            {
                'amount': str(outstanding),
                'payment_method': 'VIREMENT_BANCAIRE',
                'payment_date': date.today().isoformat(),
                'invoice_id': inv_id,
            },
            format='json',
        )
        self.assertEqual(p3.status_code, status.HTTP_201_CREATED, p3.data)
        inv.refresh_from_db()
        self.assertEqual(inv.status, Invoice.Status.PAID)

    def test_overdue_status(self):
        inv_res = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/invoices/',
            {'amount_ht': '1000.00', 'due_date': (date.today() - timedelta(days=5)).isoformat()},
            format='json',
        )
        inv_id = inv_res.data['id']
        self.client.patch(
            f'/api/v1/finance/invoices/{inv_id}/status/',
            {'status': 'SENT'},
            format='json',
        )
        inv = Invoice.objects.get(pk=inv_id)
        sync_invoice_status_from_payments(inv)
        inv.refresh_from_db()
        self.assertEqual(inv.status, Invoice.Status.OVERDUE)

    def test_tax_advance_auto_created_from_settings(self):
        fs = FirmFinanceSettings.get_for_cabinet(self.cab_a)
        fs.tax_advance_default_amount = Decimal('150.00')
        fs.save(update_fields=['tax_advance_default_amount'])
        matter = _matter(self.cab_a, self.owner_a, self.client_a)
        ta = TaxAdvance.objects.filter(case=matter).first()
        self.assertIsNotNone(ta)
        self.assertEqual(ta.amount, Decimal('150.00'))
        self.assertEqual(ta.status, TaxAdvance.Status.UNPAID)

        patch = self.client.patch(
            f'/api/v1/cases/{matter.id}/tax-advance/',
            {'status': 'PAID'},
            format='json',
        )
        self.assertEqual(patch.status_code, 200, patch.data)
        self.assertEqual(patch.data['status'], 'PAID')
        self.assertIsNotNone(patch.data.get('paid_date') or patch.data.get('paid_at'))

    def test_matter_finance_and_dashboard(self):
        Fee.objects.create(
            case=self.matter_a,
            fee_type=Fee.FeeType.FIXED,
            amount_expected=Decimal('25000.00'),
        )
        Expense.objects.create(
            cabinet=self.cab_a,
            case=self.matter_a,
            description='Travel',
            amount=Decimal('2500.00'),
            expense_date=date.today(),
        )
        inv_res = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/invoices/',
            {'amount_ht': '20000.00', 'due_date': (date.today() + timedelta(days=10)).isoformat()},
            format='json',
        )
        inv_id = inv_res.data['id']
        self.client.patch(
            f'/api/v1/finance/invoices/{inv_id}/status/',
            {'status': 'SENT'},
            format='json',
        )
        self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/payments/',
            {
                'amount': '15000.00',
                'payment_method': 'CASH',
                'payment_date': date.today().isoformat(),
                'invoice_id': inv_id,
            },
            format='json',
        )

        summary = self.client.get(f'/api/v1/cases/{self.matter_a.id}/finance/')
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.data['summary']['planned'], 25000.0)
        self.assertEqual(summary.data['summary']['total_expenses'], 2500.0)
        self.assertGreater(summary.data['summary']['invoiced'], 0)
        self.assertEqual(summary.data['summary']['paid'], 15000.0)
        self.assertTrue(len(summary.data['fees']) >= 1)
        self.assertTrue(len(summary.data['expenses']) >= 1)

        dash = self.client.get('/api/v1/finance/dashboard/', {'year': date.today().year})
        self.assertEqual(dash.status_code, 200)
        kpis = dash.data['kpis']
        self.assertIn('ca_total', kpis)
        self.assertIn('total_ca_ttc', kpis)
        self.assertEqual(kpis['ca_total'], kpis['total_ca_ttc'])
        self.assertGreaterEqual(kpis['total_received'], 15000.0)
        self.assertNotIn('Johnson', str(dash.data))

    def test_receivables_and_empty_state(self):
        empty_owner, _empty_cab = _owner('empty')
        _auth(self.client, empty_owner)
        recv = self.client.get('/api/v1/finance/receivables/')
        self.assertEqual(recv.status_code, 200)
        self.assertEqual(recv.data['total_invoiced'], 0.0)
        self.assertEqual(recv.data['total_outstanding'], 0.0)
        self.assertEqual(recv.data['invoices'], [])
        dash = self.client.get('/api/v1/finance/dashboard/')
        self.assertEqual(dash.status_code, 200)
        self.assertEqual(dash.data['kpis']['ca_total'], 0)
        self.assertEqual(dash.data['recent_transactions'], [])

    def test_pdf_generation(self):
        inv_res = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/invoices/',
            {'amount_ht': '5000.00', 'due_date': date.today().isoformat()},
            format='json',
        )
        inv_id = inv_res.data['id']
        pdf = self.client.get(f'/api/v1/finance/invoices/{inv_id}/pdf/')
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf['Content-Type'], 'application/pdf')
        self.assertTrue(pdf.content[:4] == b'%PDF')

    def test_cabinet_isolation_and_unauthorized(self):
        inv_b = self.client.post(
            f'/api/v1/cases/{self.matter_b.id}/invoices/',
            {'amount_ht': '999.00'},
            format='json',
        )
        self.assertIn(inv_b.status_code, (403, 404))

        _auth(self.client, self.owner_b)
        inv_ok = self.client.post(
            f'/api/v1/cases/{self.matter_b.id}/invoices/',
            {'amount_ht': '999.00'},
            format='json',
        )
        self.assertEqual(inv_ok.status_code, 201, inv_ok.data)
        inv_id = inv_ok.data['id']

        _auth(self.client, self.owner_a)
        sneak = self.client.get(f'/api/v1/finance/invoices/{inv_id}/')
        self.assertEqual(sneak.status_code, 404)
        sneak_pdf = self.client.get(f'/api/v1/finance/invoices/{inv_id}/pdf/')
        self.assertEqual(sneak_pdf.status_code, 404)

        lawyer = User.objects.create_user(
            email=f'lawyer-{uuid.uuid4().hex[:6]}@test.com',
            password='testpass123',
            first_name='Law',
            last_name='Yer',
            phone=_unique_phone(),
            country='FR',
        )
        lawyer.cabinet = self.cab_a
        lawyer.is_cabinet_member = True
        lawyer.role = User.Role.LAWYER
        lawyer.save()
        _auth(self.client, lawyer)
        denied = self.client.get('/api/v1/finance/dashboard/')
        self.assertEqual(denied.status_code, 403)

    def test_negative_and_zero_amount_rejected(self):
        bad_fee = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/fees/',
            {'fee_type': 'FIXED', 'planned_amount': '-10'},
            format='json',
        )
        self.assertEqual(bad_fee.status_code, 400)
        bad_exp = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/expenses/',
            {
                'description': 'x',
                'amount': '0',
                'expense_date': date.today().isoformat(),
            },
            format='json',
        )
        self.assertEqual(bad_exp.status_code, 400)

    def test_cancel_payment_recalculates(self):
        inv_res = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/invoices/',
            {'amount_ht': '1000.00', 'due_date': (date.today() + timedelta(days=5)).isoformat()},
            format='json',
        )
        inv_id = inv_res.data['id']
        self.client.patch(
            f'/api/v1/finance/invoices/{inv_id}/status/',
            {'status': 'SENT'},
            format='json',
        )
        pay = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/payments/',
            {
                'amount': '1000.00',
                'payment_method': 'OTHER',
                'payment_date': date.today().isoformat(),
                'invoice_id': inv_id,
            },
            format='json',
        )
        self.assertEqual(pay.status_code, 201, pay.data)
        pay_id = pay.data['id']
        cancel = self.client.patch(
            f'/api/v1/finance/payments/{pay_id}/',
            {'status': 'CANCELLED'},
            format='json',
        )
        self.assertEqual(cancel.status_code, 200, cancel.data)
        inv = Invoice.objects.get(pk=inv_id)
        self.assertNotEqual(inv.status, Invoice.Status.PAID)

    def test_duplicate_invoice_numbers_per_cabinet_prevented(self):
        r1 = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/invoices/',
            {'amount_ht': '10.00'},
            format='json',
        )
        r2 = self.client.post(
            f'/api/v1/cases/{self.matter_a.id}/invoices/',
            {'amount_ht': '20.00'},
            format='json',
        )
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 201)
        self.assertNotEqual(r1.data['invoice_number'], r2.data['invoice_number'])
        self.assertEqual(
            Invoice.objects.filter(cabinet=self.cab_a).count(),
            Invoice.objects.filter(cabinet=self.cab_a)
            .values('invoice_number')
            .distinct()
            .count(),
        )
