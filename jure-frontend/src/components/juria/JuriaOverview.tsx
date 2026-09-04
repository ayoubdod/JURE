import React from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen, Library, Users } from 'lucide-react';
import type { JuriaProject } from '@/types/juria';
import useJuriaStore from '@/stores/juriaStore';
import { useNavigate } from 'react-router';
import { navigateToCaseById } from '@/lib/caseRoutes';
import { JURIA_JURISDICTIONS } from '@/types/juria';
import dayjs from 'dayjs';
import { useAppTranslation } from '@/i18n';
import { JuriaLinkCaseControl } from '@/components/juria/JuriaLinkCaseControl';

export function JuriaOverview({ project }: { project: JuriaProject }) {
  const { t, tf } = useAppTranslation();
  const o = t.juria.workspace.overview;
  const setTab = useJuriaStore((s) => s.setActiveTab);
  const activities = useJuriaStore((s) => s.activities);
  const navigate = useNavigate();
  const ctx = project.context;
  const jur =
    JURIA_JURISDICTIONS.find((j) => j.code === project.jurisdiction_code)?.label ||
    project.jurisdiction_code;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{o.project}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{project.name}</h2>
          {project.description ? <p className="mt-2 text-sm text-slate-600">{project.description}</p> : null}
          <p className="mt-3 text-[12px] text-slate-500">
            {jur} · {project.preferred_language.toUpperCase()}
            {project.legal_domain ? ` · ${project.legal_domain}` : ''}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {tf(o.updatedAt, { date: dayjs(project.updated_at).format('DD MMM YYYY HH:mm') })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{o.linkedCase}</p>
          {project.linked_case_id ? (
            <>
              <p className="mt-1 font-medium">{project.linked_case_title}</p>
              <p className="text-[12px] text-slate-500">#{project.linked_case_reference}</p>
              <Button
                className="mt-3 h-8 bg-[#64499D] hover:bg-[#4D3680]"
                size="sm"
                onClick={() => void navigateToCaseById(navigate, project.linked_case_id!)}
              >
                {o.viewCase}
              </Button>
              <div className="mt-3">
                <JuriaLinkCaseControl project={project} compact />
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-500">{o.noCase}</p>
              <div className="mt-3">
                <JuriaLinkCaseControl project={project} compact />
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setTab('sources')}
          className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-left hover:border-[#64499D]/30 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <Library className="mb-2 h-4 w-4 text-[#64499D]" />
          <p className="text-sm font-medium">{o.sources}</p>
          <p className="mt-1 text-[12px] text-slate-500">
            {tf(o.sourcesMeta, {
              docs: ctx?.documents_count ?? 0,
              lib: ctx?.library_count ?? 0,
            })}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab('team')}
          className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-left hover:border-[#64499D]/30 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <Users className="mb-2 h-4 w-4 text-[#64499D]" />
          <p className="text-sm font-medium">{o.team}</p>
          <p className="mt-1 text-[12px] text-slate-500">
            {tf(o.membersCount, { count: project.member_count ?? project.members?.length ?? 0 })}
          </p>
        </button>
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{o.recentActivity}</p>
            <button type="button" className="text-[11px] text-[#64499D]" onClick={() => setTab('activity')}>
              {o.viewAll}
            </button>
          </div>
          {activities.slice(0, 5).length === 0 ? (
            <p className="text-sm text-slate-500">{o.noActivity}</p>
          ) : (
            <ul className="space-y-1 text-[13px] text-slate-600">
              {activities.slice(0, 5).map((a) => (
                <li key={a.id}>{a.action.replace(/_/g, ' ').toLowerCase()}</li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => setTab('chat')}
          className="md:col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-[#64499D] px-4 py-3 text-sm font-medium text-white hover:bg-[#4D3680]"
        >
          <FolderOpen className="h-4 w-4" />
          {o.openChat}
        </button>
      </div>
    </div>
  );
}
