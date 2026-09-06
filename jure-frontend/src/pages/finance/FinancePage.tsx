import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Download, LayoutDashboard, FileText, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceStatsStrip } from '@/components/finance/stats/FinanceStatsStrip';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceChrome';
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

function emptyDashboard(year: number): API.FinanceDashboard {
  return enrichLawyersFromRecentTransactions(
    enrichMonthlyFromRecentTransactions(normalizeFinanceDashboardPayload(null), year),
    year
  );
}

const FinancePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const year = new Date().getFullYear();
  const [dashboard, setDashboard] = useState<API.FinanceDashboard>(() => emptyDashboard(year));
  const [loadError, setLoadError] = useState(false);
  const [dashReady, setDashReady] = useState(false);
  const [mainTab, setMainTab] = useState<'dashboard' | 'invoices' | 'payments'>('dashboard');
  const [invoicePanelId, setInvoicePanelId] = useState<number | null>(null);
  const [invoiceEditId, setInvoiceEditId] = useState<number | null>(null);
  const [invoiceListEpoch, setInvoiceListEpoch] = useState(0);
  const [tvaStatus, setTvaStatus] = useState<TVAStatus | null>(null);
  const [listToolbar, setListToolbar] = useState<ReactNode>(null);
  const onListToolbarChange = useCallback((node: ReactNode | null) => {
    setListToolbar(node);
  }, []);

  useEffect(() => {
    getTVAStatus().then((s) => setTvaStatus((prev) => prev ?? s));
  }, []);

  const loadDashboard = useCallback(() => {
    getFinanceDashboard(year, 'year')
      .then((res) => {
        try {
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
        } catch {
          setLoadError(true);
          setDashboard(emptyDashboard(year));
        }
      })
      .catch(() => {
        setLoadError(true);
        setDashboard(emptyDashboard(year));
      })
      .finally(() => {
        setDashReady(true);
      });
  }, [year]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="px-3 pb-8 pt-2 sm:px-4 lg:px-5">
          <WorkspacePageHeader
            title={t.finance.title}
            subtitle={t.finance.subtitle}
            actions={
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <Button
                  type="button"
                  size="sm"
                  className="h-9 flex-1 bg-jure-600 px-3 text-[13px] font-semibold text-white hover:bg-jure-700 sm:flex-none"
                  onClick={() => navigate('/dashboard/cases')}
                >
                  <Plus className="me-1.5 h-4 w-4" />
                  {t.finance.addPayment}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-9" disabled>
                  <Download className="me-1.5 h-4 w-4" />
                  {t.finance.export}
                </Button>
              </div>
            }
          />

          <FinanceStatsStrip
            pending={!dashReady}
            totalCaTtc={stripKpis.totalCaTtc}
            totalCollected={stripKpis.totalCollected}
            tvaUnpaid={stripKpis.tvaUnpaid}
            taxAdvancesDueMad={taxAdvancesMad}
            tvaRegime={tvaStatus?.regime}
            tvaStatus={tvaStatus}
            caTotalHint={stripKpis.caHint}
            collectedHint={stripKpis.collectedHint}
          />

          <Tabs
            value={mainTab}
            onValueChange={(v) => setMainTab(v as typeof mainTab)}
            className="mt-5 w-full min-w-0"
          >
            <div className="ws-toolbar-sticky sticky top-0 z-30 mb-3 min-w-0 w-full py-2">
              <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950 sm:p-2">
              <TabsList className="mb-0 flex h-auto w-full min-w-0 justify-stretch gap-0 overflow-x-auto rounded-lg bg-transparent p-0 [scrollbar-width:none] dark:bg-transparent [&::-webkit-scrollbar]:hidden">
              <TabsTrigger
                value="dashboard"
                className="min-w-0 flex-1 rounded-lg px-2 text-[12px] data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none sm:px-4 sm:text-[13px] dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
              >
                <LayoutDashboard className="me-1 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{t.finance.tabs.dashboard}</span>
              </TabsTrigger>
              <TabsTrigger
                value="invoices"
                className="min-w-0 flex-1 rounded-lg px-2 text-[12px] data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none sm:px-4 sm:text-[13px] dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
              >
                <FileText className="me-1 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{t.finance.tabs.invoices}</span>
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                data-finance-tab="payments"
                className="min-w-0 flex-1 rounded-lg px-2 text-[12px] data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none sm:px-4 sm:text-[13px] dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
              >
                <Wallet className="me-1 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{t.finance.tabs.payments}</span>
              </TabsTrigger>
            </TabsList>
            {mainTab !== 'dashboard' && listToolbar ? (
              <div className="mt-1.5 border-t border-slate-100 px-0.5 pt-1.5 dark:border-slate-800">
                {listToolbar}
              </div>
            ) : null}
              </div>
            </div>

            <TabsContent value="dashboard" className="mt-0 w-full min-w-0">
              <FinanceDashboardTab
                dashboard={dashboard}
                year={year}
                showEmpty={dashReady && showEmptyDashboard}
                onViewAllPayments={() => setMainTab('payments')}
                onOpenCase={(caseId) => openCaseById(caseId)}
                onAlertsMutated={() => loadDashboard()}
                tvaStatus={tvaStatus}
              />
            </TabsContent>
            <TabsContent value="invoices" className="mt-0 w-full min-w-0">
              <FinanceInvoicesTab
                listEpoch={invoiceListEpoch}
                onOpenInvoice={(id) => setInvoicePanelId(id)}
                onEditInvoice={(id) => setInvoiceEditId(id)}
                onToolbarChange={onListToolbarChange}
              />
            </TabsContent>
            <TabsContent value="payments" className="mt-0 w-full min-w-0">
              <FinancePaymentsTab onToolbarChange={onListToolbarChange} />
            </TabsContent>
          </Tabs>
        </div>
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
