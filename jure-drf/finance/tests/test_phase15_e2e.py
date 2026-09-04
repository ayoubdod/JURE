"""
Phase 1.5 — end-to-end finance verification.

Deterministic Hammoud Law Firm scenario + lifecycle, isolation, audit, receivables.
Does not replace test_phase1.py.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import access_token_for

from cabinets.models import Cabinet
from cases.models import Case
from dashboard.models import ActivityLog
from finance.models import Expense, Fee, FirmFinanceSettings, Invoice, InvoiceItem, Payment, TaxAdvance

User = get_user_model()

_phone_seq = 10_000


def _phone() -> str:
    global _phone_seq
    _phone_seq += 1
    return f'+336{_phone_seq:08d}'


def _auth(client, user):
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token_for(user)}')


def _owner(prefix='owner', trade_name=None):
    user = User.objects.create_user(
        email=f'{prefix}-{uuid.uuid4().hex[:8]}@test.com',
        password='testpass123',
        first_name=prefix.title(),
        last_name='Owner',
        phone=_phone(),
        country='FR',
    )
    cabinet = Cabinet.objects.create(
        owner=user,
        trade_name=trade_name or f'Cabinet {prefix}',
        business_address='Casablanca',
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = User.Role.OWNER
    user.save(update_fields=['cabinet', 'is_cabinet_member', 'role'])
    return user, cabinet


def _user_with_role(cabinet, role, prefix='u'):
    user = User.objects.create_user(
        email=f'{prefix}-{uuid.uuid4().hex[:8]}@test.com',
        password='testpass123',
        first_name=prefix.title(),
        last_name=str(role),
        phone=_phone(),
        country='FR',
    )
    user.cabinet = cabinet
    user.is_cabinet_member = True
    user.role = role
    user.save(update_fields=['cabinet', 'is_cabinet_member', 'role'])
    return user


def _client_user(prefix='client'):
    return User.objects.create_user(
        email=f'{prefix}-{uuid.uuid4().hex[:8]}@client.com',
        password='testpass123',
        first_name=prefix.title(),
        last_name='Corp',
        phone=_phone(),
        country='FR',
    )


def _matter(cabinet, owner, client_user, title='Matter', ref=None):
    return Case.objects.create(
        case_type=Case.CaseType.LITIGATION,
        cabinet=cabinet,
        assigned_to=owner,
        client=client_user,
        title=title,
        description='desc',
        court='Tribunal',
        reference=ref or f'REF-{uuid.uuid4().hex[:8].upper()}',
        status=Case.CaseStatus.OPEN,
    )


def _send(client, inv_id):
    return client.patch(
        f'/api/v1/finance/invoices/{inv_id}/status/',
        {'status': 'SENT'},
        format='json',
    )


def _pay(client, case_id, inv_id, amount, method='CASH'):
    return client.post(
        f'/api/v1/cases/{case_id}/payments/',
        {
            'amount': str(amount),
            'payment_method': method,
            'payment_date': date.today().isoformat(),
            'invoice_id': inv_id,
        },
        format='json',
    )


class HammoudE2EScenarioTests(APITestCase):
    """Firm Hammoud / Client ABC / Matter ABC v XYZ — authoritative backend maths."""

    def setUp(self):
        self.owner, self.cab = _owner('hammoud', trade_name='Hammoud Law Firm')
        self.client_user = _client_user('abc')
        self.matter = _matter(
            self.cab,
            self.owner,
            self.client_user,
            title='ABC Corporation v. XYZ',
            ref='ABC-XYZ-001',
        )
        _auth(self.client, self.owner)

    def test_full_lifecycle_partial_payments_and_settlement(self):
        fee = self.client.post(
            f'/api/v1/cases/{self.matter.id}/fees/',
            {
                'fee_type': 'FIXED',
                'planned_amount': '10000.00',
                'description': 'Honoraires ABC v XYZ',
            },
            format='json',
        )
        self.assertEqual(fee.status_code, 201, fee.data)

        inv = self.client.post(
            f'/api/v1/cases/{self.matter.id}/invoices/',
            {
                'fee_id': fee.data['id'],
                'items': [
                    {'description': 'Legal consultation', 'quantity': '1', 'unit_price': '5000.00'},
                    {'description': 'Contract drafting', 'quantity': '1', 'unit_price': '3000.00'},
                    {'description': 'Litigation work', 'quantity': '1', 'unit_price': '2000.00'},
                ],
                'due_date': (date.today() + timedelta(days=30)).isoformat(),
            },
            format='json',
        )
        self.assertEqual(inv.status_code, 201, inv.data)
        inv_id = inv.data['id']
        self.assertEqual(Decimal(str(inv.data['amount_ht'])), Decimal('10000.00'))
        self.assertEqual(InvoiceItem.objects.filter(invoice_id=inv_id).count(), 3)

        # Tamper attempt: items sum must drive HT even if amount_ht lied
        # (create already validated items → HT 10000)
        self.assertEqual(float(inv.data['amount_ht']), 10000.0)

        send = _send(self.client, inv_id)
        self.assertEqual(send.status_code, 200, send.data)

        p1 = _pay(self.client, self.matter.id, inv_id, '3000.00')
        self.assertEqual(p1.status_code, 201, p1.data)
        d1 = self.client.get(f'/api/v1/finance/invoices/{inv_id}/')
        self.assertEqual(d1.data['status'], 'PARTIALLY_PAID')
        self.assertEqual(d1.data['amount_paid'], 3000.0)
        self.assertEqual(d1.data['amount_outstanding'], float(d1.data['amount_ttc']) - 3000.0)

        p2 = _pay(self.client, self.matter.id, inv_id, '4000.00')
        self.assertEqual(p2.status_code, 201, p2.data)
        d2 = self.client.get(f'/api/v1/finance/invoices/{inv_id}/')
        self.assertEqual(d2.data['status'], 'PARTIALLY_PAID')
        self.assertEqual(d2.data['amount_paid'], 7000.0)
        outstanding = Decimal(str(d2.data['amount_outstanding']))
        self.assertEqual(outstanding, Decimal(str(d2.data['amount_ttc'])) - Decimal('7000'))

        # Overpayment protection
        over = _pay(self.client, self.matter.id, inv_id, '5000.00')
        self.assertEqual(over.status_code, 400)
        d_over = self.client.get(f'/api/v1/finance/invoices/{inv_id}/')
        self.assertEqual(d_over.data['amount_paid'], 7000.0)
        self.assertEqual(
            Payment.objects.filter(invoice_id=inv_id, status=Payment.Status.CONFIRMED).count(),
            2,
        )

        # Settle remaining
        p3 = _pay(self.client, self.matter.id, inv_id, outstanding)
        self.assertEqual(p3.status_code, 201, p3.data)
        d3 = self.client.get(f'/api/v1/finance/invoices/{inv_id}/')
        self.assertEqual(d3.data['status'], 'PAID')
        self.assertEqual(d3.data['amount_outstanding'], 0.0)
        self.assertEqual(d3.data['amount_paid'], float(d3.data['amount_ttc']))

        # Matter finance refresh consistency
        summary = self.client.get(f'/api/v1/cases/{self.matter.id}/finance/')
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.data['summary']['planned'], 10000.0)
        self.assertEqual(summary.data['summary']['paid'], float(d3.data['amount_ttc']))
        self.assertEqual(summary.data['summary']['remaining'], 0.0)
        self.assertIn('net_position', summary.data['summary'])

        # Audit logs persisted
        self.assertTrue(
            ActivityLog.objects.filter(cabinet=self.cab, kind='finance_fee_created').exists()
        )
        self.assertTrue(
            ActivityLog.objects.filter(cabinet=self.cab, kind='finance_invoice_created').exists()
        )
        self.assertGreaterEqual(
            ActivityLog.objects.filter(cabinet=self.cab, kind='finance_payment_created').count(),
            3,
        )

    def test_payment_cancellation_persists(self):
        inv = self.client.post(
            f'/api/v1/cases/{self.matter.id}/invoices/',
            {'amount_ht': '10000.00', 'due_date': (date.today() + timedelta(days=10)).isoformat()},
            format='json',
        )
        inv_id = inv.data['id']
        _send(self.client, inv_id)
        pay = _pay(self.client, self.matter.id, inv_id, '4000.00')
        self.assertEqual(pay.status_code, 201, pay.data)
        pay_id = pay.data['id']

        cancel = self.client.patch(
            f'/api/v1/finance/payments/{pay_id}/',
            {'status': 'CANCELLED'},
            format='json',
        )
        self.assertEqual(cancel.status_code, 200, cancel.data)

        # Re-fetch (simulates browser refresh)
        detail = self.client.get(f'/api/v1/finance/invoices/{inv_id}/')
        self.assertEqual(detail.data['amount_paid'], 0.0)
        self.assertEqual(detail.data['amount_outstanding'], float(detail.data['amount_ttc']))
        db_pay = Payment.objects.get(pk=pay_id)
        self.assertEqual(db_pay.status, Payment.Status.CANCELLED)
        self.assertTrue(
            ActivityLog.objects.filter(cabinet=self.cab, kind='finance_payment_cancelled').exists()
        )

    def test_expenses_and_matter_net_position(self):
        exp = self.client.post(
            f'/api/v1/cases/{self.matter.id}/expenses/',
            {
                'description': 'Court fees',
                'category': 'COURT',
                'amount': '1500.00',
                'expense_date': date.today().isoformat(),
                'billable': True,
            },
            format='json',
        )
        self.assertEqual(exp.status_code, 201, exp.data)
        exp_id = exp.data['id']
        self.assertTrue(Expense.objects.filter(pk=exp_id, cabinet=self.cab).exists())

        summary = self.client.get(f'/api/v1/cases/{self.matter.id}/finance/')
        self.assertEqual(summary.data['summary']['total_expenses'], 1500.0)
        self.assertEqual(summary.data['summary']['net_position'], -1500.0)

        # Delete persists
        deleted = self.client.delete(f'/api/v1/finance/expenses/{exp_id}/')
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(Expense.objects.filter(pk=exp_id).exists())
        summary2 = self.client.get(f'/api/v1/cases/{self.matter.id}/finance/')
        self.assertEqual(summary2.data['summary']['total_expenses'], 0.0)

    def test_receivables_aggregation(self):
        def make_invoice(ht):
            r = self.client.post(
                f'/api/v1/cases/{self.matter.id}/invoices/',
                {'amount_ht': str(ht), 'due_date': (date.today() + timedelta(days=20)).isoformat()},
                format='json',
            )
            self.assertEqual(r.status_code, 201, r.data)
            _send(self.client, r.data['id'])
            return r.data['id'], Decimal(str(r.data['amount_ttc']))

        a_id, a_ttc = make_invoice('10000.00')
        b_id, b_ttc = make_invoice('20000.00')
        c_id, c_ttc = make_invoice('30000.00')

        _pay(self.client, self.matter.id, a_id, a_ttc)
        _pay(self.client, self.matter.id, b_id, '10000.00')

        recv = self.client.get('/api/v1/finance/receivables/')
        self.assertEqual(recv.status_code, 200)
        by_id = {row['invoice_id']: row for row in recv.data['invoices']}
        self.assertEqual(by_id[a_id]['amount_outstanding'], 0.0)
        self.assertAlmostEqual(by_id[b_id]['amount_outstanding'], float(b_ttc - Decimal('10000')), places=2)
        self.assertEqual(by_id[c_id]['amount_outstanding'], float(c_ttc))
        expected_total = (b_ttc - Decimal('10000')) + c_ttc
        self.assertAlmostEqual(recv.data['total_outstanding'], float(expected_total), places=2)
        self.assertIn('aging', recv.data)
        for key in ('CURRENT', '1_30', '31_60', '61_90', '90_PLUS'):
            self.assertIn(key, recv.data['aging'])

    def test_dashboard_consistency_and_list_contract(self):
        inv = self.client.post(
            f'/api/v1/cases/{self.matter.id}/invoices/',
            {'amount_ht': '5000.00', 'due_date': (date.today() + timedelta(days=5)).isoformat()},
            format='json',
        )
        inv_id = inv.data['id']
        _send(self.client, inv_id)
        _pay(self.client, self.matter.id, inv_id, '2000.00')
        self.client.post(
            f'/api/v1/cases/{self.matter.id}/expenses/',
            {
                'description': 'Travel',
                'amount': '500.00',
                'expense_date': date.today().isoformat(),
            },
            format='json',
        )

        dash = self.client.get('/api/v1/finance/dashboard/', {'year': date.today().year})
        self.assertEqual(dash.status_code, 200)
        kpis = dash.data['kpis']
        self.assertGreater(kpis['total_received'], 0)
        self.assertEqual(kpis['total_ca_ttc'], kpis['ca_total'])
        self.assertEqual(kpis['total_expenses'], 500.0)
        self.assertIn('net_revenue', kpis)
        self.assertNotIn('Johnson', str(dash.data))

        # Firm list contract (frontend fields)
        invoices = self.client.get(
            '/api/v1/finance/invoices/',
            {'date_from': '2020-01-01', 'date_to': '2030-12-31', 'page_size': 10},
        )
        self.assertEqual(invoices.status_code, 200)
        self.assertIn('results', invoices.data)
        row = invoices.data['results'][0]
        self.assertIn('number', row)
        self.assertIn('case_reference', row)
        self.assertIn('client_name', row)
        self.assertEqual(row['case_reference'], 'ABC-XYZ-001')

        payments = self.client.get(
            '/api/v1/finance/payments/',
            {'method': 'CASH', 'date_from': '2020-01-01', 'page_size': 10},
        )
        self.assertEqual(payments.status_code, 200)
        self.assertGreaterEqual(len(payments.data['results']), 1)
        prow = payments.data['results'][0]
        self.assertIn('method', prow)
        self.assertIn('case_reference', prow)

    def test_invoice_status_machine(self):
        inv = self.client.post(
            f'/api/v1/cases/{self.matter.id}/invoices/',
            {'amount_ht': '1000.00'},
            format='json',
        )
        inv_id = inv.data['id']

        # PAID via status endpoint forbidden
        bad_paid = self.client.patch(
            f'/api/v1/finance/invoices/{inv_id}/status/',
            {'status': 'PAID'},
            format='json',
        )
        self.assertEqual(bad_paid.status_code, 400)

        _send(self.client, inv_id)
        _pay(self.client, self.matter.id, inv_id, '1000.00')
        paid = self.client.get(f'/api/v1/finance/invoices/{inv_id}/')
        self.assertEqual(paid.data['status'], 'PAID')

        # PAID → CANCELLED forbidden
        cancel_paid = self.client.patch(
            f'/api/v1/finance/invoices/{inv_id}/status/',
            {'status': 'CANCELLED'},
            format='json',
        )
        self.assertEqual(cancel_paid.status_code, 400)

        # Fresh draft → cancel ok
        inv2 = self.client.post(
            f'/api/v1/cases/{self.matter.id}/invoices/',
            {'amount_ht': '100.00'},
            format='json',
        )
        cancel_draft = self.client.patch(
            f'/api/v1/finance/invoices/{inv2.data["id"]}/status/',
            {'status': 'CANCELLED'},
            format='json',
        )
        self.assertEqual(cancel_draft.status_code, 200)
        self.assertEqual(cancel_draft.data['status'], 'CANCELLED')

        # CANCELLED → SENT forbidden
        reopen = self.client.patch(
            f'/api/v1/finance/invoices/{inv2.data["id"]}/status/',
            {'status': 'SENT'},
            format='json',
        )
        self.assertEqual(reopen.status_code, 400)

    def test_tax_advance_from_firm_settings(self):
        fs = FirmFinanceSettings.get_for_cabinet(self.cab)
        fs.tax_advance_default_amount = Decimal('250.00')
        fs.save(update_fields=['tax_advance_default_amount'])
        matter = _matter(self.cab, self.owner, self.client_user, title='New matter')
        ta = TaxAdvance.objects.filter(case=matter).first()
        self.assertEqual(ta.amount, Decimal('250.00'))
        self.assertTrue(
            ActivityLog.objects.filter(
                cabinet=self.cab, kind='finance_tax_advance_created', entity_id=str(ta.id)
            ).exists()
            or ActivityLog.objects.filter(cabinet=self.cab, kind='finance_tax_advance_created').exists()
        )

    def test_pdf_uses_db_data(self):
        inv = self.client.post(
            f'/api/v1/cases/{self.matter.id}/invoices/',
            {
                'items': [
                    {'description': 'UniqueLineItemXYZ', 'quantity': '1', 'unit_price': '1234.56'},
                ],
                'due_date': date.today().isoformat(),
            },
            format='json',
        )
        inv_id = inv.data['id']
        number = inv.data['invoice_number']
        pdf = self.client.get(f'/api/v1/finance/invoices/{inv_id}/pdf/')
        self.assertEqual(pdf.status_code, 200)
        self.assertTrue(pdf.content.startswith(b'%PDF'))
        self.assertIn('application/pdf', pdf['Content-Type'])
        # Filename is derived from persisted invoice_number (not demo data)
        cd = pdf.get('Content-Disposition', '')
        self.assertIn(number.replace('/', '_'), cd.replace('"', ''))

        # Service-level: PDF builder reads real DB invoice (items, client, number)
        from finance.services.invoice_pdf import build_invoice_pdf

        db_inv = (
            Invoice.objects.select_related('cabinet', 'case', 'client__user', 'fee')
            .prefetch_related('items')
            .get(pk=inv_id)
        )
        self.assertEqual(db_inv.invoice_number, number)
        self.assertEqual(db_inv.items.first().description, 'UniqueLineItemXYZ')
        raw = build_invoice_pdf(db_inv)
        self.assertTrue(raw.startswith(b'%PDF'))
        self.assertGreater(len(raw), 500)

    def test_tenant_isolation_and_roles(self):
        owner_b, cab_b = _owner('firmb', trade_name='Firm B')
        client_b = _client_user('bb')
        matter_b = _matter(cab_b, owner_b, client_b, title='Secret B')

        _auth(self.client, owner_b)
        inv_b = self.client.post(
            f'/api/v1/cases/{matter_b.id}/invoices/',
            {'amount_ht': '9999.00'},
            format='json',
        )
        self.assertEqual(inv_b.status_code, 201)
        inv_b_id = inv_b.data['id']

        # Firm A cannot see Firm B
        _auth(self.client, self.owner)
        self.assertEqual(self.client.get(f'/api/v1/finance/invoices/{inv_b_id}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/v1/finance/invoices/{inv_b_id}/pdf/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/v1/cases/{matter_b.id}/finance/').status_code, 404)
        recv = self.client.get('/api/v1/finance/receivables/')
        for row in recv.data['invoices']:
            self.assertNotEqual(row['invoice_id'], inv_b_id)

        # Lawyer cannot access finance
        lawyer = _user_with_role(self.cab, User.Role.LAWYER, 'lawyer')
        _auth(self.client, lawyer)
        self.assertEqual(self.client.get('/api/v1/finance/dashboard/').status_code, 403)
        self.assertEqual(self.client.get('/api/v1/finance/receivables/').status_code, 403)

        # Viewer forbidden
        viewer = _user_with_role(self.cab, User.Role.VIEWER, 'viewer')
        _auth(self.client, viewer)
        self.assertEqual(
            self.client.post(
                f'/api/v1/cases/{self.matter.id}/fees/',
                {'fee_type': 'FIXED', 'planned_amount': '1'},
                format='json',
            ).status_code,
            403,
        )

        # ADMIN allowed
        admin = _user_with_role(self.cab, User.Role.ADMIN, 'admin')
        _auth(self.client, admin)
        self.assertEqual(self.client.get('/api/v1/finance/dashboard/').status_code, 200)

    def test_decimal_money_safety(self):
        inv = self.client.post(
            f'/api/v1/cases/{self.matter.id}/invoices/',
            {
                'items': [
                    {'description': 'A', 'quantity': '1', 'unit_price': '10000.10'},
                    {'description': 'B', 'quantity': '1', 'unit_price': '0.20'},
                ],
            },
            format='json',
        )
        self.assertEqual(inv.status_code, 201, inv.data)
        self.assertEqual(Decimal(str(inv.data['amount_ht'])), Decimal('10000.30'))
        db = Invoice.objects.get(pk=inv.data['id'])
        self.assertEqual(db.amount_ht, Decimal('10000.30'))
