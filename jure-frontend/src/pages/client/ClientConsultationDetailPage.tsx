import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAppTranslation } from '@/i18n';
import {
  apiAddConsultationComment,
  apiGetConsultation,
  type ConsultationDetail,
  type ConsultationStatus,
} from '@/services/consultations/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConsultationStatusBadge } from '@/components/client/ConsultationStatusBadge';
import { useToast } from '@/hooks/use-toast';

const ClientConsultationDetailPage = () => {
  const { consultationId } = useParams();
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<ConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const reload = () => {
    if (!consultationId) return;
    return apiGetConsultation(consultationId)
      .then((res) => setData(res.data))
      .catch(() => setError(true));
  };

  useEffect(() => {
    setLoading(true);
    reload()?.finally(() => setLoading(false));
  }, [consultationId]);

  const sendComment = async () => {
    if (!consultationId || !comment.trim()) return;
    setSending(true);
    try {
      await apiAddConsultationComment(consultationId, comment.trim(), 'CLIENT');
      setComment('');
      await reload();
    } catch {
      toast({ title: cp.errors.submitFailed, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="h-48 animate-pulse rounded-xl bg-slate-200" />;
  if (error || !data) {
    return <p className="text-sm text-rose-600">{cp.errors.loadFailed}</p>;
  }

  const chatReady = Boolean(data.chatAvailable && data.conversationId);

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2">
          <Link to="/client/consultations">{cp.common.back}</Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-[#2F2450]">{data.subject}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {data.reference} · {new Date(data.createdAt).toLocaleString()}
            </p>
          </div>
          <ConsultationStatusBadge
            status={data.status as ConsultationStatus}
            label={cp.status[data.status] || data.status}
          />
        </div>
      </div>

      {data.status === 'CONFIRMED' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            {cp.detail.confirmedTitle}
          </p>
          <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
            {cp.detail.confirmedBody}
          </p>
          {chatReady && (
            <Button
              className="mt-4 bg-[#64499D] hover:bg-[#553d86]"
              onClick={() =>
                navigate(`/client/messages?selected=${data.conversationId}`)
              }
            >
              {cp.detail.joinChat}
            </Button>
          )}
        </div>
      )}

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.form.legalArea}</p>
          <p className="mt-1">{cp.legalAreas[data.legalArea] || data.legalArea}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.form.format}</p>
          <p className="mt-1">{cp.formats[data.preferredFormat] || data.preferredFormat}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.detail.lawyer}</p>
          <p className="mt-1">{data.assignedLawyer?.fullName || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.form.relatedCase}</p>
          <p className="mt-1">
            {data.relatedCaseTitle
              ? `${data.relatedCaseTitle}`
              : cp.form.noRelatedCase}
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">{cp.form.description}</h2>
        <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed dark:border-zinc-800 dark:bg-zinc-900">
          {data.description}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{cp.detail.timeline}</h2>
        <ol className="relative space-y-4 border-s border-slate-200 ps-6 dark:border-zinc-700">
          {data.events.map((ev) => (
            <li key={ev.id} className="relative">
              <span className="absolute -start-[1.55rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[#64499D]" />
              <p className="text-sm font-medium">
                {cp.events[ev.event_type] || ev.event_type}
                {ev.actorName ? ` — ${ev.actorName}` : ''}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(ev.created).toLocaleString()}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{cp.detail.comments}</h2>
        {data.comments.length === 0 ? (
          <p className="text-sm text-slate-500">{cp.empty.noComments}</p>
        ) : (
          <ul className="space-y-3">
            {data.comments.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <blockquote className="text-sm leading-relaxed">“{c.content}”</blockquote>
                <p className="mt-2 text-xs text-slate-400">
                  {c.authorName} · {new Date(c.created).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={cp.detail.commentPlaceholder}
          />
          <Button
            size="sm"
            disabled={sending || !comment.trim()}
            onClick={sendComment}
            className="bg-[#64499D] hover:bg-[#553d86]"
          >
            {cp.detail.sendComment}
          </Button>
        </div>
      </section>

      {data.attachments?.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">{cp.form.documents}</h2>
          <ul className="divide-y rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {data.attachments.map((att) => (
              <li key={att.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <span>{att.name}</span>
                {att.url && (
                  <a href={att.url} className="text-[#64499D] hover:underline" target="_blank" rel="noreferrer">
                    {cp.common.download}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {chatReady && data.status !== 'CONFIRMED' && (
        <Button
          className="bg-[#64499D] hover:bg-[#553d86]"
          onClick={() => navigate(`/client/messages?selected=${data.conversationId}`)}
        >
          {cp.detail.joinChat}
        </Button>
      )}
    </div>
  );
};

export default ClientConsultationDetailPage;
