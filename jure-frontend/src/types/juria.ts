export type JuriaMode = 'CHAT' | 'CONTRACT_ANALYSIS' | 'LEGAL_RESEARCH' | 'DOCUMENT_DRAFTING';

export type JuriaMessageRole = 'user' | 'assistant' | 'system';

export interface JuriaAttachmentMeta {
  name: string;
  mime: string;
  size?: number;
}

export interface JuriaDocumentCard {
  typeName: string;
  previewLines: string;
  generatedAt: string;
  /** Absolute URL from draft response (same-origin or API host). */
  docxUrl?: string;
  /** Use authenticated GET /juria/documents/:id/download/ when no docxUrl. */
  downloadMessageId?: string;
}

export interface JuriaMessage {
  id: string;
  role: JuriaMessageRole;
  content: string;
  createdAt: string;
  suggestions?: string[];
  attachment?: JuriaAttachmentMeta;
  documentCard?: JuriaDocumentCard;
  /** Optimistic UI only (API returns full messages on success). */
  streaming?: boolean;
  tokensUsed?: number;
}

export interface JuriaConversation {
  id: string;
  title: string;
  mode: JuriaMode;
  /** From API `linked_case_id` */
  caseId?: number;
  caseReference?: string;
  caseTitle?: string;
  archived: boolean;
  updatedAt: string;
  createdAt?: string;
  messages: JuriaMessage[];
  /** Sidebar preview when messages not loaded */
  lastMessagePreview?: string | null;
}

/** @deprecated Case context JSON was used for mock; server uses linked_case_id on conversation. */
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
