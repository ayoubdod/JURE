/**
 * Maps GET /finance/dashboard/ JSON into API.FinanceDashboard.
 * Handles snake_case / camelCase and common DRF field aliases.
 */

import { normalizeTvaPayload } from '@/services/financeService';

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

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
  }
  return undefined;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

const EMPTY_STATS: API.FinanceDashboardStats = {
  total_ca_ttc: 0,
  total_collected: 0,
  tva_unpaid: 0,
  tax_advances_due_mad: 0,
  tax_advances_unpaid_count: 0,
};

function normalizeStats(raw: unknown): API.FinanceDashboardStats {
  const o = asRecord(raw);
  if (!o) return { ...EMPTY_STATS };
  return {
    total_ca_ttc: num(
      pick(
        o,
        'total_ca_ttc',
        'totalCaTtc',
        'total_ttc',
        'totalTtc',
        'total_ca',
        'totalCa',
        'ca_ttc',
        'caTtc',
        'ca_total',
        'caTotal'
      )
    ),
    total_collected: num(
      pick(
        o,
        'total_collected',
        'totalCollected',
        'collected',
        'total_encaisse',
        'total_payments',
        'totalPayments',
        'encaissements',
        'total_received',
        'totalReceived'
      )
    ),
    tva_unpaid: num(pick(o, 'tva_unpaid', 'tvaUnpaid', 'tva_due', 'tvaDue', 'tva_to_pay', 'tvaToPay')),
    tax_advances_due_mad: num(
      pick(
        o,
        'tax_advances_due_mad',
        'taxAdvancesDueMad',
        'tax_advance_due',
        'acomptes_dus',
        'tax_advances_unpaid',
        'taxAdvancesUnpaid'
      )
    ),
    tax_advances_unpaid_count: Math.round(
      num(pick(o, 'tax_advances_unpaid_count', 'taxAdvancesUnpaidCount', 'unpaid_tax_advances_count'))
    ),
  };
}

function mergeRecords(...items: Array<Record<string, unknown> | null>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const item of items) {
    if (!item) continue;
    Object.assign(out, item);
  }
  return out;
}

/** Month 1–12 from API (number, "3", "2025-03", "2025-03-01", …). */
function parseMonthOneToTwelve(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') {
    if (v >= 1 && v <= 12) return v;
    if (v >= 0 && v <= 11) return v + 1;
    return null;
  }
  const s = String(v).trim();
  const iso = /^(\d{4})-(\d{2})/.exec(s);
  if (iso) {
    const m = parseInt(iso[2], 10);
    if (m >= 1 && m <= 12) return m;
  }
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n >= 1 && n <= 12) return n;
    if (n >= 0 && n <= 11) return n + 1;
  }
  return null;
}

function monthlyAmounts(p: Record<string, unknown>): { billed: number; collected: number } {
  const billed = num(
    pick(
      p,
      'billed',
      'factured',
      'amount_billed',
      'amountBilled',
      'ca',
      'total_billed',
      'billed_ttc',
      'billedTtc',
      'invoice_total',
      'invoiceTotal',
      'invoiced',
      'invoiced_amount',
      'invoicedAmount',
      'ttc',
      'amount_ttc',
      'amountTtc',
      'revenue',
      'total_ttc',
      'totalTtc'
    )
  );
  const collected = num(
    pick(
      p,
      'collected',
      'encaisse',
      'amount_collected',
      'amountCollected',
      'total_collected',
      'collected_ttc',
      'collectedTtc',
      'payment_total',
      'paymentTotal',
      'payments',
      'paid',
      'encashed'
    )
  );
  return { billed, collected };
}

/** Array of { month, billed, collected } or legacy rows. */
function normalizeMonthlyArray(raw: unknown[]): API.FinanceMonthlyPoint[] {
  const points: API.FinanceMonthlyPoint[] = [];
  for (const item of raw) {
    const p = asRecord(item);
    if (!p) continue;
    const month =
      parseMonthOneToTwelve(pick(p, 'month', 'month_index', 'monthIndex', 'period', 'label')) ??
      parseMonthOneToTwelve(pick(p, 'year_month', 'yearMonth'));
    if (month == null) continue;
    const { billed, collected } = monthlyAmounts(p);
    points.push({ month, billed, collected });
  }
  return points;
}

