declare namespace API {
  type FinanceInvoiceStatus =
    | 'DRAFT'
    | 'SENT'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'OVERDUE'
    | 'CANCELLED';

  type FinancePaymentMethod = 'CASH' | 'VIREMENT_BANCAIRE' | 'CHEQUE';

  type FinanceFeeType = 'FIXED' | 'HOURLY' | 'SUCCESS_FEE';

  type FinanceFeeStatus = 'PENDING' | 'INVOICED' | 'PAID' | 'PARTIAL';

  type FinanceAlertType = 'OVERDUE_INVOICE' | 'UNPAID_TAX_ADVANCE' | 'TVA_DUE';

  interface FinanceDashboardStats {
    total_ca_ttc: number;
    total_collected: number;
    tva_unpaid: number;
    tax_advances_due_mad: number;
    tax_advances_unpaid_count: number;
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
  }

  interface FinanceCaseFee {
    id: number;
    fee_type: FinanceFeeType;
    status: FinanceFeeStatus;
    lawyer_name: string;
    lawyer_id?: number;
    planned_amount: number;
    invoiced_amount: number;
    paid_amount: number;
    hourly_rate?: number | null;
    notes?: string | null;
  }

  interface FinanceCaseInvoice {
    id: number;
    number: string;
    status: FinanceInvoiceStatus;
    amount_ht: number;
    tva: number;
    amount_ttc: number;
    due_date: string | null;
    issue_date: string;
    fee_id?: number | null;
    tva_applicable?: boolean;
    tva_exoneration_note?: string | null;
  }

  interface FinanceCasePayment {
    id: number;
    amount: number;
    method: FinancePaymentMethod;
    reference: string | null;
    date: string;
    invoice_number: string | null;
    invoice_id: number | null;
  }

  interface FinanceTaxAdvance {
    amount: number;
    status: 'UNPAID' | 'PAID';
    paid_at?: string | null;
  }

  interface FinanceCasePayload {
    summary: FinanceCaseSummary;
    fees: FinanceCaseFee[];
    invoices: FinanceCaseInvoice[];
    payments: FinanceCasePayment[];
    tax_advance: FinanceTaxAdvance;
  }

  interface FinanceInvoiceDetail extends FinanceInvoiceListItem {
    client_ice?: string | null;
    client_if?: string | null;
    created_by_name?: string | null;
    notes?: string | null;
    tva_rate?: number | null;
    payments: Array<{
      id: number;
      amount: number;
      method: FinancePaymentMethod;
      date: string;
      reference: string | null;
    }>;
  }
}
