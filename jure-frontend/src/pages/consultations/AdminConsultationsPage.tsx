import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/i18n';
import {
  apiListConsultations,
  type ConsultationListItem,
  type ConsultationStatus,
} from '@/services/consultations/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConsultationStatusBadge } from '@/components/client/ConsultationStatusBadge';

const STATUSES: ConsultationStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_INFORMATION',
  'ASSIGNED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'DECLINED',
];

const AdminConsultationsPage = () => {
  const { t } = useAppTranslation();
  const admin = t.clientPortal.admin;
  const cp = t.clientPortal;
  const [items, setItems] = useState<ConsultationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    apiListConsultations({
      status: status === 'all' ? undefined : status,
      search: search || undefined,
    })
      .then((res) => {
        const raw = res.data;
        setItems(Array.isArray(raw) ? raw : raw?.results || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [status, search]);

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{admin.listTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{admin.listSubtitle}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={admin.filters.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{admin.filters.allStatuses}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {cp.status[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="max-w-xs"
          placeholder={admin.filters.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : error ? (
        <p className="text-sm text-destructive">{cp.errors.loadFailed}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b bg-muted/40 text-start">
              <tr>
                <th className="px-4 py-3 font-medium">{admin.columns.client}</th>
                <th className="px-4 py-3 font-medium">{admin.columns.subject}</th>
                <th className="px-4 py-3 font-medium">{admin.columns.legalArea}</th>
                <th className="px-4 py-3 font-medium">{admin.columns.submitted}</th>
                <th className="px-4 py-3 font-medium">{admin.columns.status}</th>
                <th className="px-4 py-3 font-medium">{admin.columns.lawyer}</th>
                <th className="px-4 py-3 font-medium">{admin.columns.priority}</th>
                <th className="px-4 py-3 font-medium">{admin.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {cp.empty.noConsultationsTitle}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{row.clientName}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.subject}</div>
                      <div className="text-xs text-muted-foreground">{row.reference}</div>
                    </td>
                    <td className="px-4 py-3">
                      {cp.legalAreas[row.legalArea] || row.legalArea}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <ConsultationStatusBadge
                        status={row.status}
                        label={cp.status[row.status] || row.status}
                      />
                    </td>
                    <td className="px-4 py-3">{row.assignedLawyerName || '—'}</td>
                    <td className="px-4 py-3">{row.priority}</td>
                    <td className="px-4 py-3">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/dashboard/consultations/${row.id}`}>{cp.common.view}</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminConsultationsPage;
