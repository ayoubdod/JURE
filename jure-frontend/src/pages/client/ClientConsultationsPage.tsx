import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/i18n';
import {
  apiListConsultations,
  type ConsultationListItem,
  type ConsultationStatus,
} from '@/services/consultations/api';
import { Button } from '@/components/ui/button';
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-[#2F2450]">{cp.consultations.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{cp.consultations.subtitle}</p>
        </div>
        <Button asChild className="bg-[#64499D] hover:bg-[#553d86]" size="sm">
          <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="font-medium">{cp.empty.noConsultationsTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{cp.empty.noConsultationsBody}</p>
          <Button asChild className="mt-4 bg-[#64499D] hover:bg-[#553d86]" size="sm">
            <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <p className="font-medium">{item.subject}</p>
                <p className="text-xs text-slate-500">
                  {item.reference} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ConsultationStatusBadge
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
