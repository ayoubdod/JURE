declare namespace API {
  type FinanceInvoiceStatus =
    | 'DRAFT'
    | 'SENT'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'OVERDUE'
    | 'CANCELLED';

  type FinancePaymentMethod = 'CASH' | 'VIREMENT_BANCAIRE' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

  type FinanceFeeType = 'FIXED' | 'HOURLY' | 'SUCCESS_FEE';

  type FinanceFeeStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'INVOICED' | 'PARTIAL';

  type FinanceExpenseCategory = 'TRAVEL' | 'COURT' | 'EXPERT' | 'ADMIN' | 'OTHER';

  type FinanceAlertType = 'OVERDUE_INVOICE' | 'UNPAID_TAX_ADVANCE' | 'TVA_DUE';

  interface FinanceDashboardStats {
    total_ca_ttc: number;
    total_collected: number;
    tva_unpaid: number;
    tax_advances_due_mad: number;
    tax_advances_unpaid_count: number;
    outstanding?: number;
    invoices_total?: number;
    invoices_unpaid?: number;
    invoices_partially_paid?: number;
    invoices_paid?: number;
    invoices_overdue?: number;
    total_outstanding?: number;
    total_overdue?: number;
  }

  interface FinanceMonthlyPoint {
    month: number;
    billed: number;
    collected: number;
  }

  interface FinanceLawyerRevenue {
    lawyer_name: string;
    amount: number;
  }

  interface FinanceAlert {
    id: string;
    type: FinanceAlertType;
    message: string;
    case_id?: number;
    case_reference?: string | null;
    amount?: number | null;
    due_date?: string | null;
  }

  interface FinanceRecentTransaction {
    id: string;
    case_reference: string;
    case_id?: number;
    client_name: string;
    /** When present, used to rebuild “CA par avocat” if the API omits `revenue_by_lawyer`. */
    lawyer_name?: string;
    amount: number;
    kind: 'PAIEMENT' | 'FACTURE';
    date: string;
  }

  interface FinanceDashboard {
    stats: FinanceDashboardStats;
    monthly: FinanceMonthlyPoint[];
    revenue_by_lawyer: FinanceLawyerRevenue[];
    alerts: FinanceAlert[];
    recent_transactions: FinanceRecentTransaction[];
    /** Present when backend sends top-level `tva_status` (Art. 89 — same shape as GET /finance/tva-status/). */
    tva_status?: import('../financeService').TVAStatus | null;
  }

  interface FinanceInvoiceListItem {
    id: number;
    number: string;
    case_id: number;
    case_reference: string;
    client_name: string;
    amount_ht: number;
    tva: number;
    amount_ttc: number;
    status: FinanceInvoiceStatus;
    issue_date: string;
    due_date?: string | null;
    /** Frozen at invoice creation — when false, TVA amounts are 0 and exoneration note applies. */
    tva_applicable?: boolean;
    tva_exoneration_note?: string | null;
  }

  interface FinancePaymentListItem {
    id: number;
    case_id: number;
    case_reference: string;
    client_name: string;
    amount: number;
    method: FinancePaymentMethod;
    reference: string | null;
    linked_invoice_number: string | null;
    linked_invoice_id: number | null;
    date: string;
  }

  interface FinanceCaseSummary {
    planned: number;
    invoiced: number;
    paid: number;
    remaining: number;
    remaining_status: 'settled' | 'due' | 'overdue';
    total_expenses?: number;
    expenses?: number;
    outstanding?: number;
    net_position?: number;
    amount_expected?: number;
    total_billed?: number;
    total_paid?: number;
  }

  interface FinanceCaseFee {
    id: number;
    fee_type: FinanceFeeType;
    status: FinanceFeeStatus;
    lawyer_name: string;
    lawyer_id?: number | null;
    planned_amount: number;
    invoiced_amount: number;
    paid_amount: number;
    hourly_rate?: number | null;
    notes?: string | null;
    description?: string | null;
    currency?: string;
    amount_expected?: number;
    amount_billed?: number;
    amount_paid?: number;
  }

  interface FinanceCaseInvoice {
    id: number;
    number: string;
    invoice_number?: string;
    status: FinanceInvoiceStatus;
    amount_ht: number;
    tva: number;
    amount_ttc: number;
    due_date: string | null;
    issue_date: string;
    fee_id?: number | null;
    tva_applicable?: boolean;
    tva_exoneration_note?: string | null;
    amount_paid?: number;
    amount_outstanding?: number;
    items?: FinanceInvoiceItem[];
  }

  interface FinanceInvoiceItem {
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    fee?: number | null;
    expense?: number | null;
  }

  interface FinanceCasePayment {
    id: number;
    amount: number;
    method: FinancePaymentMethod;
    payment_method?: FinancePaymentMethod;
    reference: string | null;
    date: string;
    payment_date?: string;
    invoice_number: string | null;
    invoice_id: number | null;
    status?: 'CONFIRMED' | 'CANCELLED';
  }

  interface FinanceExpense {
    id: number;
    description: string;
    category: FinanceExpenseCategory;
    amount: number;
    currency: string;
    expense_date: string;
    billable: boolean;
    reimbursable: boolean;
    receipt_reference?: string;
  }

  interface FinanceTaxAdvance {
    amount: number;
    status: 'UNPAID' | 'PAID';
    paid_at?: string | null;
    paid_date?: string | null;
  }

  interface FinanceCasePayload {
    summary: FinanceCaseSummary;
    fees: FinanceCaseFee[];
    invoices: FinanceCaseInvoice[];
    payments: FinanceCasePayment[];
    expenses?: FinanceExpense[];
    tax_advance: FinanceTaxAdvance | null;
  }

  interface FinanceReceivables {
    total_invoiced: number;
    total_collected: number;
    total_outstanding: number;
    total_overdue: number;
    aging: {
      CURRENT: number;
      '1_30': number;
      '31_60': number;
      '61_90': number;
      '90_PLUS': number;
    };
    invoices: Array<{
      invoice_id: number;
      invoice_number: string;
      case_id: number;
      case_reference: string;
      client_name: string;
      status: FinanceInvoiceStatus;
      total: number;
      amount_paid: number;
      amount_outstanding: number;
      due_date: string | null;
      aging_bucket: string | null;
      is_overdue: boolean;
    }>;
  }

  interface FinanceInvoiceDetail extends FinanceInvoiceListItem {
    client_ice?: string | null;
    client_if?: string | null;
    created_by_name?: string | null;
    notes?: string | null;
    tva_rate?: number | null;
    amount_paid?: number;
    amount_outstanding?: number;
    items?: FinanceInvoiceItem[];
    payments: Array<{
      id: number;
      amount: number;
      method: FinancePaymentMethod;
      date: string;
      reference: string | null;
    }>;
  }
}
