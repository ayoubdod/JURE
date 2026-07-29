import type { JuriaMode } from '@/types/juria';

/** API message role strings from Django. */
export type JuriaApiMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface JuriaApiConversationListItem {
  id: string;
  title: string;
  mode: JuriaMode;
  linked_case_id: number | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_message_preview: string | null;
}

export interface JuriaApiMessage {
  id: string;
  role: JuriaApiMessageRole;
  content: string;
  mode: JuriaMode;
  has_attachment: boolean;
  attachment_name: string | null;
  attachment_type: string | null;
  tokens_used: number | null;
  response_time_ms: number | null;
  juria_message_id: string | null;
  generated_document_path: string | null;
  created_at: string;
  /** Present on assistant messages from chat / draft endpoints. */
  suggestions?: string[];
}

export interface JuriaApiConversationDetail extends JuriaApiConversationListItem {
  messages: JuriaApiMessage[];
}

export interface JuriaApiSendMessageResponse {
  user_message: JuriaApiMessage;
  assistant_message: JuriaApiMessage & { suggestions?: string[] };
}

export interface JuriaApiDraftResponse {
  message: JuriaApiMessage;
  document_download_url: string;
}

export interface JuriaApiUsage {
  total_messages: number;
  total_tokens: number;
  contract_analyses: number;
  documents_drafted: number;
  research_queries: number;
  month: string;
  year: number;
}

export interface JuriaApiErrorBody {
  detail?: string;
  error?: string;
}
