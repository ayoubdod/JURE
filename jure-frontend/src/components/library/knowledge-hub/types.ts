export type KnowledgeViewMode = 'grid' | 'table' | 'timeline' | 'graph' | 'ai';

export type CollectionId =
  | 'all'
  | 'recent'
  | 'favorites'
  | 'ai_generated'
  | 'public';

export type RiskLevel = 'low' | 'medium' | 'high';

export type KnowledgeInsight = {
  knowledgeScore: number;
  confidence: number;
  riskLevel: RiskLevel;
  aiIndexed: boolean;
  pendingClassification: boolean;
  language: string;
  entities: {
    people: string[];
    companies: string[];
    dates: string[];
  };
  smartTags: string[];
  keyClauses: string[];
  suggestedActions: string[];
  relatedHint: string;
  summary: string;
  references: number;
};

export type EnrichedDocument = API.Document & {
  insight: KnowledgeInsight;
  legalArea: API.LegalArea | null;
  displayCategory: string;
};

export type SmartMetrics = {
  totalDocuments: number;
  aiIndexed: number;
  folders: number;
  pendingClassification: number;
  recentlyUpdated: number;
  knowledgeScore: number;
};

export const SEARCH_EXAMPLES = [
  'Find all NDAs signed with Microsoft',
  'Show contracts expiring next quarter',
  'Summarize all litigation files',
  'Find clauses about arbitration',
  'Who signed this agreement?',
  'Which files reference GDPR?',
] as const;
