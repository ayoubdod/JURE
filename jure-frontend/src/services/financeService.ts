import axiosInstance from '@/utils/axiosInstance';
import { parseFormattedMADString } from '@/utils/formatMAD';

/** Finance API — re-exports for consumers expecting `financeService` naming. */
export {
  getCaseFinance,
  addFee,
  generateInvoice,
  addPayment,
  getFinanceDashboard,
  updateTaxAdvance,
  getInvoices,
  getPayments,
  getInvoiceDetail,
  getInvoicePdf,
  downloadInvoicePdfFile,
  previewInvoicePdfInNewTab,
  updateInvoice,
  getFeeDetail,
  getPaymentDetail,
  patchInvoiceStatus,
  deleteFee,
  deleteInvoice,
  deleteInvoiceFinance,
  deletePayment,
} from './finance/api';
export type {
  InvoiceFilters,
  PaymentFilters,
  PatchInvoiceStatusBody,
  UpdateInvoiceBody,
} from './finance/api';

export type TVARegime = 'EXONÉRÉ' | 'ASSUJETTI';

/**
 * Normalized TVA block — GET /finance/tva-status/ and top-level `tva_status` on GET /finance/dashboard/.
 * Regime strings like "ASSUJETTI À LA TVA" map to internal `regime` ASSUJETTI.
 */
export type TVAStatus = {
  regime: TVARegime;
  /** Original API label when useful for display (e.g. ASSUJETTI À LA TVA). */
  regime_label?: string;
  is_tva_applicable: boolean;
  cumulative_ca_mad: number;
  threshold_mad: number;
  remaining_mad: number | null;
  /** 0–100 when API provides it (Art. 89 cumulative threshold). */
  threshold_percentage: number | null;
  lifetime_ca_display: string | null;
  threshold_display: string | null;
  ca_remaining_display: string | null;
  tva_became_applicable_at: string | null;
  tva_threshold_crossed_amount: string | null;
  /** Legal disclaimer from the API. */
  note: string;
  /** Alias: date TVA became mandatory (ISO), aligned with `tva_became_applicable_at`. */
  crossed_at: string | null;
  firm_created_at: string | null;
  /** Backend one-time flag for global banner / notifications. */
  notify_threshold_crossed?: boolean;
};

const DEFAULT_THRESHOLD = 500_000;

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  return String(v);
}

