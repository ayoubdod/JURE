import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceStatsStrip } from '@/components/finance/stats/FinanceStatsStrip';
import { InvoiceDetailPanel } from '@/components/finance/panel/InvoiceDetailPanel';
import { navigateToCaseById } from '@/lib/caseRoutes';
import { getFinanceDashboard } from '@/services/finance/api';
import {
  normalizeFinanceDashboardPayload,
  enrichMonthlyFromRecentTransactions,
  enrichLawyersFromRecentTransactions,
} from '@/utils/normalizeFinanceDashboard';
import { FinanceDashboardTab } from './FinanceDashboardTab';
import { FinanceInvoicesTab } from './FinanceInvoicesTab';
import { FinancePaymentsTab } from './FinancePaymentsTab';
import { InvoiceUpdateModal } from '@/components/finance/modals/InvoiceUpdateModal';
import { getTVAStatus, type TVAStatus } from '@/services/financeService';
import { useAppTranslation } from '@/i18n';

const EMPTY_STATS: API.FinanceDashboardStats = {
  total_ca_ttc: 0,
  total_collected: 0,
  tva_unpaid: 0,
  tax_advances_due_mad: 0,
  tax_advances_unpaid_count: 0,
};

const FinancePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const year = new Date().getFullYear();
  const [dashboard, setDashboard] = useState<API.FinanceDashboard | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [dashReady, setDashReady] = useState(false);
  const [mainTab, setMainTab] = useState<'dashboard' | 'invoices' | 'payments'>('dashboard');
  const [invoicePanelId, setInvoicePanelId] = useState<number | null>(null);
  const [invoiceEditId, setInvoiceEditId] = useState<number | null>(null);
  const [invoiceListEpoch, setInvoiceListEpoch] = useState(0);
  const [tvaStatus, setTvaStatus] = useState<TVAStatus | null>(null);

  useEffect(() => {
    getTVAStatus().then((s) => setTvaStatus((prev) => prev ?? s));
  }, []);

  useEffect(() => {
    setDashReady(false);
    getFinanceDashboard(year)
      .then((res) => {
        const normalized = normalizeFinanceDashboardPayload(res.data);
        if (normalized.tva_status) {
          setTvaStatus(normalized.tva_status);
        }
        setDashboard(
          enrichLawyersFromRecentTransactions(
            enrichMonthlyFromRecentTransactions(normalized, year),
            year
          )
        );
        setLoadError(false);
      })
      .catch(() => {
        setLoadError(true);
        setDashboard(
          enrichLawyersFromRecentTransactions(
            enrichMonthlyFromRecentTransactions(normalizeFinanceDashboardPayload(null), year),
            year
          )
        );
      })
      .finally(() => setDashReady(true));
  }, [year]);

  const stats = dashboard?.stats ?? EMPTY_STATS;

  /** KPI strip: display backend stats only — never invent CA from TVA/monthly fallbacks. */
  const stripKpis = useMemo(() => {
    const s = dashboard?.stats ?? EMPTY_STATS;
    const apiCa = typeof s.total_ca_ttc === 'number' && !Number.isNaN(s.total_ca_ttc) ? s.total_ca_ttc : 0;
    const apiColl =
      typeof s.total_collected === 'number' && !Number.isNaN(s.total_collected) ? s.total_collected : 0;

    return {
      totalCaTtc: apiCa,
      totalCollected: apiColl,
      tvaUnpaid: s.tva_unpaid ?? 0,
      caHint: null as string | null,
      collectedHint: null as string | null,
    };
  }, [dashboard]);

  /** Prefer explicit MAD from API; never invent count × 100 client-side. */
  const taxAdvancesMad =
    typeof stats.tax_advances_due_mad === 'number' && !Number.isNaN(stats.tax_advances_due_mad)
      ? stats.tax_advances_due_mad
      : 0;

  const showEmptyDashboard = useMemo(() => {
    if (!dashboard || !dashReady) return false;
    const s = dashboard.stats ?? EMPTY_STATS;
    const noTx = (dashboard.recent_transactions?.length ?? 0) === 0;
    return (
      loadError ||
      (s.total_ca_ttc === 0 &&
        s.total_collected === 0 &&
        noTx &&
        (dashboard.monthly?.every((m) => !m.billed && !m.collected) ?? true))
    );
  }, [dashboard, loadError, dashReady]);

  const openCaseById = (caseId: number) => {
    void navigateToCaseById(navigate, caseId);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t.finance.title}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.finance.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-10 bg-jure-600 hover:bg-jure-700"
              onClick={() => navigate('/dashboard/cases')}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.finance.addPayment}
            </Button>
            <Button type="button" variant="outline" className="h-10" disabled>
              <Download className="mr-2 h-4 w-4" />
              {t.finance.export}
            </Button>
          </div>
        </div>
      </div>

      <FinanceStatsStrip
        totalCaTtc={stripKpis.totalCaTtc}
        totalCollected={stripKpis.totalCollected}
        tvaUnpaid={stripKpis.tvaUnpaid}
        taxAdvancesDueMad={taxAdvancesMad}
        tvaRegime={tvaStatus?.regime}
        tvaStatus={tvaStatus}
        caTotalHint={stripKpis.caHint}
        collectedHint={stripKpis.collectedHint}
      />

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-4 sm:px-4">
        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as typeof mainTab)}
          className="flex h-full min-h-0 flex-col gap-0"
        >
          <TabsList className="mb-4 h-11 w-full max-w-md justify-start rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/50">
            <TabsTrigger value="dashboard" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800">
              {t.finance.tabs.dashboard}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800">
              {t.finance.tabs.invoices}
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              data-finance-tab="payments"
              className="rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
            >
              {t.finance.tabs.payments}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0 min-h-0 flex-1 overflow-y-auto">
            {!dashReady ? (
              <div className="space-y-4 py-4">
                <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              </div>
            ) : (
              <FinanceDashboardTab
                dashboard={dashboard}
                year={year}
                showEmpty={showEmptyDashboard}
                onViewAllPayments={() => setMainTab('payments')}
                onOpenCase={(caseId) => openCaseById(caseId)}
                tvaStatus={tvaStatus}
              />
            )}
          </TabsContent>
          <TabsContent value="invoices" className="mt-0 min-h-0 flex-1 overflow-y-auto">
            <FinanceInvoicesTab
              listEpoch={invoiceListEpoch}
              onOpenInvoice={(id) => setInvoicePanelId(id)}
              onEditInvoice={(id) => setInvoiceEditId(id)}
            />
          </TabsContent>
          <TabsContent value="payments" className="mt-0 min-h-0 flex-1 overflow-y-auto">
            <FinancePaymentsTab />
          </TabsContent>
        </Tabs>
      </div>

      <InvoiceDetailPanel
        invoiceId={invoicePanelId}
        open={invoicePanelId != null}
        onOpenChange={(o) => {
          if (!o) setInvoicePanelId(null);
        }}
        onNavigateCase={(id) => openCaseById(id)}
        onEdit={(inv) => setInvoiceEditId(inv.id)}
        onInvoiceMutated={() => setInvoiceListEpoch((e) => e + 1)}
      />
      <InvoiceUpdateModal
        open={invoiceEditId != null}
        invoiceId={invoiceEditId}
        onOpenChange={(o) => {
          if (!o) setInvoiceEditId(null);
        }}
        onSuccess={() => {
          setInvoiceEditId(null);
          setInvoiceListEpoch((e) => e + 1);
        }}
      />
    </div>
  );
};

export default FinancePage;
