export type ReadingDocument = {
  id?: number | string;
  title: string;
  file?: string | null;
  file_name?: string | null;
  external_url?: string | null;
  resource_type?: string | null;
  category?: string | null;
  author?: string | null;
  source?: string | null;
  language?: string | null;
  jurisdiction_name?: string | null;
  reference_number?: string | null;
  created?: string | null;
  created_at?: string | null;
  created_by_name?: string | null;
  description?: string | null;
  size?: number | null;
  scope?: string | null;
};

export type ReadingContext = {
  caseId?: number | null;
  caseRef?: string | null;
  caseTitle?: string | null;
  clientName?: string | null;
};

export type ReadingHighlight = {
  id: string;
  page: number;
  text: string;
  color: 'amber' | 'lavender' | 'emerald' | 'rose';
  note?: string;
  createdAt: string;
};

export type ReadingNoteDraft = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  page: number | null;
  highlightText?: string;
  savedRemoteId?: number;
  createdAt: string;
};

export type WorkspaceTab = 'notes' | 'juria' | 'share';

export type DocumentReadingWorkspaceRef = {
  show: (
    doc: ReadingDocument | API.Document,
    context?: ReadingContext,
    documents?: Array<ReadingDocument | API.Document>,
  ) => void;
  hide: () => void;
};

export function readingDocsFromAttachments(
  attachments:
    | Array<{
        id?: number | string;
        file_name?: string | null;
        file_url?: string | null;
        title?: string | null;
      }>
    | null
    | undefined,
): ReadingDocument[] {
  return (attachments ?? [])
    .filter((att) => Boolean(att.file_url))
    .map((att) => ({
      id: att.id,
      title: att.file_name || att.title || 'Document',
      file: att.file_url,
      file_name: att.file_name || att.title || null,
    }));
}
