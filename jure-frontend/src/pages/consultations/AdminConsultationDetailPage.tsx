import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAppTranslation } from '@/i18n';
import {
  apiAddConsultationComment,
  apiAssignConsultationLawyer,
  apiConfirmConsultation,
  apiDeclineConsultation,
  apiGetConsultation,
  apiSetConsultationStatus,
  apiUpdateConsultationPriority,
  type ConsultationDetail,
  type ConsultationStatus,
} from '@/services/consultations/api';
import { apiGetCabinetMembers } from '@/services/cabinet-member/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConsultationStatusBadge } from '@/components/client/ConsultationStatusBadge';
import { useToast } from '@/hooks/use-toast';

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

const AdminConsultationDetailPage = () => {
  const { id } = useParams();
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  const admin = cp.admin;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<ConsultationDetail | null>(null);
  const [lawyers, setLawyers] = useState<API.CabinetMember[]>([]);
  const [lawyerId, setLawyerId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [clientComment, setClientComment] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!id) return;
    const res = await apiGetConsultation(id);
    setData(res.data);
    setStatus(res.data.status);
    if (res.data.assignedLawyer?.id) {
      setLawyerId(String(res.data.assignedLawyer.id));
    }
  };

  useEffect(() => {
    Promise.all([
      reload(),
      apiGetCabinetMembers().then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setLawyers(
          list.filter((m) =>
            ['OWNER', 'ADMIN', 'MANAGER', 'LAWYER'].includes(String(m.role || '')),
          ),
        );
      }),
    ])
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [id]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch {
      toast({ title: cp.errors.submitFailed, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="m-6 h-48 animate-pulse rounded-xl bg-muted" />;
  if (!data) {
    return <p className="m-6 text-sm text-destructive">{cp.errors.loadFailed}</p>;
  }

  return (
    <div className="grid gap-6 p-4 lg:grid-cols-[1fr_320px] sm:p-6">
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2">
            <Link to="/dashboard/consultations">{cp.common.back}</Link>
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{data.subject}</h1>
              <p className="text-sm text-muted-foreground">
                {data.reference} · {new Date(data.createdAt).toLocaleString()}
              </p>
            </div>
            <ConsultationStatusBadge
              status={data.status}
              label={cp.status[data.status] || data.status}
            />
          </div>
        </div>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {admin.clientSection}
          </h2>
          <p className="font-medium">{data.client?.fullName}</p>
          <p className="text-sm text-muted-foreground">{data.client?.email}</p>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {admin.requestSection}
          </h2>
          <p className="text-sm">
            <span className="text-muted-foreground">{cp.form.legalArea}: </span>
            {cp.legalAreas[data.legalArea] || data.legalArea}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.description}</p>
          {data.relatedCaseTitle && (
            <p className="text-sm text-muted-foreground">
              {cp.form.relatedCase}: {data.relatedCaseTitle}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">{cp.detail.timeline}</h2>
          <ol className="relative space-y-3 border-s ps-6">
            {data.events.map((ev) => (
              <li key={ev.id}>
                <p className="text-sm font-medium">
                  {cp.events[ev.event_type] || ev.event_type}
                  {ev.actorName ? ` — ${ev.actorName}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(ev.created).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">{cp.detail.comments}</h2>
          <ul className="space-y-2">
            {data.comments.map((c) => (
              <li key={c.id} className="rounded-lg border bg-card p-3 text-sm">
                <div className="mb-1 text-xs text-muted-foreground">
                  {c.visibility === 'INTERNAL' ? admin.internalNote : admin.clientComment}
                  {' · '}
                  {c.authorName}
                </div>
                {c.content}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4 rounded-xl border bg-card p-4 h-fit sticky top-20">
        <h2 className="font-semibold">{admin.actionPanel}</h2>

        <div className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">{admin.columns.status}</p>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {cp.status[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || status === data.status}
            onClick={() =>
              run(() => apiSetConsultationStatus(data.id, status as ConsultationStatus))
            }
          >
            {admin.setStatus}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">{admin.assignLawyer}</p>
          <Select value={lawyerId} onValueChange={setLawyerId}>
            <SelectTrigger>
              <SelectValue placeholder={admin.selectLawyer} />
            </SelectTrigger>
            <SelectContent>
              {lawyers.map((m) => {
                const name =
                  m.full_name ||
                  `${m.first_name || ''} ${m.last_name || ''}`.trim() ||
                  m.email;
                return (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={busy || !lawyerId}
            onClick={() => run(() => apiAssignConsultationLawyer(data.id, Number(lawyerId)))}
          >
            {admin.assign}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            disabled={busy}
            className="bg-[#64499D] hover:bg-[#553d86]"
            onClick={() => run(() => apiConfirmConsultation(data.id))}
          >
            {admin.confirm}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run(() => apiDeclineConsultation(data.id))}
          >
            {admin.decline}
          </Button>
          {data.conversationId && (
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/dashboard/conversations?selected=${data.conversationId}`)
              }
            >
              {admin.openChat}
            </Button>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs uppercase text-muted-foreground">{admin.clientComment}</p>
          <Textarea
            rows={3}
            value={clientComment}
            onChange={(e) => setClientComment(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy || !clientComment.trim()}
            onClick={() =>
              run(async () => {
                await apiAddConsultationComment(data.id, clientComment.trim(), 'CLIENT');
                setClientComment('');
              })
            }
          >
            {admin.addComment}
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs uppercase text-muted-foreground">{admin.internalNote}</p>
          <Textarea
            rows={3}
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !internalNote.trim()}
            onClick={() =>
              run(async () => {
                await apiAddConsultationComment(data.id, internalNote.trim(), 'INTERNAL');
                setInternalNote('');
              })
            }
          >
            {admin.addComment}
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs uppercase text-muted-foreground">{admin.priority}</p>
          <Select
            value={data.priority}
            onValueChange={(v) => run(() => apiUpdateConsultationPriority(data.id, v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">LOW</SelectItem>
              <SelectItem value="NORMAL">NORMAL</SelectItem>
              <SelectItem value="HIGH">HIGH</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </aside>
    </div>
  );
};

export default AdminConsultationDetailPage;
