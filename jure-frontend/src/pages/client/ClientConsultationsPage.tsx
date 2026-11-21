import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/i18n';
import {
  apiListConsultations,
  type ConsultationListItem,
  type ConsultationStatus,
} from '@/services/consultations/api';
import { Button } from '@/components/ui/button';
import { ClientPageHeader } from '@/components/client/ClientPageHeader';
import { ConsultationStatusBadge } from '@/components/client/ConsultationStatusBadge';

const ClientConsultationsPage = () => {
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  const [items, setItems] = useState<ConsultationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiListConsultations()
      .then((res) => {
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : raw?.results || [];
        setItems(list);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-slate-200" />;
  if (error) return <p className="text-sm text-rose-600">{cp.errors.loadFailed}</p>;

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title={cp.consultations.title}
        subtitle={cp.consultations.subtitle}
        actions={
          <Button asChild className="bg-[#64499D] text-white hover:bg-[#4D3680]" size="sm">
            <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <div className="border-t border-[#E2E8F0] pt-6 dark:border-zinc-800">
          <p className="text-[14px] font-medium text-[#0F172A] dark:text-slate-100">{cp.empty.noConsultationsTitle}</p>
          <p className="mt-1 text-[13px] text-[#64748B]">{cp.empty.noConsultationsBody}</p>
          <Button asChild className="mt-4 bg-[#64499D] text-white hover:bg-[#4D3680]" size="sm">
            <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
          </Button>
        </div>
      ) : (
        <ul className="border-t border-[#E2E8F0] dark:border-zinc-800">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-1 py-3.5 transition-colors duration-200 ease-out last:border-b-0 hover:bg-[#F7F4FF] dark:border-zinc-800 dark:hover:bg-white/[0.04]"
            >
              <div>
                <p className="font-medium">{item.subject}</p>
                <p className="text-xs text-slate-500">
                  {item.reference} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ConsultationStatusBadge
                  quiet
                  status={item.status as ConsultationStatus}
                  label={cp.status[item.status] || item.status}
                />
                <Button asChild variant="outline" size="sm">
                  <Link to={`/client/consultations/${item.id}`}>{cp.common.view}</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientConsultationsPage;
