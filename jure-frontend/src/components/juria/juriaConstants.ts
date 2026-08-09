import type { JuriaMode } from '@/types/juria';

export const JURIA_MODE_VISUAL: Record<
  JuriaMode,
  { icon: string; segmentClass: string }
> = {
  CHAT: {
    icon: '💬',
    segmentClass: 'text-indigo-600',
  },
  CONTRACT_ANALYSIS: {
    icon: '📄',
    segmentClass: 'text-blue-600',
  },
  LEGAL_RESEARCH: {
    icon: '🔍',
    segmentClass: 'text-emerald-600',
  },
  DOCUMENT_DRAFTING: {
    icon: '📝',
    segmentClass: 'text-purple-600',
  },
};

/** @deprecated Use t.juria.modes + JURIA_MODE_VISUAL */
export const JURIA_MODE_META: Record<
  JuriaMode,
  { label: string; shortLabel: string; icon: string; segmentClass: string }
> = {
  CHAT: {
    label: 'Chat juridique',
    shortLabel: 'Chat',
    icon: '💬',
    segmentClass: 'text-indigo-600',
  },
  CONTRACT_ANALYSIS: {
    label: 'Analyse de contrat',
    shortLabel: 'Analyse',
    icon: '📄',
    segmentClass: 'text-blue-600',
  },
  LEGAL_RESEARCH: {
    label: 'Recherche juridique',
    shortLabel: 'Recherche',
    icon: '🔍',
    segmentClass: 'text-emerald-600',
  },
  DOCUMENT_DRAFTING: {
    label: 'Rédaction de document',
    shortLabel: 'Rédaction',
    icon: '📝',
    segmentClass: 'text-purple-600',
  },
};

/** @deprecated Use t.juria.modes.*.placeholder */
export const PLACEHOLDER_BY_MODE: Record<JuriaMode, string> = {
  CHAT: 'Posez votre question juridique...',
  CONTRACT_ANALYSIS: 'Décrivez ce que vous cherchez...',
  LEGAL_RESEARCH: 'Sur quel sujet juridique...',
  DOCUMENT_DRAFTING: 'Quel document souhaitez-vous...',
};

/** @deprecated Use t.juria.quickStarters */
export const QUICK_STARTERS = [
  'Analyser un contrat de bail',
  'Rédiger une mise en demeure',
  "Qu'est-ce que le DOC marocain ?",
  'Résumer mes obligations TVA',
  'Rédiger des statuts de SARL',
];

export type DocumentDraftTypeId =
  | 'bail'
  | 'mise_en_demeure'
  | 'statuts_sarl'
  | 'procuration'
  | 'requete'
  | 'contrat_travail'
  | 'conclusions'
  | 'autre';

/** Backend `document_type` enum values for POST /draft/ — titles from i18n. */
export const DOCUMENT_DRAFT_TYPES: {
  id: DocumentDraftTypeId;
  apiType: string;
  icon: string;
}[] = [
  { id: 'bail', apiType: 'CONTRAT_BAIL', icon: '📄' },
  { id: 'mise_en_demeure', apiType: 'MISE_EN_DEMEURE', icon: '✉️' },
  { id: 'statuts_sarl', apiType: 'STATUTS_SARL', icon: '🏢' },
  { id: 'procuration', apiType: 'PROCURATION', icon: '👤' },
  { id: 'requete', apiType: 'REQUETE', icon: '⚖️' },
  { id: 'contrat_travail', apiType: 'CONTRAT_TRAVAIL', icon: '📋' },
  { id: 'conclusions', apiType: 'CONCLUSIONS', icon: '📑' },
  { id: 'autre', apiType: 'AUTRE', icon: '🔄' },
];
