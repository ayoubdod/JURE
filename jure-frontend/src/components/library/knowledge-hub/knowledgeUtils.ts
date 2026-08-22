import { DocumentCategory } from '@/utils/constants';
import {
  inferLegalArea,
  normalizeDocumentCategory,
  type DocumentCategoryId,
  type LegalAreaId,
} from '@/lib/libraryTaxonomy';
import type {
  CollectionId,
  EnrichedDocument,
  KnowledgeInsight,
  RiskLevel,
  SmartMetrics,
} from './types';

const RISK_KEYWORDS: Record<RiskLevel, string[]> = {
  high: [
    'litigation',
    'lawsuit',
    'dispute',
    'breach',
    'termination',
    'penalty',
    'indemnity',
    'liability',
    'criminal',
    'sanction',
  ],
  medium: [
    'nda',
    'confidential',
    'amendment',
    'renewal',
    'expire',
    'deadline',
    'compliance',
    'gdpr',
    'arbitration',
  ],
  low: [],
};

const CLAUSE_HINTS = [
  'Governing law',
  'Dispute resolution',
  'Confidentiality',
  'Limitation of liability',
  'Termination',
  'Force majeure',
  'Intellectual property',
  'Data protection',
];

const ACTION_POOL = [
  'Request AI summary',
  'Extract key clauses',
  'Run risk scan',
  'Find similar documents',
  'Suggest folder',
  'Generate timeline',
  'Compare versions',
  'Detect duplicates',
];

const FAVORITES_KEY = 'jure.knowledgeHub.favorites';

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickFromPool<T>(pool: T[], seed: number, count: number): T[] {
  if (pool.length === 0 || count <= 0) return [];
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(pool[(seed + i * 7) % pool.length]);
  }
  return [...new Set(out)];
}

function detectRisk(text: string): RiskLevel {
  const lower = text.toLowerCase();
  if (RISK_KEYWORDS.high.some((k) => lower.includes(k))) return 'high';
  if (RISK_KEYWORDS.medium.some((k) => lower.includes(k))) return 'medium';
  return 'low';
}

