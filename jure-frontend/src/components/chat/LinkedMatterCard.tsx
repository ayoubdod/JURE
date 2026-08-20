import React from 'react';
import { Calendar, CheckSquare, ExternalLink, FileText, Flag, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import {
  formatCaseRef,
  humanizeToken,
  linkedCaseDotClass,
  parseLinkedCaseId,
} from './conversationUtils';

export type LinkedMatterTab = 'documents' | 'tasks' | 'deadlines' | 'appointments';

const LinkedMatterCard: React.FC<{
  linkedCase: API.LinkedCaseSummary | null;
  canManage?: boolean;
  onOpenLinkedCase?: (caseId: number) => void;
  onOpenLinkedCaseTab?: (caseId: number, tab: LinkedMatterTab) => void;
  onOpenLinkCaseModal?: () => void;
  onUnlinkConversationCase?: () => void | Promise<void>;
}> = ({
  linkedCase,
  canManage,
  onOpenLinkedCase,
  onOpenLinkedCaseTab,
  onOpenLinkCaseModal,
  onUnlinkConversationCase,
}) => {
  const { t, enumLabel } = useAppTranslation();
  const [unlinkConfirm, setUnlinkConfirm] = React.useState(false);
  const caseId = linkedCase ? parseLinkedCaseId(linkedCase) : null;
  const typeLabel = linkedCase
    ? humanizeToken(linkedCase.caseType ?? linkedCase.case_type)
    : '';
  const statusLabel = linkedCase?.status
    ? enumLabel('caseStatus', linkedCase.status) || humanizeToken(linkedCase.status)
    : '';

  const shortcuts: { tab: LinkedMatterTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'documents', label: t.conversations.viewDocuments, icon: <FileText className="h-3.5 w-3.5" /> },
    { tab: 'tasks', label: t.conversations.viewTasks, icon: <CheckSquare className="h-3.5 w-3.5" /> },
    { tab: 'deadlines', label: t.conversations.viewDeadlines, icon: <Flag className="h-3.5 w-3.5" /> },
    { tab: 'appointments', label: t.conversations.viewAppointments, icon: <Calendar className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Link2 className="h-3 w-3" />
        {t.conversations.linkedMatter}
      </p>
      {linkedCase ? (
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-start gap-2">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', linkedCaseDotClass(linkedCase))} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {formatCaseRef(linkedCase)}
              </p>
              <p className="mt-0.5 line-clamp-3 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                {linkedCase.title ?? '—'}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {typeLabel ? (
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                    {typeLabel}
                  </span>
                ) : null}
                {statusLabel ? (
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    {statusLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {caseId != null && onOpenLinkedCase ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full gap-1.5 text-[12px]"
              onClick={() => onOpenLinkedCase(caseId)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t.conversations.openMatter}
            </Button>
          ) : null}

          {caseId != null && onOpenLinkedCaseTab ? (
            <div className="grid grid-cols-2 gap-1">
              {shortcuts.map((s) => (
                <button
                  key={s.tab}
                  type="button"
                  onClick={() => onOpenLinkedCaseTab(caseId, s.tab)}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-1.5 text-[10px] font-medium text-slate-600 transition-colors hover:bg-white hover:text-[#64499D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {s.icon}
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
          ) : null}

          {canManage ? (
            <div className="flex flex-wrap gap-1.5">
              {onOpenLinkCaseModal ? (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onOpenLinkCaseModal}>
                  {t.conversations.changeCase}
                </Button>
              ) : null}
              {onUnlinkConversationCase ? (
                unlinkConfirm ? (
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-500">{t.conversations.removeLink}?</span>
                    <button
                      type="button"
                      className="font-medium text-red-600 hover:underline"
                      onClick={() => {
                        void onUnlinkConversationCase();
                        setUnlinkConfirm(false);
                      }}
                    >
                      {t.common.yes}
                    </button>
                    <button
                      type="button"
                      className="text-slate-500 hover:underline"
                      onClick={() => setUnlinkConfirm(false)}
                    >
                      {t.common.no}
                    </button>
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-red-600 hover:text-red-700"
                    onClick={() => setUnlinkConfirm(true)}
                  >
                    {t.conversations.removeLink}
                  </Button>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center dark:border-slate-700">
          <p className="mb-2 text-[12px] text-slate-500">{t.conversations.noCaseLinked}</p>
          {canManage && onOpenLinkCaseModal ? (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-[11px]" onClick={onOpenLinkCaseModal}>
              <Link2 className="h-3.5 w-3.5" />
              {t.conversations.linkCaseAction}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LinkedMatterCard;
