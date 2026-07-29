import axiosInstance from '@/utils/axiosInstance';
import {
  filenameFromContentDisposition,
  openPdfBlobInNewTab,
  triggerBlobDownload,
} from '@/utils/invoicePdf';

const FINANCE_BASE = '/finance/';
const CASES_BASE = '/cases/';

export type InvoiceFilters = {
  status?: string;
  client?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
};

export type PaymentFilters = {
  method?: string;
  client?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
};

export const getFinanceDashboard = (year: number) =>
  axiosInstance.get<API.FinanceDashboard>(`${FINANCE_BASE}dashboard/`, {
    params: { year },
  });

export const getInvoices = (filters?: InvoiceFilters) =>
  axiosInstance.get<API.Paginated<API.FinanceInvoiceListItem>>(`${FINANCE_BASE}invoices/`, {
    params: filters,
  });

export const getPayments = (filters?: PaymentFilters) =>
  axiosInstance.get<API.Paginated<API.FinancePaymentListItem>>(`${FINANCE_BASE}payments/`, {
    params: filters,
  });

export const getCaseFinance = (caseId: number) =>
  axiosInstance.get<API.FinanceCasePayload>(`${CASES_BASE}${caseId}/finance/`);

export const getInvoiceDetail = (invoiceId: number) =>
  axiosInstance.get<API.FinanceInvoiceDetail>(`${FINANCE_BASE}invoices/${invoiceId}/`);

/** GET PDF binary — prefer `caseId` from dossier UI (`/cases/.../invoices/.../pdf/`). */
export const getInvoicePdf = (invoiceId: number, caseId?: number | null) => {
  const path =
    caseId != null && caseId > 0
      ? `${CASES_BASE}${caseId}/invoices/${invoiceId}/pdf/`
      : `${FINANCE_BASE}invoices/${invoiceId}/pdf/`;
  return axiosInstance.get<Blob>(path, { responseType: 'blob' });
};

export async function downloadInvoicePdfFile(invoiceId: number, caseId?: number | null): Promise<void> {
  const res = await getInvoicePdf(invoiceId, caseId);
  const cd = res.headers['content-disposition'] as string | undefined;
  const name = filenameFromContentDisposition(cd, `facture-${invoiceId}.pdf`);
  triggerBlobDownload(res.data, name);
}

/** Open PDF in a new tab; revokes the object URL after a delay. */
export async function previewInvoicePdfInNewTab(invoiceId: number, caseId?: number | null): Promise<void> {
  const res = await getInvoicePdf(invoiceId, caseId);
  const url = openPdfBlobInNewTab(res.data);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export type UpdateInvoiceBody = {
  amount_ht?: number;
  due_date?: string | null;
  notes?: string | null;
  tva_rate?: number | null;
};

/** PATCH /finance/invoices/:id/ — non-DRAFT: only due_date + notes (server enforces). */
export const updateInvoice = (invoiceId: number, data: UpdateInvoiceBody) =>
  axiosInstance.patch<API.FinanceInvoiceDetail>(`${FINANCE_BASE}invoices/${invoiceId}/`, data);

/** DELETE /finance/invoices/:id/ — 204 only for DRAFT. */
export const deleteInvoiceFinance = (invoiceId: number) =>
  axiosInstance.delete(`${FINANCE_BASE}invoices/${invoiceId}/`);

/** Firm-wide fee row (detail). */
export const getFeeDetail = (feeId: number) =>
  axiosInstance.get<API.FinanceCaseFee>(`${FINANCE_BASE}fees/${feeId}/`);

/** Firm-wide payment row (detail). */
export const getPaymentDetail = (paymentId: number) =>
  axiosInstance.get(`${FINANCE_BASE}payments/${paymentId}/`);

export type PatchInvoiceStatusBody = {
  status: API.FinanceInvoiceStatus;
};

export const patchInvoiceStatus = (invoiceId: number, data: PatchInvoiceStatusBody) =>
  axiosInstance.patch<API.FinanceInvoiceDetail>(`${FINANCE_BASE}invoices/${invoiceId}/status/`, data);

/** POST /cases/:id/fees/ — matches Django: optional lawyer_id = User.pk from GET /cabinets/members/. */
export type AddFeeBody = {
  fee_type: API.FinanceFeeType;
  lawyer_id?: number;
  /** Send this or `amount_expected`, not both unless equal. */
  planned_amount?: number;
  /** Same meaning as `planned_amount` on the backend. */
  amount_expected?: number;
  notes?: string;
};

export const addFee = (caseId: number, data: AddFeeBody) =>
  axiosInstance.post<API.FinanceCaseFee>(`${CASES_BASE}${caseId}/fees/`, data);

export type GenerateInvoiceBody = {
  fee_id: number;
  amount_ht: number;
  due_date: string;
  notes?: string;
};

export const generateInvoice = (caseId: number, data: GenerateInvoiceBody) =>
  axiosInstance.post<API.FinanceCaseInvoice>(`${CASES_BASE}${caseId}/invoices/`, data);

/** Request payload for POST /cases/:id/payments/ — Django expects `payment_method`, not `method`. */
export type AddPaymentBody = {
  amount: number;
  method: API.FinancePaymentMethod;
  payment_date: string;
  reference?: string;
  invoice_id?: number | null;
  notes?: string;
};

export const addPayment = (caseId: number, data: AddPaymentBody) => {
  const { method, ...rest } = data;
  return axiosInstance.post<API.FinanceCasePayment>(`${CASES_BASE}${caseId}/payments/`, {
    ...rest,
    payment_method: method,
  });
};

export const updateTaxAdvance = (caseId: number, data: { status: 'PAID' }) =>
  axiosInstance.patch<API.FinanceTaxAdvance>(`${CASES_BASE}${caseId}/tax-advance/`, data);

export const deleteFee = (caseId: number, feeId: number) =>
  axiosInstance.delete(`${CASES_BASE}${caseId}/fees/${feeId}/`);

/** @deprecated Prefer deleteInvoiceFinance — backend canonical: DELETE /finance/invoices/:id/ */
export const deleteInvoice = (caseId: number, invoiceId: number) =>
  axiosInstance.delete(`${CASES_BASE}${caseId}/invoices/${invoiceId}/`);

export const deletePayment = (caseId: number, paymentId: number) =>
  axiosInstance.delete(`${CASES_BASE}${caseId}/payments/${paymentId}/`);
