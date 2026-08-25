/**
 * Library taxonomy — canonical categories (persisted) and legal areas (frontend-only).
 * Labels live in i18n (`enums.documentCategory`, `enums.documentLegalArea`).
 */

export const LIBRARY_RESOURCE_TYPE_IDS = [
  'law',
  'code',
  'regulation',
  'decree',
  'circular',
  'case_law',
  'court_decision',
  'administrative_decision',
  'treaty',
  'convention',
  'directive',
  'legal_commentary',
  'legal_article',
  'legal_guide',
  'template',
  'legal_form',
  'report',
  'research_paper',
  'regulatory_update',
  'other',
] as const;

export type LibraryResourceTypeId = (typeof LIBRARY_RESOURCE_TYPE_IDS)[number];

export const LIBRARY_LANGUAGES = ['en', 'fr', 'ar'] as const;

export const DOCUMENT_CATEGORY_IDS = [
  'legislation_regulations',
  'case_law_jurisprudence',
  'contracts_agreements',
  'pleadings_proceedings',
  'forms_templates',
  'legal_research_opinions',
  'corporate_governance',
  'compliance_policies',
  'evidence_case_materials',
  'training_knowledge',
] as const;

export type DocumentCategoryId = (typeof DOCUMENT_CATEGORY_IDS)[number];

export const LEGAL_AREA_IDS = [
  'corporate_commercial',
  'ma_private_equity',
  'contracts',
  'litigation_dispute_resolution',
  'employment_hr',
  'tax',
  'regulatory_compliance',
  'corporate_governance',
  'real_estate_construction',
  'banking_finance',
  'ip_technology_data',
  'public_administrative',
] as const;

export type LegalAreaId = (typeof LEGAL_AREA_IDS)[number];

export const LEGACY_CATEGORY_MAP: Record<string, DocumentCategoryId> = {
  law: 'legislation_regulations',
  templates: 'forms_templates',
  contracts: 'contracts_agreements',
  research: 'legal_research_opinions',
  legal_forms: 'forms_templates',
  training: 'training_knowledge',
  evidence: 'evidence_case_materials',
};

const CATEGORY_SET = new Set<string>(DOCUMENT_CATEGORY_IDS);
const AREA_SET = new Set<string>(LEGAL_AREA_IDS);

export function isDocumentCategory(value: string | null | undefined): value is DocumentCategoryId {
  return Boolean(value && CATEGORY_SET.has(value));
}

export function isLegalArea(value: string | null | undefined): value is LegalAreaId {
  return Boolean(value && AREA_SET.has(value));
}

export function normalizeDocumentCategory(value: string | null | undefined): string {
  if (!value) return '';
  return LEGACY_CATEGORY_MAP[value] ?? value;
}

/** Reserved tag prefix used to persist legal area without a backend field. */
export const AREA_TAG_PREFIX = 'area_';

export function encodeAreaTag(area: LegalAreaId): string {
  return `${AREA_TAG_PREFIX}${area}`;
}

export function parseAreaTag(tag: string): LegalAreaId | null {
  if (!tag.startsWith(AREA_TAG_PREFIX)) return null;
  const slug = tag.slice(AREA_TAG_PREFIX.length);
  return isLegalArea(slug) ? slug : null;
}

export function splitDocumentTags(tags: string[] | null | undefined): {
  area: LegalAreaId | null;
  userTags: string[];
} {
  let area: LegalAreaId | null = null;
  const userTags: string[] = [];
  for (const tag of tags || []) {
    const parsed = parseAreaTag(tag);
    if (parsed) {
      area = parsed;
    } else {
      userTags.push(tag);
    }
  }
  return { area, userTags };
}

export function mergeAreaIntoTags(
  tags: string[] | null | undefined,
  area: LegalAreaId | null | undefined
): string[] {
  const { userTags } = splitDocumentTags(tags);
  if (!area) return userTags;
  return [...userTags, encodeAreaTag(area)];
}

const AREA_KEYWORDS: Record<LegalAreaId, string[]> = {
  corporate_commercial: [
    'corporate',
    'commercial',
    'company',
    'société',
    'societe',
    'sarl',
    'sa ',
    'commerce',
    'شركات',
    'تجاري',
  ],
  ma_private_equity: [
    'm&a',
    'merger',
    'acquisition',
    'private equity',
    'share purchase',
    'spa',
    'fusion',
    'acquisition',
    'اندماج',
    'استحواذ',
  ],
  contracts: [
    'contract',
    'agreement',
    'nda',
    'contrat',
    'convention',
    'عقد',
    'اتفاقية',
  ],
  litigation_dispute_resolution: [
    'litigation',
    'dispute',
    'judgment',
    'court',
    'tribunal',
    'contentieux',
    'arbitrage',
    'arbitration',
    'cassation',
    'نزاع',
    'قضاء',
    'حكم',
  ],
  employment_hr: [
    'employment',
    'employee',
    'labour',
    'labor',
    'hr',
    'travail',
    'salarié',
    'salarie',
    'شغل',
    'عمل',
    'موارد بشرية',
  ],
  tax: ['tax', 'tva', 'vat', 'fiscal', 'impôt', 'impot', 'ضريب'],
  regulatory_compliance: [
    'compliance',
    'regulatory',
    'aml',
    'kyc',
    'gdpr',
    'conformité',
    'conformite',
    'امتثال',
    'تنظيم',
  ],
  corporate_governance: [
    'governance',
    'board',
    'shareholder',
    'assemblée',
    'assemblee',
    'statuts',
    'gouvernance',
    'حوكمة',
    'جمعية عامة',
  ],
  real_estate_construction: [
    'real estate',
    'property',
    'lease',
    'construction',
    'immobilier',
    'bail',
    'عقار',
    'كراء',
  ],
  banking_finance: [
    'bank',
    'finance',
    'loan',
    'credit',
    'crédit',
    'banque',
    'مصرف',
    'تمويل',
  ],
  ip_technology_data: [
    'intellectual property',
    'ip ',
    'patent',
    'trademark',
    'copyright',
    'software',
    'data protection',
    'gdpr',
    'ai ',
    'technology',
    'propriété intellectuelle',
    'propriete intellectuelle',
    'données',
    'donnees',
    'ملكية فكرية',
    'بيانات',
  ],
  public_administrative: [
    'administrative',
    'public law',
    'dahir',
    'decree',
    'décret',
    'decret',
    'circulaire',
    'public',
    'إداري',
    'ظهير',
    'مرسوم',
  ],
};

export function inferLegalArea(doc: {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  category?: string | null;
}): LegalAreaId | null {
  const { area } = splitDocumentTags(doc.tags);
  if (area) return area;

  const blob = `${doc.title || ''} ${doc.description || ''} ${(doc.tags || []).join(' ')}`.toLowerCase();
  if (!blob.trim()) return null;

  let best: LegalAreaId | null = null;
  let bestScore = 0;
  for (const id of LEGAL_AREA_IDS) {
    let score = 0;
    for (const keyword of AREA_KEYWORDS[id]) {
      if (blob.includes(keyword.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return bestScore > 0 ? best : null;
}

export function fileFormatLabel(file: string | null | undefined): string {
  if (!file) return '';
  const path = file.split('?')[0] || '';
  const name = path.split('/').pop() || path;
  const ext = name.includes('.') ? name.split('.').pop() : '';
  if (!ext || ext.length > 5) return '';
  return ext.toUpperCase();
}

export function matchesLegalArea(
  area: LegalAreaId | null,
  filter: LegalAreaId | null
): boolean {
  if (!filter) return true;
  return area === filter;
}
