/**
 * Normalize GET /users/:id/workspace/ — supports camelCase (canonical) and snake_case.
 */
export function normalizeUserWorkspace(raw: unknown): API.UserWorkspace {
  if (!raw || typeof raw !== 'object') {
    return {
      tasks: [],
      availability: {
        totalAssigned: 0,
        inProgress: 0,
        urgent: 0,
        upcomingEvents: [],
        workloadLevel: 'LOW',
      },
    };
  }
  const r = raw as Record<string, unknown>;
  const tasksRaw = (r.tasks as unknown[]) ?? [];
  const tasks: API.UserWorkspaceTask[] = tasksRaw.map((t) => {
    if (!t || typeof t !== 'object') {
      return { id: 0, title: '', status: '' };
    }
    const x = t as Record<string, unknown>;
    const related =
      (x.relatedCase as API.UserWorkspaceRelatedCase | null | undefined) ??
      (x.related_case as API.UserWorkspaceRelatedCase | null | undefined) ??
      null;
    return {
      id: Number(x.id) || 0,
      title: String(x.title ?? ''),
      status: String(x.status ?? ''),
      priority: (x.priority as string | null | undefined) ?? null,
      dueDate: ((x.dueDate ?? x.due_date) as string | null | undefined) ?? null,
      relatedCase: related,
      estimatedHours: ((x.estimatedHours ?? x.estimated_hours) as number | null | undefined) ?? null,
    };
  });

  const avIn = (r.availability as Record<string, unknown>) ?? {};
  const totalAssigned = Number(avIn.totalAssigned ?? avIn.total_assigned ?? 0);
  const inProgress = Number(avIn.inProgress ?? avIn.in_progress ?? 0);
  const urgent = Number(avIn.urgent ?? 0);
  const wlRaw = String(avIn.workloadLevel ?? avIn.workload_level ?? 'LOW').toUpperCase();
  const workloadLevel =
    wlRaw === 'MEDIUM' || wlRaw === 'HIGH' || wlRaw === 'LOW' ? (wlRaw as 'LOW' | 'MEDIUM' | 'HIGH') : 'LOW';

  const eventsRaw = (avIn.upcomingEvents as unknown[]) ?? (avIn.upcoming_events as unknown[]) ?? [];
  const upcomingEvents: API.UserWorkspaceUpcomingEvent[] = eventsRaw
    .filter((e) => e && typeof e === 'object')
    .map((e) => {
      const ev = e as Record<string, unknown>;
      return {
        type: String(ev.type ?? ''),
        title: String(ev.title ?? ''),
        date: String(ev.date ?? ''),
        label: String(ev.label ?? ''),
        caseReference: ((ev.caseReference ?? ev.case_reference) as string | null | undefined) ?? null,
      };
    });

  return {
    tasks,
    availability: {
      totalAssigned,
      inProgress,
      urgent,
      upcomingEvents,
      workloadLevel,
    },
  };
}