function pick(o: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(o, k) && o[k] != null) return o[k];
  }
  return undefined;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function normalizeRegime(raw: unknown): TVARegime {
  const s = String(raw ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (
    s.includes('ASSUJET') ||
    s === 'TAXABLE' ||
    s === 'SUBJECT' ||
    s === 'VAT_APPLICABLE' ||
    s === 'TRUE'
  ) {
    return 'ASSUJETTI';
  }
  return 'EXONÉRÉ';
}

/** True when the cabinet is not subject to VAT on new invoices (exoneration / below threshold). */
export function isCabinetTvaExonerated(s: TVAStatus | null | undefined): boolean {
  if (!s) return false;
  if (typeof s.is_tva_applicable === 'boolean') return !s.is_tva_applicable;
  return s.regime === 'EXONÉRÉ';
}

export function normalizeTvaPayload(raw: unknown): TVAStatus {
  const root = asRecord(raw);
  const inner = asRecord(pick(root ?? {}, 'data', 'tva_status', 'status'));
  const o = inner ?? root ?? {};

  const regimeRaw = pick(o, 'regime', 'tva_regime', 'vat_regime', 'status', 'mode');
  const regime_label = str(regimeRaw, '') || undefined;
  const regime = normalizeRegime(regimeRaw);

  const isApplicableRaw = pick(o, 'is_tva_applicable', 'isTvaApplicable', 'vat_applicable');
  const is_tva_applicable =
    typeof isApplicableRaw === 'boolean'
      ? isApplicableRaw
      : regime === 'ASSUJETTI';

  const lifetimeStr = pick(o, 'lifetime_ca', 'lifetimeCa', 'lifetime_ca_mad', 'lifetimeCaMad');
  const thresholdStr = pick(o, 'threshold', 'threshold_mad', 'thresholdMad', 'legal_threshold_mad');
  const caRemainingStr = pick(o, 'ca_remaining', 'caRemaining', 'remaining_before_threshold');

  const lifetime_ca_display = lifetimeStr != null ? str(lifetimeStr) : null;
  const threshold_display = thresholdStr != null ? str(thresholdStr) : null;
  const ca_remaining_display = caRemainingStr != null ? str(caRemainingStr) : null;

  let cumulative_ca_mad =
    parseFormattedMADString(lifetimeStr) ??
    num(
      pick(
        o,
        'cumulative_ca_mad',
        'cumulativeCaMad',
        'total_ca_cumulative_mad',
        'ca_cumulatif_mad',
        'ca_cumule_mad'
      )
    );

  let threshold_mad =
    parseFormattedMADString(thresholdStr) ||
    num(pick(o, 'threshold_mad', 'thresholdMad', 'legal_threshold_mad')) ||
    DEFAULT_THRESHOLD;

  const pctRaw = pick(o, 'threshold_percentage', 'thresholdPercentage');
  let threshold_percentage: number | null = null;
  if (pctRaw != null && pctRaw !== '') {
    const p = num(pctRaw);
    if (Number.isFinite(p)) threshold_percentage = Math.min(100, Math.max(0, p));
  }

  let remaining_mad: number | null = null;
  if (is_tva_applicable) {
    remaining_mad = null;
  } else {
    const parsedRem = parseFormattedMADString(caRemainingStr);
    if (parsedRem != null) {
      remaining_mad = Math.max(0, parsedRem);
    } else {
      const remRaw = pick(o, 'remaining_mad', 'remainingMad');
      if (remRaw != null && remRaw !== '') {
        remaining_mad = Math.max(0, num(remRaw));
      } else {
        remaining_mad = Math.max(0, threshold_mad - cumulative_ca_mad);
      }
    }
  }

  const tva_became_applicable_at = (() => {
    const x = pick(o, 'tva_became_applicable_at', 'tvaBecameApplicableAt');
    return x != null ? String(x) : null;
  })();

  const crossedLegacy = pick(o, 'crossed_at', 'crossedAt', 'assujetti_depuis', 'vat_applicable_since');
  const crossed_at =
    tva_became_applicable_at ?? (crossedLegacy != null ? String(crossedLegacy) : null);

  const tva_threshold_crossed_amount = (() => {
    const x = pick(o, 'tva_threshold_crossed_amount', 'tvaThresholdCrossedAmount');
    if (x == null) return null;
    const s = str(x);
    return s.trim() === '' ? null : s;
  })();

  const firmRaw = pick(o, 'firm_created_at', 'firmCreatedAt', 'cabinet_created_at', 'created_at');

  const notify = pick(o, 'notify_threshold_crossed', 'notifyThresholdCrossed', 'show_threshold_banner');

  const note = str(pick(o, 'note', 'legal_note', 'disclaimer'), '');

  return {
    regime,
    ...(regime_label ? { regime_label } : {}),
    is_tva_applicable,
    cumulative_ca_mad,
    threshold_mad,
    remaining_mad,
    threshold_percentage,
    lifetime_ca_display,
    threshold_display,
    ca_remaining_display,
    tva_became_applicable_at,
    tva_threshold_crossed_amount,
    note,
    crossed_at,
    firm_created_at: firmRaw != null ? String(firmRaw) : null,
    notify_threshold_crossed: notify === true || notify === 'true' || notify === 1,
  };
}

export async function getTVAStatus(): Promise<TVAStatus | null> {
  try {
    const { data } = await axiosInstance.get<unknown>('/finance/tva-status/');
    return normalizeTvaPayload(data);
  } catch {
    return null;
  }
}