/** Object map: { "1": {...}, "2025-03": {...} } or { jan: ... } — best-effort. */
function normalizeMonthlyObject(raw: Record<string, unknown>): API.FinanceMonthlyPoint[] {
  const points: API.FinanceMonthlyPoint[] = [];
  for (const [key, val] of Object.entries(raw)) {
    let month: number | null = null;
    if (/^\d{1,2}$/.test(key)) {
      const k = parseInt(key, 10);
      if (k >= 1 && k <= 12) month = k;
    }
    if (month == null) month = parseMonthOneToTwelve(key);
    const p = asRecord(val);
    if (month == null || !p) continue;
    const { billed, collected } = monthlyAmounts(p);
    points.push({ month, billed, collected });
  }
  return points;
}

function normalizeMonthly(raw: unknown): API.FinanceMonthlyPoint[] {
  if (Array.isArray(raw)) return normalizeMonthlyArray(raw);
  const o = asRecord(raw);
  if (o) return normalizeMonthlyObject(o);
  return [];
}

/** Resolve display name for a lawyer row (flat fields or nested user/lawyer). */
function lawyerDisplayName(p: Record<string, unknown>): string {
  let name = str(
    pick(
      p,
      'lawyer_name',
      'lawyerName',
      'name',
      'user_name',
      'userName',
      'full_name',
      'fullName',
      'display_name',
      'displayName',
      'label'
    )
  );
  if (!name) {
    const f = str(pick(p, 'first_name', 'firstName'));
    const l = str(pick(p, 'last_name', 'lastName'));
    if (f || l) name = `${f} ${l}`.trim();
  }
  if (!name) {
    const nested = asRecord(pick(p, 'lawyer', 'user', 'cabinet_member', 'profile', 'member'));
    if (nested) {
      name = lawyerDisplayName(nested);
    }
  }
  if (!name) {
    const id = pick(p, 'lawyer_id', 'lawyerId', 'user_id', 'userId', 'pk', 'id');
    if (id != null && String(id).trim() !== '') name = `Avocat #${id}`;
  }
  return name;
}

const LAWYER_AMOUNT_KEYS = [
  'amount',
  'total',
  'revenue',
  'ca',
  'total_ttc',
  'totalTtc',
  'amount_ttc',
  'amountTtc',
  'ca_ttc',
  'caTtc',
  'ttc',
  'value',
  'sum',
  'billed',
  'total_ca',
  'totalCa',
] as const;

function lawyerAmount(p: Record<string, unknown>): number {
  const top = num(pick(p, ...LAWYER_AMOUNT_KEYS));
  if (top !== 0) return top;
  const nested = asRecord(pick(p, 'lawyer', 'user', 'cabinet_member', 'profile', 'member'));
  if (nested) {
    const inner = num(pick(nested, ...LAWYER_AMOUNT_KEYS));
    if (inner !== 0) return inner;
  }
  return top;
}

function normalizeLawyerRow(p: Record<string, unknown>): API.FinanceLawyerRevenue | null {
  const name = lawyerDisplayName(p);
  if (!name) return null;
  return { lawyer_name: name, amount: lawyerAmount(p) };
}

function normalizeLawyers(raw: unknown): API.FinanceLawyerRevenue[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    const out: API.FinanceLawyerRevenue[] = [];
    for (const item of raw) {
      const p = asRecord(item);
      if (!p) continue;
      const row = normalizeLawyerRow(p);
      if (row) out.push(row);
    }
    return out;
  }

  const o = asRecord(raw);
  if (!o) return [];
  const out: API.FinanceLawyerRevenue[] = [];
  for (const [key, val] of Object.entries(o)) {
    if (typeof val === 'number' || (typeof val === 'string' && String(val).trim() !== '')) {
      const amt = num(val);
      const idMatch = /^(\d+)$/.exec(key);
      const name = idMatch ? `Avocat #${idMatch[1]}` : key;
      out.push({ lawyer_name: name, amount: amt });
      continue;
    }
    const p = asRecord(val);
    if (p) {
      const row = normalizeLawyerRow(p);
      if (row) out.push(row);
    }
  }
  return out;
}

const LAWYER_SERIES_KEYS = [
  'revenue_by_lawyer',
  'revenueByLawyer',
  'lawyer_revenue',
  'lawyers',
  'by_lawyer',
  'ca_by_lawyer',
  'caByLawyer',
  'revenue_per_lawyer',
  'revenuePerLawyer',
] as const;

function pickLawyersRaw(root: Record<string, unknown>): unknown {
  let v = pick(root, ...LAWYER_SERIES_KEYS);
  if (v != null) return v;
  const charts = asRecord(pick(root, 'charts', 'figures', 'visualization'));
  if (charts) {
    v = pick(charts, ...LAWYER_SERIES_KEYS);
    if (v != null) return v;
  }
  const st = asRecord(pick(root, 'stats', 'summary', 'totals'));
  if (st) {
    v = pick(st, ...LAWYER_SERIES_KEYS);
    if (v != null) return v;
  }
  return undefined;
}

