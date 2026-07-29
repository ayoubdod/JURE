// src/types/matter.ts
export type MatterEvent = {
    id: string;
    label: string;
    date: string; // ISO yyyy-mm-dd
    type?: 'deadline' | 'hearing' | 'filing' | 'note';
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  };
  
  export type Party = { id: string; name: string; role: 'Client' | 'Opponent' | 'Witness' | 'Other' };
  
  export type Clause = { id: string; title: string; text: string; tags?: string[] };
  
  export type Matter = {
    id: string;
    title: string;
    client: string;
    budget?: number;      // planned budget
    actual?: number;      // current spend
    events: MatterEvent[];
    parties: Party[];
  };
  