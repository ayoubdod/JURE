import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/i18n';
import { apiListPortalCases, apiGetPortalCase } from '@/services/portal/api';
import { Button } from '@/components/ui/button';

type DocRow = {
  id: number;
  name: string;
  caseTitle: string;
  uploadedBy: string;
  date: string;
  url: string | null;
};

const ClientDocumentsPage = () => {
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const casesRes = await apiListPortalCases();
        const rows: DocRow[] = [];
        for (const c of casesRes.data) {
          const detail = await apiGetPortalCase(c.id);
          for (const d of detail.data.documents || []) {
            rows.push({
              id: d.id,
              name: d.name,
              caseTitle: c.title,
              uploadedBy: d.uploadedBy,
              date: d.date,
              url: d.url,
            });
          }
        }
        if (!cancelled) setDocs(rows);
      } catch {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-slate-200" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-[#2F2450]">{cp.documents.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{cp.documents.subtitle}</p>
      </div>
      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="font-medium">{cp.empty.noDocuments}</p>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {docs.map((d) => (
            <li key={`${d.id}-${d.caseTitle}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-slate-400">
                  {d.caseTitle} · {d.uploadedBy} · {new Date(d.date).toLocaleDateString()}
                </p>
              </div>
              {d.url ? (
                <a href={d.url} className="text-sm text-[#64499D] hover:underline" target="_blank" rel="noreferrer">
                  {cp.common.download}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="outline" size="sm">
        <Link to="/client/cases">{cp.cases.title}</Link>
      </Button>
    </div>
  );
};

export default ClientDocumentsPage;
