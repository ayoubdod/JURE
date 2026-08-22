import type { LucideIcon } from 'lucide-react';
import { FileSearch, MessageSquare, PenLine, Search } from 'lucide-react';
import type { JuriaMode } from '@/types/juria';

export function juriaModeVisual(mode: string | undefined) {
  return JURIA_MODE_VISUAL[(mode as JuriaMode)] ?? JURIA_MODE_VISUAL.CHAT;
}

export const JURIA_MODE_VISUAL: Record<
  JuriaMode,
  { Icon: LucideIcon; accent: string; iconWrap: string }
> = {
  LEGAL_RESEARCH: {
    Icon: Search,
    accent: 'text-[#64499D]',
    iconWrap: 'bg-[#64499D]/10 text-[#64499D]',
  },
  CONTRACT_ANALYSIS: {
    Icon: FileSearch,
    accent: 'text-slate-700 dark:text-slate-200',
    iconWrap: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  DOCUMENT_DRAFTING: {
    Icon: PenLine,
    accent: 'text-slate-700 dark:text-slate-200',
    iconWrap: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  CHAT: {
    Icon: MessageSquare,
    accent: 'text-slate-700 dark:text-slate-200',
    iconWrap: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
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

export function splitJuriaSources(content: string): { body: string; sources: string[] } {
  const match = content.match(/\n(?:#{1,3}\s*)?(?:sources|المصادر|références|citations)\s*[:：]?\s*\n/i);
  if (!match || match.index == null) return { body: content, sources: [] };
  const body = content.slice(0, match.index).trim();
  const rest = content.slice(match.index + match[0].length);
  const sources = rest
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter((line) => line.length > 0 && !/^#{1,3}\s/.test(line));
  return { body, sources };
}
