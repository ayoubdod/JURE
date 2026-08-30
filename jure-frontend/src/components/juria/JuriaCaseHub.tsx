import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { navigateToCaseById } from '@/lib/caseRoutes';
import { apiGetAppointments } from '@/services/appointment/api';
import { apiGetCase } from '@/services/case/api';
import { apiGetTasks } from '@/services/task/api';
import type { JuriaProject } from '@/types/juria';
import dayjs from 'dayjs';

export function JuriaCaseHub({
  project,
  surface = 'case',
}: {
  project: JuriaProject;
  surface?: 'case' | 'calendar' | 'tasks';
}) {
  const navigate = useNavigate();
  const [caseItem, setCaseItem] = useState<API.Case | null>(null);
  const [tasks, setTasks] = useState<API.Task[]>([]);
  const [appointments, setAppointments] = useState<{ id: number; title: string; start_at: string }[]>([]);
  const connected = Boolean(project.linked_case_id);

  useEffect(() => {
    if (!project.linked_case_id) return;
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
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
        <p className="max-w-sm text-sm text-slate-500">
          {surface === 'calendar'
            ? 'Connectez un dossier pour afficher les échéances autorisées.'
            : surface === 'tasks'
              ? 'Connectez un dossier pour afficher les tâches autorisées.'
              : 'Liez un dossier JURE à ce projet pour exposer ses métadonnées à Juria.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {surface === 'case' && caseItem && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Dossier lié</p>
              <h3 className="mt-1 text-lg font-semibold">{caseItem.title}</h3>
              <p className="text-sm text-slate-500">
                {caseItem.reference} · {caseItem.status} · {caseItem.caseType || caseItem.case_type}
              </p>
              {caseItem.court && <p className="mt-2 text-sm">Tribunal : {caseItem.court}</p>}
              {caseItem.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{caseItem.description}</p>}
              <Button
                className="mt-4 bg-[#64499D] hover:bg-[#4D3680]"
                onClick={() => void navigateToCaseById(navigate, caseItem.id)}
              >
                Voir le dossier
              </Button>
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
            {tasks.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {t.title} — {t.status}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
