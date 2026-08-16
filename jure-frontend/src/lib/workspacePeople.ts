export type PersonLike = {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
} | null | undefined;

export function displayPersonName(person: PersonLike, fallback = '—'): string {
  if (!person || typeof person !== 'object') return fallback;
  const name = `${person.first_name || ''} ${person.last_name || ''}`.trim();
  return name || person.email || fallback;
}

export function taskAssigneeUser(task: API.Task | null): API.User | null {
  if (!task) return null;
  const details = task.assigned_to_details;
  if (details && typeof details === 'object' && (details as API.User).email) return details as API.User;
  const raw = task.assigned_to as unknown;
  if (raw && typeof raw === 'object' && raw !== null && 'email' in raw) return raw as API.User;
  return null;
}

export function taskAssigneeId(task: API.Task | null): number | undefined {
  if (!task) return undefined;
  const user = taskAssigneeUser(task);
  if (user?.id != null) return user.id;
  if (typeof task.assigned_to === 'number') return task.assigned_to;
  return undefined;
}

export function taskClientUser(task: API.Task | null): { id?: number; first_name?: string; last_name?: string; email?: string } | null {
  if (!task) return null;
  const details = task.client_details as unknown;
  if (details && typeof details === 'object' && details !== null) {
    return details as { id?: number; first_name?: string; last_name?: string; email?: string };
  }
  const raw = task.client as unknown;
  if (raw && typeof raw === 'object' && raw !== null) {
    return raw as { id?: number; first_name?: string; last_name?: string; email?: string };
  }
  return null;
}

export function taskCaseId(task: API.Task | null): number | null {
  if (!task) return null;
  const ext = task as API.Task & { case_id?: number };
  if (typeof ext.case === 'number') return ext.case;
  if (typeof ext.case_id === 'number') return ext.case_id;
  return null;
}

export function isTaskOverdue(task: API.Task): boolean {
  if (!task.due_date || task.status === 'done' || task.status === 'cancelled') return false;
  const due = new Date(task.due_date);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function appointmentClientName(a: {
  client_details?: { first_name?: string; last_name?: string; email?: string };
}): string {
  return displayPersonName(a.client_details, '—');
}

export function appointmentAssigneeName(a: {
  created_by_details?: { first_name?: string; last_name?: string; email?: string };
}): string {
  return displayPersonName(a.created_by_details, '—');
}
