import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { navigateToCaseById } from '@/lib/caseRoutes';
import { apiGetAppointments } from '@/services/appointment/api';
import { apiGetCase } from '@/services/case/api';
import { apiGetTasks } from '@/services/task/api';
import type { JuriaProject } from '@/types/juria';
import dayjs from 'dayjs';
import { JuriaLinkCaseControl } from '@/components/juria/JuriaLinkCaseControl';
import { useAppTranslation } from '@/i18n';

export function JuriaCaseHub({
  project,
  surface = 'case',
}: {
  project: JuriaProject;
  surface?: 'case' | 'calendar' | 'tasks';
}) {
  const { t } = useAppTranslation();
  const o = t.juria.workspace.overview;
  const navigate = useNavigate();
  const [caseItem, setCaseItem] = useState<API.Case | null>(null);
  const [tasks, setTasks] = useState<API.Task[]>([]);
  const [appointments, setAppointments] = useState<{ id: number; title: string; start_at: string }[]>([]);
  const connected = Boolean(project.linked_case_id);

  useEffect(() => {
    if (!project.linked_case_id) {
      setCaseItem(null);
      setTasks([]);
      setAppointments([]);
      return;
    }
    void apiGetCase(project.linked_case_id)
      .then((r) => setCaseItem(r.data))
      .catch(() => setCaseItem(null));
    if (surface === 'tasks') {
      void apiGetTasks({ case: project.linked_case_id, page_size: 20 })
        .then((r) => setTasks(r.data?.results ?? []))
        .catch(() => setTasks([]));
    }
    if (surface === 'calendar') {
      void apiGetAppointments({ case: project.linked_case_id, page_size: 20 })
        .then((r) => setAppointments(r.data?.results ?? []))
        .catch(() => setAppointments([]));
    }
  }, [project.linked_case_id, surface]);

  if (!connected) {
    const hint =
      surface === 'calendar' ? o.connectCalendar : surface === 'tasks' ? o.connectTasks : o.noCase;
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="max-w-sm text-sm text-slate-500">{hint}</p>
        <JuriaLinkCaseControl project={project} />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {surface === 'case' && caseItem && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">{o.linkedCase}</p>
              <h3 className="mt-1 text-lg font-semibold">{caseItem.title}</h3>
              <p className="text-sm text-slate-500">
                {caseItem.reference} · {caseItem.status} · {caseItem.caseType || caseItem.case_type}
              </p>
              {caseItem.court && <p className="mt-2 text-sm">Tribunal : {caseItem.court}</p>}
              {caseItem.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{caseItem.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  className="bg-[#64499D] hover:bg-[#4D3680]"
                  onClick={() => void navigateToCaseById(navigate, caseItem.id)}
                >
                  {o.viewCase}
                </Button>
                <JuriaLinkCaseControl project={project} compact />
              </div>
            </div>
          </>
        )}
        {surface === 'calendar' && (
          <div className="space-y-2">
            {appointments.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-500">Aucun événement connecté pour ce dossier.</p>
            )}
            {appointments.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {a.title} — {dayjs(a.start_at).format('DD MMM YYYY HH:mm')}
              </div>
            ))}
          </div>
        )}
        {surface === 'tasks' && (
          <div className="space-y-2">
            {tasks.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-500">Aucune tâche liée à ce dossier.</p>
            )}
            {tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {task.title} — {task.status}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
