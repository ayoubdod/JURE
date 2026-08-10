// src/stores/matterStore.ts
import { create } from 'zustand';
import { Matter, Clause, MatterEvent } from '@/types/matter';
import { DEMO_MODE } from '@/config/features';

type State = {
  matters: Matter[];
  clauses: Clause[];
  addEvent: (matterId: string, evt: MatterEvent) => void;
  addClause: (c: Clause) => void;
};

/** Local demo fixtures — never seeded in production cabinets. */
const DEMO_MATTERS: Matter[] = [
  {
    id: 'm1',
    title: 'Johnson vs. State',
    client: 'Michael Johnson',
    budget: 12000,
    actual: 8200,
    parties: [
      { id: 'p1', name: 'Michael Johnson', role: 'Client' },
      { id: 'p2', name: 'State of X', role: 'Opponent' },
    ],
    events: [
      { id: 'e1', label: 'Complaint Filed', date: '2025-07-01', type: 'filing' },
      { id: 'e2', label: 'Hearing', date: '2025-09-10', type: 'hearing' },
    ],
  },
];

const DEMO_CLAUSES: Clause[] = [
  { id: 'c1', title: 'Confidentiality', text: 'Each party shall keep all information...', tags: ['engagement', 'risk'] },
  { id: 'c2', title: 'Limitation of Liability', text: 'Firm liability is limited to fees paid...', tags: ['engagement'] },
];

export const useMatterStore = create<State>((set) => ({
  matters: DEMO_MODE ? DEMO_MATTERS : [],
  clauses: DEMO_MODE ? DEMO_CLAUSES : [],
  addEvent: (matterId, evt) =>
    set((s) => ({
      matters: s.matters.map((m) => (m.id === matterId ? { ...m, events: [...m.events, evt] } : m)),
    })),
  addClause: (c) => set((s) => ({ clauses: [c, ...s.clauses] })),
}));