function extractEntities(text: string) {
  const people: string[] = [];
  const companies: string[] = [];
  const dates: string[] = [];

  const dateMatches = text.match(
    /\b(?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi
  );
  if (dateMatches) dates.push(...dateMatches.slice(0, 4));

  const companyHints = text.match(
    /\b([A-Z][A-Za-z0-9&]+(?:\s+[A-Z][A-Za-z0-9&]+){0,3})\s+(?:Inc\.?|LLC|Ltd\.?|SA|SAS|GmbH|Corp\.?|Company|Group)\b/g
  );
  if (companyHints) companies.push(...companyHints.slice(0, 4));

  const personHints = text.match(/\b(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g);
  if (personHints) people.push(...personHints.slice(0, 4));

  const titleCase = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g) || [];
  for (const name of titleCase) {
    if (people.length >= 3) break;
    if (!companies.some((c) => c.includes(name)) && name.length > 4) {
      people.push(name);
    }
  }

  return {
    people: [...new Set(people)].slice(0, 4),
    companies: [...new Set(companies)].slice(0, 4),
    dates: [...new Set(dates)].slice(0, 4),
  };
}

function detectLanguage(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return 'AR';
  if (
    /\b(le|la|les|des|contrat|clause|juridique|tribunal)\b/i.test(text) ||
    /[àâçéèêëîïôùûü]/.test(text)
  )
    return 'FR';
  return 'EN';
}

export function buildInsight(doc: API.Document): KnowledgeInsight {
  const blob = `${doc.title || ''} ${doc.description || ''} ${(doc.tags || []).join(' ')}`;
  const seed = hashSeed(`${doc.id}-${doc.title}`);
  const hasDescription = Boolean(doc.description?.trim());
  const tagCount = Array.isArray(doc.tags) ? doc.tags.length : 0;
  const completeness =
    (doc.title ? 25 : 0) +
    (hasDescription ? 30 : 0) +
    Math.min(tagCount * 8, 25) +
    (doc.category ? 10 : 0) +
    (doc.file ? 10 : 0);

  const knowledgeScore = Math.min(98, Math.max(42, completeness + (seed % 12)));
  const confidence = Math.min(99, Math.max(55, completeness + (seed % 8) + 5));
  const aiIndexed = hasDescription || tagCount > 0 || completeness >= 55;
  const pendingClassification = !doc.category || (!hasDescription && tagCount === 0);
  const riskLevel = detectRisk(blob);
  const entities = extractEntities(blob);
  const smartTags = [
    ...(doc.tags || []).slice(0, 4),
    ...pickFromPool(
      ['AI-indexed', 'Semantic', 'Clause-ready', 'OCR-complete', 'Version-aware'],
      seed,
      aiIndexed ? 2 : 1
    ),
  ].slice(0, 5);

  const summary = hasDescription
    ? doc.description!.length > 160
      ? `${doc.description!.slice(0, 157)}…`
      : doc.description!
    : `AI preview of “${doc.title}”: awaiting deeper indexing. Metadata suggests a ${DocumentCategory.getLabel(doc.category) || 'legal'} knowledge asset.`;

  return {
    knowledgeScore,
    confidence,
    riskLevel,
    aiIndexed,
    pendingClassification,
    language: detectLanguage(blob),
    entities,
    smartTags: [...new Set(smartTags)],
    keyClauses: pickFromPool(CLAUSE_HINTS, seed, riskLevel === 'high' ? 4 : 3),
    suggestedActions: pickFromPool(ACTION_POOL, seed, 4),
    relatedHint: `Similar ${DocumentCategory.getLabel(doc.category) || 'documents'} in your repository`,
    summary,
    references: 1 + (seed % 7) + tagCount,
  };
}

export function enrichDocuments(documents: API.Document[]): EnrichedDocument[] {
  return documents.map((doc) => {
    const category = normalizeDocumentCategory(doc.category);
    const normalized = { ...doc, category };
    return {
      ...normalized,
      insight: buildInsight(normalized),
      legalArea: inferLegalArea(normalized),
      displayCategory: category,
    };
  });
}

export function computeSmartMetrics(
  documents: EnrichedDocument[],
  folderCount: number
): SmartMetrics {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const aiIndexed = documents.filter((d) => d.insight.aiIndexed).length;
  const pendingClassification = documents.filter((d) => d.insight.pendingClassification).length;
  const recentlyUpdated = documents.filter(
    (d) => now - new Date(d.modified || 0).getTime() < weekMs
  ).length;
  const knowledgeScore =
    documents.length === 0
      ? 0
      : Math.round(
          documents.reduce((sum, d) => sum + d.insight.knowledgeScore, 0) / documents.length
        );

  return {
    totalDocuments: documents.length,
    aiIndexed,
    folders: folderCount,
    pendingClassification,
    recentlyUpdated,
    knowledgeScore,
  };
}

export function getFavorites(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(id: number): number[] {
  const current = getFavorites();
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export function matchesCollection(
  doc: EnrichedDocument,
  collection: CollectionId,
  favorites: number[]
): boolean {
  if (collection === 'public') {
    return Boolean(doc.is_shared);
  }
  if (doc.is_shared) {
    return false;
  }
  if (collection === 'all') return true;
  if (collection === 'favorites') return favorites.includes(doc.id);
  if (collection === 'recent') {
    const days = (Date.now() - new Date(doc.modified || 0).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 30;
  }
  if (collection === 'ai_generated') {
    return (
      doc.insight.aiIndexed &&
      (doc.tags?.some((t) => /ai|generated|juria/i.test(t)) ||
        /ai|generated|summary/i.test(`${doc.title} ${doc.description || ''}`))
    );
  }
  return doc.category === collection;
}

export function semanticFilter(docs: EnrichedDocument[], query: string): EnrichedDocument[] {
  const q = query.trim().toLowerCase();
  if (!q) return docs;

  const tokens = q.split(/\s+/).filter(Boolean);

  return docs
    .map((doc) => {
      const hay = [
        doc.title,
        doc.description,
        doc.category,
        ...(doc.tags || []),
        ...doc.insight.smartTags,
        ...doc.insight.keyClauses,
        ...doc.insight.entities.people,
        ...doc.insight.entities.companies,
        doc.insight.summary,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      let score = 0;
      for (const token of tokens) {
        if (hay.includes(token)) score += 2;
        if (doc.title?.toLowerCase().includes(token)) score += 3;
      }
      if (/nda|gdpr|arbitration|expir|litigation|contract|clause|sign/.test(q)) {
        if (doc.insight.riskLevel !== 'low') score += 1;
        if (doc.category === 'contracts_agreements' && /contract|nda|expir/.test(q)) score += 2;
        if (doc.category === 'evidence_case_materials' && /litigation/.test(q)) score += 2;
        if (/gdpr|arbitration|clause/.test(q) && doc.insight.keyClauses.length) score += 2;
      }
      return { doc, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.doc);
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function riskStyles(level: RiskLevel): string {
  switch (level) {
    case 'high':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
    default:
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  }
}

export function isPlatformShared(doc: Pick<API.Document, 'is_shared'>): boolean {
  return Boolean(doc.is_shared);
}

export type CollectionDef = {
  id: CollectionId;
  label: string;
  group: 'core' | 'smart';
};

export const COLLECTIONS: CollectionDef[] = [
  { id: 'all', label: 'Library', group: 'core' },
  { id: 'public', label: 'Public library', group: 'core' },
  { id: 'ai_generated', label: 'AI Generated', group: 'smart' },
  { id: 'favorites', label: 'Favorites', group: 'smart' },
  { id: 'recent', label: 'Recent', group: 'smart' },
];

export function matchesCategory(
  doc: EnrichedDocument,
  category: DocumentCategoryId | null
): boolean {
  if (!category) return true;
  return normalizeDocumentCategory(doc.category) === category;
}

export function matchesArea(doc: EnrichedDocument, area: LegalAreaId | null): boolean {
  if (!area) return true;
  return doc.legalArea === area;
}
