/**
 * Normalize GET /cases/:id/finance/ into the frontend FinanceCasePayload shape.
 * Backend may send either legacy or dual-key summary fields.
 */

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  return String(v);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function mapFeeStatus(raw: unknown): API.FinanceFeeStatus {
  const s = String(raw ?? '').toUpperCase();
  if (s === 'PARTIALLY_PAID' || s === 'PARTIAL') return 'PARTIALLY_PAID';
  if (s === 'PAID') return 'PAID';
  if (s === 'CANCELLED') return 'CANCELLED';
  if (s === 'INVOICED') return 'INVOICED';
  return 'PENDING';
}

function mapPaymentMethod(raw: unknown): API.FinancePaymentMethod {
  const s = String(raw ?? '').toUpperCase();
  if (s === 'BANK_TRANSFER') return 'BANK_TRANSFER';
  if (s === 'VIREMENT_BANCAIRE') return 'VIREMENT_BANCAIRE';
  if (s === 'CHEQUE') return 'CHEQUE';
  if (s === 'OTHER') return 'OTHER';
  return 'CASH';
}

export function normalizeCaseFinancePayload(raw: unknown): API.FinanceCasePayload {
  const root = asRecord(raw) ?? {};
  const summaryRaw = asRecord(root.summary) ?? {};

  const planned = num(summaryRaw.planned ?? summaryRaw.amount_expected);
  const invoiced = num(summaryRaw.invoiced ?? summaryRaw.total_billed);
  const paid = num(summaryRaw.paid ?? summaryRaw.total_paid);
  const remaining = num(summaryRaw.remaining ?? invoiced - paid);
  const remaining_status = ((): API.FinanceCaseSummary['remaining_status'] => {
    const s = str(summaryRaw.remaining_status).toLowerCase();
    if (s === 'settled' || s === 'overdue' || s === 'due') return s;
    if (remaining <= 0) return 'settled';
    return 'due';
  })();

  const feesRaw = Array.isArray(root.fees) ? root.fees : [];
  const fees: API.FinanceCaseFee[] = feesRaw.map((item) => {
    const f = asRecord(item) ?? {};
    const lawyer = asRecord(f.lawyer);
    const lawyerName =
      str(f.lawyer_name) ||
      (lawyer
        ? `${str(lawyer.firstName ?? lawyer.first_name)} ${str(lawyer.lastName ?? lawyer.last_name)}`.trim()
        : '');
    const plannedAmount = num(f.planned_amount ?? f.amount_expected ?? f.amount);
    return {
      id: num(f.id),
      fee_type: (str(f.fee_type, 'FIXED') as API.FinanceFeeType),
      status: mapFeeStatus(f.status),
      lawyer_name: lawyerName || '—',
      lawyer_id: f.lawyer_id != null ? num(f.lawyer_id) : null,
      planned_amount: plannedAmount,
      invoiced_amount: num(f.invoiced_amount ?? f.amount_billed),
      paid_amount: num(f.paid_amount ?? f.amount_paid),
      notes: (f.notes as string | null | undefined) ?? null,
      description: (f.description as string | null | undefined) ?? null,
      currency: str(f.currency, 'MAD'),
      amount_expected: plannedAmount,
      amount_billed: num(f.amount_billed ?? f.invoiced_amount),
      amount_paid: num(f.amount_paid ?? f.paid_amount),
    };
  });

  const invoicesRaw = Array.isArray(root.invoices) ? root.invoices : [];
  const invoices: API.FinanceCaseInvoice[] = invoicesRaw.map((item) => {
    const inv = asRecord(item) ?? {};
    const number = str(inv.number ?? inv.invoice_number);
    return {
      id: num(inv.id),
      number,
      invoice_number: number,
      status: str(inv.status, 'DRAFT') as API.FinanceInvoiceStatus,
      amount_ht: num(inv.amount_ht ?? inv.subtotal),
      tva: num(inv.tva ?? inv.tva_amount ?? inv.tax_amount),
      amount_ttc: num(inv.amount_ttc ?? inv.total),
      due_date: (inv.due_date as string | null) ?? null,
      issue_date: str(inv.issue_date ?? inv.issued_date),
      fee_id: inv.fee != null ? num(inv.fee) : inv.fee_id != null ? num(inv.fee_id) : null,
      tva_applicable: Boolean(inv.tva_applicable),
      tva_exoneration_note: (inv.tva_exoneration_note as string | null) ?? null,
      amount_paid: num(inv.amount_paid),
      amount_outstanding: num(inv.amount_outstanding),
      items: Array.isArray(inv.items) ? (inv.items as API.FinanceInvoiceItem[]) : [],
    };
  });

  const paymentsRaw = Array.isArray(root.payments) ? root.payments : [];
  const payments: API.FinanceCasePayment[] = paymentsRaw.map((item) => {
    const p = asRecord(item) ?? {};
    const invoice = asRecord(p.invoice);
    const method = mapPaymentMethod(p.method ?? p.payment_method);
    return {
      id: num(p.id),
      amount: num(p.amount),
      method,
      payment_method: method,
      reference: (p.reference as string | null) ?? null,
      date: str(p.date ?? p.payment_date),
      payment_date: str(p.payment_date ?? p.date),
      invoice_number:
        (invoice?.invoice_number as string | null | undefined) ??
        (p.invoice_number as string | null | undefined) ??
        null,
      invoice_id:
        invoice?.id != null
          ? num(invoice.id)
          : p.invoice_id != null
            ? num(p.invoice_id)
            : null,
      status: (str(p.status, 'CONFIRMED') as 'CONFIRMED' | 'CANCELLED'),
    };
  });

  const expensesRaw = Array.isArray(root.expenses) ? root.expenses : [];
  const expenses: API.FinanceExpense[] = expensesRaw.map((item) => {
    const e = asRecord(item) ?? {};
    return {
      id: num(e.id),
      description: str(e.description),
      category: (str(e.category, 'OTHER') as API.FinanceExpenseCategory),
      amount: num(e.amount),
      currency: str(e.currency, 'MAD'),
      expense_date: str(e.expense_date),
      billable: Boolean(e.billable ?? true),
      reimbursable: Boolean(e.reimbursable),
      receipt_reference: str(e.receipt_reference),
    };
  });

  const taxRaw = asRecord(root.tax_advance);
  const tax_advance: API.FinanceTaxAdvance | null = taxRaw
    ? {
        amount: num(taxRaw.amount),
        status: str(taxRaw.status, 'UNPAID') === 'PAID' ? 'PAID' : 'UNPAID',
        paid_at: (taxRaw.paid_at as string | null) ?? (taxRaw.paid_date as string | null) ?? null,
        paid_date: (taxRaw.paid_date as string | null) ?? (taxRaw.paid_at as string | null) ?? null,
      }
    : null;

  return {
    summary: {
      planned,
      invoiced,
      paid,
      remaining,
      remaining_status,
      total_expenses: num(summaryRaw.total_expenses ?? summaryRaw.expenses),
      expenses: num(summaryRaw.expenses ?? summaryRaw.total_expenses),
      outstanding: num(summaryRaw.outstanding ?? remaining),
      net_position: num(
        summaryRaw.net_position ??
          num(summaryRaw.paid ?? summaryRaw.total_paid) - num(summaryRaw.total_expenses ?? summaryRaw.expenses)
      ),
      amount_expected: planned,
      total_billed: invoiced,
      total_paid: paid,
    },
    fees,
    invoices,
    payments,
    expenses,
    tax_advance,
  };
}
