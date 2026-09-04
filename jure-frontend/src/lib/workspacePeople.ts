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
  if (Array.isArray(task.assignees) && task.assignees[0] && typeof task.assignees[0] === 'object') {
    return task.assignees[0];
  }
  const details = task.assigned_to_details;
  if (details && typeof details === 'object' && details.email) return details;
  const raw = task.assigned_to;
  if (raw && typeof raw === 'object' && 'email' in raw) return raw;
  return null;
}

export function taskAssigneeId(task: API.Task | null): number | undefined {
  if (!task) return undefined;
  const user = taskAssigneeUser(task);
  if (user?.id != null) return user.id;
  if (typeof task.assigned_to === 'number') return task.assigned_to;
  if (Array.isArray(task.assignee_ids) && task.assignee_ids[0] != null) return Number(task.assignee_ids[0]);
  return undefined;
}

export function taskAssigneeUsers(task: API.Task | null): API.User[] {
  if (!task) return [];
  if (Array.isArray(task.assignees) && task.assignees.length) {
    return task.assignees.filter((u): u is API.User => !!u && typeof u === 'object');
  }
  const single = taskAssigneeUser(task);
  return single ? [single] : [];
}

export function taskAssigneeIds(task: API.Task | null): number[] {
  if (!task) return [];
  if (Array.isArray(task.assignee_ids) && task.assignee_ids.length) {
    return task.assignee_ids.map(Number).filter(Boolean);
  }
  const fromUsers = taskAssigneeUsers(task)
    .map((u) => u.id)
    .filter((id): id is number => id != null);
  if (fromUsers.length) return fromUsers;
  const one = taskAssigneeId(task);
  return one != null ? [one] : [];
}

export function taskClientUser(task: API.Task | null): PersonLike {
  if (!task) return null;
  const details = task.client_details;
  if (details && typeof details === 'object') return details;
  const raw = task.client;
  if (raw && typeof raw === 'object') return raw;
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
