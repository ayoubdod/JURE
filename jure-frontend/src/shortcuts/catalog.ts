import type { ShortcutActionId } from './types';

export type ShortcutGroup = 'general' | 'navigation' | 'create' | 'page';

export type CatalogItem = {
  id: string;
  group: ShortcutGroup;
  /** Keys shown in the UI, left → right. `mod` is replaced by ⌘ or Ctrl. */
  keys: string[];
  chord?: { prefix: string; key: string };
  combo?: { key: string; withMod?: boolean; shift?: boolean };
  kind: 'navigate' | 'action' | 'internal';
  path?: string;
  action?: ShortcutActionId;
  internal?: 'palette' | 'help' | 'sidebar' | 'theme';
  finance?: boolean;
  juria?: boolean;
  /** Documentation only — not bound globally (page already handles it). */
  docsOnly?: boolean;
};

export const SHORTCUT_CATALOG: CatalogItem[] = [
  // General
  {
    id: 'commandPalette',
    group: 'general',
    keys: ['mod', 'K'],
    combo: { key: 'k', withMod: true },
    kind: 'internal',
    internal: 'palette',
  },
  {
    id: 'showHelp',
    group: 'general',
    keys: ['?'],
    combo: { key: '?' },
    kind: 'internal',
    internal: 'help',
  },
  {
    id: 'toggleSidebar',
    group: 'general',
    keys: ['mod', 'B'],
    combo: { key: 'b', withMod: true },
    kind: 'internal',
    internal: 'sidebar',
  },
  {
    id: 'toggleTheme',
    group: 'general',
    keys: [],
    kind: 'internal',
    internal: 'theme',
  },
  {
    id: 'searchRecords',
    group: 'general',
    keys: [],
    kind: 'action',
    action: 'search-records',
  },
  {
    id: 'logout',
    group: 'general',
    keys: [],
    kind: 'action',
    action: 'logout',
  },

  // Navigation — G then letter
  { id: 'goDashboard', group: 'navigation', keys: ['G', 'D'], chord: { prefix: 'g', key: 'd' }, kind: 'navigate', path: '/dashboard' },
  { id: 'goTeam', group: 'navigation', keys: ['G', 'T'], chord: { prefix: 'g', key: 't' }, kind: 'navigate', path: '/dashboard/team' },
  { id: 'goClients', group: 'navigation', keys: ['G', 'C'], chord: { prefix: 'g', key: 'c' }, kind: 'navigate', path: '/dashboard/clients' },
  { id: 'goCases', group: 'navigation', keys: ['G', 'M'], chord: { prefix: 'g', key: 'm' }, kind: 'navigate', path: '/dashboard/cases' },
  { id: 'goConsultation', group: 'navigation', keys: ['G', '1'], chord: { prefix: 'g', key: '1' }, kind: 'navigate', path: '/dashboard/cases/consultations' },
  { id: 'goLitigation', group: 'navigation', keys: ['G', '2'], chord: { prefix: 'g', key: '2' }, kind: 'navigate', path: '/dashboard/cases/litigation' },
  { id: 'goAdministrative', group: 'navigation', keys: ['G', '3'], chord: { prefix: 'g', key: '3' }, kind: 'navigate', path: '/dashboard/cases/administrative' },
  { id: 'goLibrary', group: 'navigation', keys: ['G', 'L'], chord: { prefix: 'g', key: 'l' }, kind: 'navigate', path: '/dashboard/library' },
  { id: 'goCalendar', group: 'navigation', keys: ['G', 'A'], chord: { prefix: 'g', key: 'a' }, kind: 'navigate', path: '/dashboard/calendar' },
  { id: 'goTasks', group: 'navigation', keys: ['G', 'K'], chord: { prefix: 'g', key: 'k' }, kind: 'navigate', path: '/dashboard/tasks' },
  { id: 'goAppointment', group: 'navigation', keys: ['G', 'P'], chord: { prefix: 'g', key: 'p' }, kind: 'navigate', path: '/dashboard/appointments' },
  { id: 'goChat', group: 'navigation', keys: ['G', 'H'], chord: { prefix: 'g', key: 'h' }, kind: 'navigate', path: '/dashboard/conversations' },
  { id: 'goFinance', group: 'navigation', keys: ['G', 'F'], chord: { prefix: 'g', key: 'f' }, kind: 'navigate', path: '/dashboard/finance', finance: true },
  { id: 'goJuria', group: 'navigation', keys: ['G', 'J'], chord: { prefix: 'g', key: 'j' }, kind: 'navigate', path: '/dashboard/juria', juria: true },
  { id: 'goSettings', group: 'navigation', keys: ['G', 'S'], chord: { prefix: 'g', key: 's' }, kind: 'navigate', path: '/dashboard/settings' },
  { id: 'goNotifications', group: 'navigation', keys: ['G', 'N'], chord: { prefix: 'g', key: 'n' }, kind: 'navigate', path: '/dashboard/notifications' },
  { id: 'goAccount', group: 'navigation', keys: ['G', 'U'], chord: { prefix: 'g', key: 'u' }, kind: 'navigate', path: '/dashboard/account' },
  { id: 'goSupport', group: 'navigation', keys: ['G', 'E'], chord: { prefix: 'g', key: 'e' }, kind: 'navigate', path: '/dashboard/support' },
  { id: 'goProfile', group: 'navigation', keys: ['G', 'Y'], chord: { prefix: 'g', key: 'y' }, kind: 'navigate', path: '/dashboard/me' },

  // Create — C then letter
  { id: 'newClient', group: 'create', keys: ['C', 'C'], chord: { prefix: 'c', key: 'c' }, kind: 'action', action: 'create-client' },
  { id: 'newCase', group: 'create', keys: ['C', 'M'], chord: { prefix: 'c', key: 'm' }, kind: 'action', action: 'create-case' },
  { id: 'newTask', group: 'create', keys: ['C', 'T'], chord: { prefix: 'c', key: 't' }, kind: 'action', action: 'create-task' },
  { id: 'newAppointment', group: 'create', keys: ['C', 'A'], chord: { prefix: 'c', key: 'a' }, kind: 'action', action: 'create-appointment' },
  { id: 'newMember', group: 'create', keys: ['C', 'E'], chord: { prefix: 'c', key: 'e' }, kind: 'action', action: 'create-member' },
  { id: 'newDocument', group: 'create', keys: ['C', 'D'], chord: { prefix: 'c', key: 'd' }, kind: 'action', action: 'create-document' },
  { id: 'newChat', group: 'create', keys: ['C', 'H'], chord: { prefix: 'c', key: 'h' }, kind: 'action', action: 'create-chat' },
  { id: 'conflictCheck', group: 'create', keys: ['C', 'F'], chord: { prefix: 'c', key: 'f' }, kind: 'action', action: 'conflict-check' },
  { id: 'clauseLibrary', group: 'create', keys: ['C', 'L'], chord: { prefix: 'c', key: 'l' }, kind: 'action', action: 'clause-library' },
  { id: 'closeMatter', group: 'create', keys: ['C', 'X'], chord: { prefix: 'c', key: 'x' }, kind: 'action', action: 'close-matter' },

  // Page-level (already implemented on list views)
  { id: 'pageSearch', group: 'page', keys: ['/'], kind: 'internal', docsOnly: true },
  { id: 'pageNew', group: 'page', keys: ['N'], kind: 'internal', docsOnly: true },
  { id: 'pageMoveDown', group: 'page', keys: ['J'], kind: 'internal', docsOnly: true },
  { id: 'pageMoveUp', group: 'page', keys: ['K'], kind: 'internal', docsOnly: true },
  { id: 'pageOpen', group: 'page', keys: ['Enter'], kind: 'internal', docsOnly: true },
];

export const NAV_SHORTCUT_BY_PATH: Record<string, string[]> = {
  '/dashboard': ['G', 'D'],
  '/dashboard/team': ['G', 'T'],
  '/dashboard/clients': ['G', 'C'],
  '/dashboard/cases': ['G', 'M'],
  '/dashboard/library': ['G', 'L'],
  '/dashboard/calendar': ['G', 'A'],
  '/dashboard/tasks': ['G', 'K'],
  '/dashboard/appointments': ['G', 'P'],
  '/dashboard/conversations': ['G', 'H'],
  '/dashboard/finance': ['G', 'F'],
  '/dashboard/juria': ['G', 'J'],
  '/dashboard/settings': ['G', 'S'],
  '/dashboard/account': ['G', 'U'],
  '/dashboard/support': ['G', 'E'],
};

const PAGE_OWNED_SEARCH = [
  '/dashboard/clients',
  '/dashboard/cases',
  '/dashboard/team',
  '/dashboard/library',
];

export function pageOwnsSlashSearch(pathname: string): boolean {
  return PAGE_OWNED_SEARCH.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