function mapTransactionKind(v: unknown): 'PAIEMENT' | 'FACTURE' {
  const s = String(v ?? '').toUpperCase();
  if (s === 'PAIEMENT' || s === 'PAYMENT' || s === 'PAY') return 'PAIEMENT';
  return 'FACTURE';
}

function mapAlertType(v: unknown): API.FinanceAlertType {
  const s = String(v ?? '').toUpperCase();
  if (s === 'UNPAID_TAX_ADVANCE' || s === 'TAX_ADVANCE') return 'UNPAID_TAX_ADVANCE';
  if (s === 'TVA_DUE' || s === 'TVA') return 'TVA_DUE';
  return 'OVERDUE_INVOICE';
}

function normalizeAlerts(raw: unknown): API.FinanceAlert[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const p = asRecord(item);
    if (!p) {
      return {
        id: `a-${i}`,
        type: 'OVERDUE_INVOICE',
        message: '',
        case_reference: null,
        amount: null,
        due_date: null,
      };
    }
    return {
      id: str(pick(p, 'id'), `a-${i}`),
      type: mapAlertType(pick(p, 'type', 'alert_type', 'alertType')),
      message: str(pick(p, 'message', 'detail', 'text')),
      case_id: (() => {
        const c = pick(p, 'case_id', 'caseId', 'case');
        return c != null ? num(c) : undefined;
      })(),
      case_reference: (pick(p, 'case_reference', 'caseReference') as string | null | undefined) ?? null,
      amount: (() => {
        const x = pick(p, 'amount', 'montant');
        return x == null ? null : num(x);
      })(),
      due_date: (pick(p, 'due_date', 'dueDate') as string | null | undefined) ?? null,
    };
  });
}

function normalizeRecent(raw: unknown): API.FinanceRecentTransaction[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const p = asRecord(item);
    if (!p) {
      return {
        id: `tx-${i}`,
        case_reference: '',
        client_name: '',
        amount: 0,
        kind: 'FACTURE',
        date: '',
      };
    }
    return {
      id: str(pick(p, 'id'), `tx-${i}`),
      case_reference: str(pick(p, 'case_reference', 'caseReference', 'matter_reference')),
      case_id: (() => {
        const c = pick(p, 'case_id', 'caseId', 'case');
        return c != null ? num(c) : undefined;
      })(),
      client_name: str(pick(p, 'client_name', 'clientName', 'client')),
      lawyer_name: (() => {
        const x = pick(
          p,
          'lawyer_name',
          'lawyerName',
          'lawyer',
          'user_name',
          'userName',
          'assigned_lawyer_name',
          'assignedLawyerName'
        );
        if (typeof x === 'string' && x.trim()) return x.trim();
        const lr = asRecord(x);
        if (lr) return lawyerDisplayName(lr) || undefined;
        return undefined;
      })(),
      amount: num(pick(p, 'amount', 'montant')),
      kind: mapTransactionKind(pick(p, 'kind', 'type', 'transaction_type')),
      date: str(pick(p, 'date', 'created_at', 'createdAt', 'payment_date', 'issue_date')),
    };
  });
}

/** Unwrap body if API nests payload once. */
function unwrapPayload(raw: unknown): Record<string, unknown> | null {
  const o = asRecord(raw);
  if (!o) return null;
  const inner = pick(o, 'data', 'results', 'dashboard');
  if (asRecord(inner)) return asRecord(inner)!;
  return o;
}

