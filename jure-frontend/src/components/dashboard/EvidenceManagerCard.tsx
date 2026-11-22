import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { useAppTranslation } from '@/i18n';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import { useToast } from '@/hooks/use-toast';
import {
  apiDeleteCaseAttachment,
  apiGetCaseAttachments,
  apiPatchCaseAttachment,
  apiUploadCaseAttachment,
} from '@/services/case/api';
import { devError } from '@/utils/devLog';

type Tag = 'privileged' | 'public' | 'internal';

type Props = {
  /** When set, uploads persist to case attachments (tenant-scoped). */
  caseId?: number;
  matterTitle?: string;
};

const TAGS: Tag[] = ['internal', 'privileged', 'public'];

function normalizeTag(raw: string | null | undefined): Tag {
  const v = (raw || '').trim().toLowerCase();
  if (v === 'privileged' || v === 'public' || v === 'internal') return v;
  return 'internal';
}

export default function EvidenceManagerCard({ caseId, matterTitle }: Props) {
  const { t } = useAppTranslation();
  const e = t.dashboard.evidence;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<API.CaseAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (caseId == null) return;
    setLoading(true);
    try {
      const res = await apiGetCaseAttachments(caseId);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      devError('Evidence load failed', err);
      setItems([]);
      toast({
        title: e.errors.load,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [caseId, e.errors.load, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.currentTarget.value = '';
    if (!file || caseId == null) return;
    setUploading(true);
    try {
      const res = await apiUploadCaseAttachment(caseId, file, 'internal');
      setItems((s) => [res.data, ...s]);
      toast({ title: e.toasts.uploaded });
    } catch (err) {
      devError('Evidence upload failed', err);
      toast({
        title: isAxiosError(err) && err.response?.status === 403 ? e.errors.forbidden : e.errors.upload,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const cycleTag = async (it: API.CaseAttachment) => {
    if (caseId == null) return;
    const current = normalizeTag(it.other_type);
    const next = TAGS[(TAGS.indexOf(current) + 1) % TAGS.length];
    try {
      const res = await apiPatchCaseAttachment(caseId, it.id, { other_type: next });
      setItems((s) => s.map((x) => (x.id === it.id ? res.data : x)));
    } catch (err) {
      devError('Evidence tag update failed', err);
      toast({ title: e.errors.tag, variant: 'destructive' });
    }
  };

  const onDelete = async (it: API.CaseAttachment) => {
    if (caseId == null) return;
    try {
      await apiDeleteCaseAttachment(caseId, it.id);
      setItems((s) => s.filter((x) => x.id !== it.id));
      toast({ title: e.toasts.deleted });
    } catch (err) {
      devError('Evidence delete failed', err);
      toast({ title: e.errors.delete, variant: 'destructive' });
    }
  };

  const tagLabel = (tag: Tag) => e.tags[tag];

  if (caseId == null) {
    return (
      <DashboardCollapsibleCard
        className="rounded-2xl"
        title={e.title}
        description={e.description}
        contentClassName="space-y-3"
        defaultOpen={false}
      >
        <p className="text-sm text-muted-foreground">{e.openMatterHint}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => navigate('/dashboard/cases')}
        >
          {e.openCases}
        </Button>
      </DashboardCollapsibleCard>
    );
  }

  return (
    <DashboardCollapsibleCard
      className="rounded-2xl"
      title={e.title}
      description={matterTitle ? `${e.description} — ${matterTitle}` : e.description}
      contentClassName="space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <input
          type="file"
          onChange={(ev) => void onUpload(ev)}
          disabled={uploading}
          className="text-xs text-slate-700 dark:text-slate-300"
          aria-label={e.uploadAria}
        />
      </div>
      <div className="max-h-48 space-y-2 overflow-auto">
        {loading ? (
          <div className="text-xs text-muted-foreground">{e.loading}</div>
        ) : (
          items.map((it) => {
            const tag = normalizeTag(it.other_type);
            return (
              <div
                key={it.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 p-2 dark:border-slate-800"
              >
                <div className="min-w-0 truncate text-sm text-slate-900 dark:text-white">
                  {it.file_name || `#${it.id}`}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] ${
                      tag === 'privileged'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                        : tag === 'public'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-500/15 text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {tagLabel(tag)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => void cycleTag(it)}>
                    {e.toggleTag}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void onDelete(it)}>
                    {e.delete}
                  </Button>
                </div>
              </div>
            );
          })
        )}
        {!loading && items.length === 0 ? (
          <div className="text-xs text-muted-foreground">{e.empty}</div>
        ) : null}
      </div>
    </DashboardCollapsibleCard>
  );
}
