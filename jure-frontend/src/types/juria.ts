export type JuriaMode = 'CHAT' | 'CONTRACT_ANALYSIS' | 'LEGAL_RESEARCH' | 'DOCUMENT_DRAFTING';

export type JuriaMessageRole = 'user' | 'assistant' | 'system';

export type JuriaLang = 'fr' | 'en' | 'ar' | 'darija';

export type JuriaJurisdiction = 'MA' | 'FR' | 'AE' | 'QA' | 'OTHER';

export type JuriaProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export type JuriaProjectRole = 'OWNER' | 'EDITOR' | 'REVIEWER' | 'VIEWER';

export type JuriaResource =
  | 'CASE'
  | 'DOCUMENTS'
  | 'LIBRARY'
  | 'CALENDAR'
  | 'TASKS'
  | 'CLIENTS'
  | 'TEAM';

export type JuriaPermissionLevel = 'NONE' | 'READ' | 'CREATE' | 'UPDATE';

export type JuriaTab =
  | 'overview'
  | 'chat'
  | 'sources'
  | 'documents'
  | 'case'
  | 'calendar'
  | 'tasks'
  | 'team'
  | 'artifacts'
  | 'activity'
  | 'instructions';

export interface JuriaPublicUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  image?: string | null;
  initials?: string;
}

export interface JuriaAttachmentMeta {
  name: string;
  mime: string;
  size?: number;
}

export interface JuriaDocumentCard {
  typeName: string;
  previewLines: string;
  generatedAt: string;
  docxUrl?: string;
  downloadMessageId?: string;
  artifactId?: string;
}

export interface JuriaSourceHit {
  document: string;
  document_id: string;
  source_type: string;
  source_id?: string;
  page?: number | null;
  chunk?: string;
  relevance?: number;
  metadata?: Record<string, unknown>;
}

export interface JuriaContractAnalysis {
  analysis?: string;
  risk_score?: number;
  risks?: { high?: string[]; medium?: string[]; low?: string[] };
  missing_clauses?: string[];
  unusual_clauses?: string[];
  extracted?: Record<string, unknown[] | string[]>;
  parse_error?: boolean;
}

export interface JuriaMessage {
  id: string;
  role: JuriaMessageRole;
  content: string;
  createdAt: string;
  suggestions?: string[];
  attachment?: JuriaAttachmentMeta;
  documentCard?: JuriaDocumentCard;
  streaming?: boolean;
  tokensUsed?: number;
  author?: JuriaPublicUser | null;
  sources?: JuriaSourceHit[];
  analysis?: JuriaContractAnalysis;
  isSuperseded?: boolean;
  editedAt?: string | null;
  parentMessageId?: string | null;
  versions?: { id: string; version_number: number; content: string; created_at: string }[];
}

export interface JuriaConversation {
  id: string;
  title: string;
  mode: JuriaMode;
  caseId?: number;
  caseReference?: string;
  caseTitle?: string;
  archived: boolean;
  updatedAt: string;
  createdAt?: string;
  messages: JuriaMessage[];
  lastMessagePreview?: string | null;
  projectId?: string | null;
  threadId?: string | null;
}

export interface JuriaProject {
  id: string;
  name: string;
  description: string;
  status: JuriaProjectStatus;
  owner?: JuriaPublicUser;
  preferred_language: JuriaLang;
  jurisdiction_code: JuriaJurisdiction;
  legal_domain: string;
  instructions?: string;
  linked_case_id?: number | null;
  linked_case_title?: string | null;
  linked_case_reference?: string | null;
  is_favorite: boolean;
  is_simple?: boolean;
  member_count?: number;
  thread_count?: number;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  permissions?: { resource: JuriaResource; level: JuriaPermissionLevel }[];
  members?: JuriaProjectMember[];
  sources?: JuriaProjectSource[];
  context?: JuriaContextSummary;
}

export interface JuriaProjectMember {
  id: string;
  user: JuriaPublicUser;
  role: JuriaProjectRole;
  created_at: string;
}

export interface JuriaProjectSource {
  id: string;
  kind: string;
  case_id?: number | null;
  case_attachment_id?: number | null;
  library_document_id?: number | null;
  client_id?: number | null;
  juria_file_id?: string | null;
  metadata?: Record<string, unknown>;
  title?: string;
  created_at: string;
}

export interface JuriaContextSummary {
  case?: {
    id: number;
    reference: string;
    title: string;
    status: string;
    case_type: string;
    court: string;
  } | null;
  documents_count: number;
  library_count: number;
  calendar_connected: boolean;
  tasks_connected: boolean;
  clients: { id: number; first_name: string; last_name: string }[];
  team_count: number;
  permissions: Record<string, string>;
}

export interface JuriaThread {
  id: string;
  project_id: string;
  title: string;
  mode: JuriaMode;
  is_archived: boolean;
  created_by?: JuriaPublicUser | null;
  created_at: string;
  updated_at: string;
  last_message_preview?: string | null;
  message_count?: number;
  conversation_id?: string | null;
}

export interface JuriaFile {
  id: string;
  original_name: string;
  content_type: string;
  file_kind: string;
  size_bytes?: number | null;
  page_count?: number | null;
  ocr_status: string;
  uploaded_by?: JuriaPublicUser | null;
  created_at: string;
}

export interface JuriaArtifact {
  id: string;
  project_id: string;
  thread_id?: string | null;
  title: string;
  artifact_type: string;
  content_html: string;
  content_markdown: string;
  current_version: number;
  created_by?: JuriaPublicUser | null;
  created_at: string;
  updated_at: string;
  versions?: JuriaArtifactVersion[];
}

export interface JuriaArtifactVersion {
  id: string;
  version_number: number;
  content_html: string;
  content_markdown: string;
  created_by?: JuriaPublicUser | null;
  created_at: string;
  note?: string;
}

export interface JuriaActivity {
  id: string;
  action: string;
  actor?: JuriaPublicUser | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface JuriaCaseContextPayload {
  reference?: string | null;
  title?: string | null;
  caseType?: string | null;
  status?: string | null;
  description?: string | null;
  court?: string | null;
  jurisdiction?: string | null;
  legalArguments?: string | null;
  parties?: string | null;
}

export const JURIA_JURISDICTIONS: { code: JuriaJurisdiction; label: string }[] = [
  { code: 'MA', label: 'Maroc' },
  { code: 'FR', label: 'France' },
  { code: 'AE', label: 'Émirats arabes unis' },
  { code: 'QA', label: 'Qatar' },
  { code: 'OTHER', label: 'Autre' },
];