function parseTransactionDate(s: string): Date | null {
  if (!s || !String(s).trim()) return null;
  const t = String(s).trim();
  const iso = new Date(t);
  if (!Number.isNaN(iso.getTime())) return iso;
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (fr) {
    const d = parseInt(fr[1], 10);
    const mo = parseInt(fr[2], 10) - 1;
    const y = parseInt(fr[3], 10);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

/**
 * When the API omits `monthly` but returns totals + recent lines, rebuild 12 months from movements.
 */
export function enrichMonthlyFromRecentTransactions(
  dashboard: API.FinanceDashboard,
  year: number
): API.FinanceDashboard {
  const hasMonthly =
    dashboard.monthly.length > 0 &&
    dashboard.monthly.some((m) => m.billed > 0 || m.collected > 0);
  if (hasMonthly) return dashboard;

  const txs = dashboard.recent_transactions ?? [];
  if (txs.length === 0) return dashboard;

  const byMonth = new Map<number, { billed: number; collected: number }>();
  for (let m = 1; m <= 12; m++) byMonth.set(m, { billed: 0, collected: 0 });

  for (const t of txs) {
    const parsed = parseTransactionDate(t.date);
    if (!parsed || parsed.getFullYear() !== year) continue;
    const month = parsed.getMonth() + 1;
    const row = byMonth.get(month);
    if (!row) continue;
    const k = String(t.kind || '').toUpperCase();
    const amt = typeof t.amount === 'number' && !Number.isNaN(t.amount) ? t.amount : 0;
    if (k === 'PAIEMENT' || k === 'PAYMENT' || k === 'PAY') row.collected += amt;
    else row.billed += amt;
  }

  const monthly: API.FinanceMonthlyPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const v = byMonth.get(m)!;
    monthly.push({ month: m, billed: v.billed, collected: v.collected });
  }

  if (!monthly.some((x) => x.billed > 0 || x.collected > 0)) return dashboard;

  return { ...dashboard, monthly };
}

/**
 * When `revenue_by_lawyer` is missing or all zeros but recent movements carry a lawyer
 * label, aggregate amounts per lawyer for the selected year.
 */
export function enrichLawyersFromRecentTransactions(
  dashboard: API.FinanceDashboard,
  year: number
): API.FinanceDashboard {
  const series = dashboard.revenue_by_lawyer ?? [];
  const hasMeaningfulSeries = series.length > 0 && series.some((l) => l.amount > 0);
  if (hasMeaningfulSeries) return dashboard;

  const txs = dashboard.recent_transactions ?? [];
  const byLawyer = new Map<string, number>();
  for (const t of txs) {
    const name = t.lawyer_name?.trim();
    if (!name) continue;
    const parsed = parseTransactionDate(t.date);
    if (!parsed || parsed.getFullYear() !== year) continue;
    const amt = typeof t.amount === 'number' && !Number.isNaN(t.amount) ? t.amount : 0;
    byLawyer.set(name, (byLawyer.get(name) ?? 0) + amt);
  }
  if (byLawyer.size === 0) return dashboard;
  const revenue_by_lawyer: API.FinanceLawyerRevenue[] = [...byLawyer.entries()]
    .map(([lawyer_name, amount]) => ({ lawyer_name, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { ...dashboard, revenue_by_lawyer };
}

export function normalizeFinanceDashboardPayload(raw: unknown): API.FinanceDashboard {
  const root = unwrapPayload(raw) ?? {};
  const charts = asRecord(pick(root, 'charts', 'figures', 'visualization'));
  const statsNode = asRecord(pick(root, 'stats', 'summary', 'totals', 'overview'));
  const kpisNode = asRecord(pick(root, 'kpis', 'kpi'));
  const kpisInCharts = charts ? asRecord(pick(charts, 'kpis', 'kpi')) : null;

  const monthlyKeys = [
    'monthly',
    'monthly_revenue',
    'monthlyRevenue',
    'by_month',
    'byMonth',
    'revenue_by_month',
    'revenueByMonth',
    'ca_monthly',
    'caMonthly',
    'monthly_breakdown',
    'monthlyBreakdown',
  ] as const;

  let monthly = normalizeMonthly(pick(root, ...monthlyKeys));
  if (monthly.length === 0) {
    if (charts) monthly = normalizeMonthly(pick(charts, ...monthlyKeys));
  }
  if (monthly.length === 0) {
    if (statsNode) monthly = normalizeMonthly(pick(statsNode, ...monthlyKeys, 'per_month', 'perMonth'));
  }

  const RECENT_KEYS = [
    'recent_transactions',
    'recentTransactions',
    'transactions',
    'last_movements',
  ] as const;
  let recent_transactions = normalizeRecent(pick(root, ...RECENT_KEYS));
  if (recent_transactions.length === 0) {
    if (charts) recent_transactions = normalizeRecent(pick(charts, ...RECENT_KEYS));
  }

  const statsSource = mergeRecords(root, kpisNode, kpisInCharts, charts, statsNode);

  const rawTva = pick(root, 'tva_status', 'tvaStatus');
  const tva_status = rawTva != null && typeof rawTva === 'object' ? normalizeTvaPayload(rawTva) : null;

  return {
    stats: normalizeStats(statsSource),
    monthly,
    revenue_by_lawyer: normalizeLawyers(pickLawyersRaw(root)),
    alerts: normalizeAlerts(pick(root, 'alerts', 'warnings')),
    recent_transactions,
    ...(tva_status != null ? { tva_status } : {}),
  };
}
