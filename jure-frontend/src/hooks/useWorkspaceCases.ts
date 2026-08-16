import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { apiGetCases, GetCasesParams, apiCountCases } from '@/services/case/api';
import { eventBus } from '@/utils/eventBus';

export type WorkspaceCaseType = 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE';

export type WorkspaceListFilters = Omit<GetCasesParams, 'caseType' | 'page' | 'page_size'>;

type KpiSpec = { key: string; params?: WorkspaceListFilters };

export function useWorkspaceCases(options: {
  caseType: WorkspaceCaseType;
  search: string;
  filters: WorkspaceListFilters;
  page: number;
  pageSize: number;
  kpiSpecs: KpiSpec[];
  refreshKey?: number;
}) {
  const { caseType, search, filters, page, pageSize, kpiSpecs, refreshKey = 0 } = options;
  const [rows, setRows] = useState<API.Case[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [kpiValues, setKpiValues] = useState<Record<string, number>>({});

  const debouncedSearch = useDebounce(search, 300);
  const listParams = useMemo<GetCasesParams>(
    () => ({
      ...filters,
      search: debouncedSearch.trim() || undefined,
      caseType,
      page,
      page_size: pageSize,
    }),
    [filters, debouncedSearch, caseType, page, pageSize]
  );

  const fetchList = useCallback(() => {
    setIsLoading(true);
    setLoadError(false);
    apiGetCases(listParams)
      .then((res) => {
        setRows(res.data?.results ?? []);
        setTotalCount(res.data?.count ?? 0);
      })
      .catch(() => {
        setLoadError(true);
        setRows([]);
        setTotalCount(0);
      })
      .finally(() => setIsLoading(false));
  }, [listParams]);

  const fetchKpis = useCallback(() => {
    Promise.all(
      kpiSpecs.map(async (spec) => {
        const count = await apiCountCases({ caseType, ...spec.params }).catch(() => 0);
        return [spec.key, count] as const;
      })
    ).then((entries) => setKpiValues(Object.fromEntries(entries)));
  }, [caseType, kpiSpecs]);

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshKey]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis, refreshKey]);

  useEffect(() => {
    const onUpdated = () => {
      fetchList();
      fetchKpis();
    };
    eventBus.on('case-updated', onUpdated);
    return () => eventBus.off('case-updated', onUpdated);
  }, [fetchList, fetchKpis]);

  const patchRow = useCallback((caseId: number, patch: Partial<API.Case>) => {
    setRows((prev) => prev.map((c) => (c.id === caseId ? { ...c, ...patch } : c)));
  }, []);

  return {
    rows,
    totalCount,
    isLoading,
    loadError,
    kpiValues,
    refetch: () => {
      fetchList();
      fetchKpis();
    },
    patchRow,
  };
}
