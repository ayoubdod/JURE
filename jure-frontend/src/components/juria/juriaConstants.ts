import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  FileSearch,
  FileSignature,
  FileText,
  Gavel,
  Mail,
  MessageSquare,
  PenLine,
  Scale,
  Search,
  UserRound,
} from 'lucide-react';
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
  Icon: LucideIcon;
}[] = [
  { id: 'bail', apiType: 'CONTRAT_BAIL', Icon: FileSignature },
  { id: 'mise_en_demeure', apiType: 'MISE_EN_DEMEURE', Icon: Mail },
  { id: 'statuts_sarl', apiType: 'STATUTS_SARL', Icon: Building2 },
  { id: 'procuration', apiType: 'PROCURATION', Icon: UserRound },
  { id: 'requete', apiType: 'REQUETE', Icon: Scale },
  { id: 'contrat_travail', apiType: 'CONTRAT_TRAVAIL', Icon: ClipboardList },
  { id: 'conclusions', apiType: 'CONCLUSIONS', Icon: Gavel },
  { id: 'autre', apiType: 'AUTRE', Icon: FileText },
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

/** Pull AI/system advisory banners (تنبيه / Note / Avertissement) out of the body. */
export function splitJuriaAdvisory(content: string): { body: string; advisory: string } {
  const lines = (content || '').split('\n');
  const note: string[] = [];
  const body: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim().replace(/^\*{1,2}|\*{1,2}$/g, '');
    if (
      /^(تنبيه|ملاحظة|avertissement|note|disclaimer|warning)\s*[:：]/i.test(trimmed) &&
      /(استرشادي|لا يغني|indicatif|ne remplace|advisory|does not replace|sources|مصادر)/i.test(trimmed)
    ) {
      note.push(trimmed);
    } else {
      body.push(line);
    }
  }
  return { body: body.join('\n').trim(), advisory: note.join(' ').trim() };
}

/** Strip markdown markers from act text for plain lawyer-ready display. */
export function stripActMarkdown(text: string): string {
  let out = text || '';
  out = out.replace(/^[ \t]*#{1,6}[ \t]*/gm, '');
  out = out.replace(/^\s*-{3,}\s*$/gm, '');
  out = out.replace(/\*\*\*(.+?)\*\*\*/gs, '$1');
  out = out.replace(/\*\*(.+?)\*\*/gs, '$1');
  out = out.replace(/__(.+?)__/gs, '$1');
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/gs, '$1');
  out = out.replace(/\*\*/g, '').replace(/__/g, '');
  out = out.replace(/[*#`~]+/g, '');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

export function draftTypeLabel(
  apiType: string,
  labels: Record<string, string>
): string {
  const id = DOCUMENT_DRAFT_TYPES.find((d) => d.apiType === apiType)?.id;
  if (id && labels[id]) return labels[id];
  return apiType.replace(/_/g, ' ');
}

export function safeDownloadFilename(title: string): string {
  const cleaned = (title || 'document')
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  const base = cleaned || 'document';
  return base.toLowerCase().endsWith('.docx') ? base : `${base}.docx`;
}
