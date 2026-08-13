import type { Lang } from './types';

/**
 * Controlled legal terminology for JURE.
 * Prefer these terms over ad-hoc machine translations so product language stays consistent.
 */
export const LEGAL_GLOSSARY = {
  case: {
    en: 'Case',
    fr: 'Dossier',
    ar: 'قضية',
    note: 'Primary matter unit in the practice. Prefer "dossier" in FR UI, not "affaire" unless court-context.',
  },
  matter: {
    en: 'Matter',
    fr: 'Dossier',
    ar: 'ملف',
    note: 'Synonym of case in product chrome; keep aligned with "case".',
  },
  client: {
    en: 'Client',
    fr: 'Client',
    ar: 'عميل',
  },
  counsel: {
    en: 'Counsel',
    fr: 'Conseil',
    ar: 'مستشار قانوني',
  },
  court: {
    en: 'Court',
    fr: 'Tribunal',
    ar: 'محكمة',
  },
  hearing: {
    en: 'Hearing',
    fr: 'Audience',
    ar: 'جلسة',
  },
  litigation: {
    en: 'Litigation',
    fr: 'Contentieux',
    ar: 'نزاع قضائي',
  },
  contract: {
    en: 'Contract',
    fr: 'Contrat',
    ar: 'عقد',
  },
  legalResearch: {
    en: 'Legal research',
    fr: 'Recherche juridique',
    ar: 'بحث قانوني',
  },
  legalOpinion: {
    en: 'Legal opinion',
    fr: 'Avis juridique',
    ar: 'رأي قانوني',
  },
  deadline: {
    en: 'Deadline',
    fr: 'Échéance',
    ar: 'أجل',
  },
  task: {
    en: 'Task',
    fr: 'Tâche',
    ar: 'مهمة',
  },
  document: {
    en: 'Document',
    fr: 'Document',
    ar: 'مستند',
  },
  knowledgeBase: {
    en: 'Library',
    fr: 'Bibliothèque',
    ar: 'المكتبة',
  },
  legalAi: {
    en: 'Legal AI',
    fr: 'IA juridique',
    ar: 'الذكاء الاصطناعي القانوني',
  },
  compliance: {
    en: 'Compliance',
    fr: 'Conformité',
    ar: 'امتثال',
  },
  auditTrail: {
    en: 'Audit trail',
    fr: 'Piste d’audit',
    ar: 'سجل التدقيق',
  },
  accessControl: {
    en: 'Access control',
    fr: 'Contrôle d’accès',
    ar: 'التحكم في الوصول',
  },
  confidentiality: {
    en: 'Confidentiality',
    fr: 'Confidentialité',
    ar: 'السرية',
  },
  consultation: {
    en: 'Consultation',
    fr: 'Consultation',
    ar: 'استشارة',
  },
  invoice: {
    en: 'Invoice',
    fr: 'Facture',
    ar: 'فاتورة',
  },
  fee: {
    en: 'Fee',
    fr: 'Honoraire',
    ar: 'أتعاب',
  },
} as const;

export type GlossaryKey = keyof typeof LEGAL_GLOSSARY;

export function glossaryTerm(key: GlossaryKey, lang: Lang): string {
  return LEGAL_GLOSSARY[key][lang];
}
