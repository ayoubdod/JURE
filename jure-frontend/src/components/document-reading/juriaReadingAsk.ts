import {
  apiJuriaCreateConversation,
  apiJuriaCreateProject,
  apiJuriaCreateThread,
  apiJuriaSendMessageWithLang,
  apiJuriaSendThreadMessage,
} from '@/services/juria/api';
import { getJuriaErrorMessage, isJuriaDisabledError } from '@/utils/juriaErrors';
import { resolveLibraryMediaUrl } from '@/lib/libraryMedia';
import { JURIA_ENABLED } from '@/config/features';
import type { JuriaLang, JuriaMode } from '@/types/juria';
import type { ReadingContext, ReadingDocument } from './types';
import { extractReadingTextForAsk } from './extractReadingText';

export type ReadingJuriaSource = {
  label: string;
  page?: number;
  documentId?: string;
};

export type ReadingJuriaResult = {
  body: string;
  sources: ReadingJuriaSource[];
  kind: 'analysis' | 'draft' | 'summary';
  supported: boolean;
  needsReview: boolean;
  conversationId?: string;
  threadId?: string;
  projectId?: string;
};

export type ReadingJuriaSession = {
  conversationId?: string;
  threadId?: string;
  projectId?: string;
};

function pickMode(prompt: string): JuriaMode {
  if (/draft|response|prepare|memo|argument|rédig|prépar/i.test(prompt)) return 'DOCUMENT_DRAFTING';
  if (/risk|clause|contract|contrat|risque/i.test(prompt)) return 'CONTRACT_ANALYSIS';
  if (/research|provision|summar|expla|trouv|résum|identif/i.test(prompt)) return 'LEGAL_RESEARCH';
  return 'CHAT';
}

function pickKind(prompt: string): ReadingJuriaResult['kind'] {
  if (/draft|response|prepare|memo|argument/i.test(prompt)) return 'draft';
  if (/summar/i.test(prompt)) return 'summary';
  return 'analysis';
}

function toJuriaLang(lang: string | undefined): JuriaLang {
  if (lang === 'ar' || lang === 'en' || lang === 'fr' || lang === 'darija') return lang;
  return 'fr';
}

function buildPrompt(args: {
  question: string;
  doc: ReadingDocument;
  page: number;
  pageCount: number;
  selectionText?: string;
  context?: ReadingContext;
  pageTextBlock?: string;
  pagesUsed?: number[];
}): string {
  const lines = [
    args.question.trim(),
    '',
    '---',
    'Reading Mode — grounded context (this IS the document content; do not claim you lack access):',
    `Document title: ${args.doc.title}`,
  ];
  if (args.doc.id != null) lines.push(`Library document id: ${args.doc.id}`);
  if (args.doc.reference_number) lines.push(`Reference: ${args.doc.reference_number}`);
  lines.push(`Focus page: ${args.page}${args.pageCount ? ` of ${args.pageCount}` : ''}`);
  if (args.pagesUsed?.length) {
    lines.push(`Extracted pages included below: ${args.pagesUsed.join(', ')}`);
  }
  if (args.context?.caseRef || args.context?.caseId) {
    lines.push(
      `Case: ${[args.context.caseRef, args.context.caseTitle].filter(Boolean).join(' — ') || `#${args.context.caseId}`}`
    );
  }
  if (args.context?.clientName) lines.push(`Client: ${args.context.clientName}`);
  if (args.selectionText?.trim()) {
    lines.push('');
    lines.push('Lawyer-selected passage (priority):');
    lines.push(`“${args.selectionText.trim().slice(0, 2500)}”`);
  }
  if (args.pageTextBlock?.trim()) {
    lines.push('');
    lines.push(
      'DOCUMENT TEXT EXTRACT (primary source — summarize/analyze THIS; pages marked OCR were read via optical character recognition):'
    );
    lines.push(args.pageTextBlock.trim());
  } else {
    lines.push('');
    lines.push(
      'NOTE: No extractable text was available client-side (possible scanned PDF). Use the attached file if present.'
    );
  }
  lines.push('');
  lines.push(responseInstructions(args.question));
  return lines.join('\n');
}

function responseInstructions(question: string): string {
  const q = question.trim();
  if (/summar|résum|لخّص|لخص/i.test(q)) {
    return [
      'Response style for this request:',
      '- Write a concise lawyer-ready summary in clear prose (short paragraphs or tight bullets).',
      '- Cover only what is in the extract for the requested page(s); do not invent later-page content.',
      '- Cite page numbers inline where useful (e.g. [p. 1]).',
      '- Do NOT use a rigid template with numbered sections like "Facts / Legal analysis / Draft text / Verification".',
      '- Do NOT add a long disclaimer block; one short closing line is enough if needed.',
      '- If the page is only a promulgation/header, say so briefly and note that substantive articles are on later pages.',
    ].join('\n');
  }
  if (/draft|response|prepare|memo|argument|rédig|prépar|أعد|صغ/i.test(q)) {
    return [
      'Response style for this request:',
      '- Lead with the draft text the lawyer can reuse.',
      '- Then add a short note on sources/pages used and any points to verify.',
      '- Stay grounded in the extract; do not invent page content.',
    ].join('\n');
  }
  return [
    'Response style for this request:',
    '- Answer the question directly in clear prose.',
    '- Ground every claim in the extract/attachment and cite page numbers.',
    '- Mention briefly anything that needs lawyer verification.',
    '- Skip unused sections (e.g. do not invent a "Draft text" section if none was asked).',
    '- Do not invent page content.',
  ].join('\n');
}

async function fetchDocFile(doc: ReadingDocument): Promise<File | null> {
  if (!doc.file) return null;
  try {
    const ensurePdfName = (name: string) => {
      const clean = (name || 'document').split('?')[0].split('#')[0] || 'document';
      const base = clean.replace(/[\\/:*?"<>|]+/g, '_');
      return /\.(pdf|docx?)$/i.test(base) ? base : `${base}.pdf`;
    };

    if (doc.file.startsWith('blob:') || doc.file.startsWith('data:')) {
      const res = await fetch(doc.file);
      if (!res.ok) return null;
      const blob = await res.blob();
      const name = ensurePdfName(doc.title || 'document');
      return new File([blob], name, { type: blob.type || 'application/pdf' });
    }
    const href = resolveLibraryMediaUrl(doc.file);
    const token = (await import('@/stores/userStore')).default.getState().accessToken;
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(href, { credentials: 'include', headers });
    if (!res.ok) return null;
    const blob = await res.blob();
    const rawName = ensurePdfName(doc.file.split('/').pop() || `${doc.title || 'document'}.pdf`);
    return new File([blob], rawName, { type: blob.type || 'application/pdf' });
  } catch {
    return null;
  }
}

function libraryDocId(doc: ReadingDocument): number | null {
  const n = typeof doc.id === 'number' ? doc.id : Number(doc.id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Ask Juria about the open reading document using the real backend APIs.
 * Always extracts page text client-side and attaches the file so the model
 * receives substance, not only metadata.
 */
export async function askJuriaAboutDocument(args: {
  question: string;
  doc: ReadingDocument;
  page: number;
  pageCount: number;
  selectionText?: string;
  context?: ReadingContext;
  language?: string;
  session?: ReadingJuriaSession;
  signal?: AbortSignal;
  allowOcr?: boolean;
  onOcrProgress?: (info: {
    page: number;
    index: number;
    total: number;
    progress: number;
  }) => void;
}): Promise<{ result: ReadingJuriaResult; session: ReadingJuriaSession }> {
  if (!JURIA_ENABLED) {
    throw new Error('JURIA_DISABLED');
  }

  const mode = pickMode(args.question);
  const kind = pickKind(args.question);
  const language = toJuriaLang(args.language);
  const libId = libraryDocId(args.doc);
  const session: ReadingJuriaSession = { ...(args.session || {}) };

  const extracted = await extractReadingTextForAsk({
    doc: args.doc,
    page: args.page,
    question: args.question,
    // Auto-OCR scanned pages when embedded text is missing.
    allowOcr: args.allowOcr !== false,
    language: args.language,
    onOcrProgress: args.onOcrProgress,
  });
  const pageCount = extracted.pageCount || args.pageCount || args.page;
  const message = buildPrompt({
    ...args,
    pageCount,
    pageTextBlock: extracted.block,
    pagesUsed: extracted.pagesUsed,
  });
  // Prefer extracted/OCR page text. Only upload the binary when we have no text
  // (avoids 400 "Unsupported file type" and huge multipart payloads).
  const file =
    extracted.block.trim() || args.selectionText?.trim()
      ? null
      : await fetchDocFile(args.doc);

  if (!extracted.block.trim() && !file && !args.selectionText?.trim()) {
    throw new Error('OCR_FAILED');
  }

  let assistantContent = '';
  let sources: ReadingJuriaSource[] = [];

  try {
    if (libId != null) {
      try {
        if (!session.projectId) {
          const project = await apiJuriaCreateProject({
            name: `Reading · ${args.doc.title}`.slice(0, 120),
            preferred_language: language,
            jurisdiction_code: 'MA',
            linked_case_id: args.context?.caseId ?? null,
            library_document_ids: [libId],
            is_simple: true,
            description: 'Opened from Reading Mode',
          });
          session.projectId = project.id;
        }
        if (!session.threadId) {
          const thread = await apiJuriaCreateThread(session.projectId, {
            title: args.doc.title.slice(0, 80) || 'Reading Mode',
            mode,
          });
          session.threadId = thread.id;
        }
        const res = await apiJuriaSendThreadMessage(
          session.threadId,
          {
            message,
            language,
            mode,
            file: file ?? undefined,
            file_name: file?.name,
          },
          { signal: args.signal }
        );
        assistantContent = res.assistant_message?.content || '';
        sources = (res.assistant_message?.sources || []).map((s) => ({
          label: s.document || args.doc.title,
          page: s.page ?? undefined,
          documentId: s.document_id,
        }));
      } catch (projectErr) {
        if (isJuriaDisabledError(projectErr)) throw projectErr;
        session.projectId = undefined;
        session.threadId = undefined;
      }
    }

    if (!assistantContent) {
      if (!session.conversationId) {
        const detail = await apiJuriaCreateConversation({
          mode,
          linked_case_id: args.context?.caseId ?? null,
          title: `Reading · ${args.doc.title}`.slice(0, 120),
        });
        session.conversationId = String(detail.id);
      }
      const res = await apiJuriaSendMessageWithLang(
        session.conversationId,
        {
          message,
          language,
          file: file ?? undefined,
          file_name: file?.name,
        },
        { signal: args.signal }
      );
      assistantContent = res.assistant_message?.content || '';
      sources = (res.assistant_message?.sources || []).map((s) => ({
        label: s.document || args.doc.title,
        page: s.page ?? undefined,
        documentId: s.document_id,
      }));
      if (res.project_id) session.projectId = res.project_id;
      if (res.thread_id) session.threadId = res.thread_id;
    }
  } catch (e) {
    if (isJuriaDisabledError(e)) throw new Error('JURIA_DISABLED');
    const msg = getJuriaErrorMessage(e);
    throw new Error(msg || 'JURIA_ASK_FAILED');
  }

  if (!sources.length) {
    sources = extracted.pagesUsed.length
      ? extracted.pagesUsed.map((p) => ({
          label: args.doc.title,
          page: p,
          documentId: libId != null ? String(libId) : undefined,
        }))
      : [
          {
            label: args.doc.title,
            page: args.page,
            documentId: libId != null ? String(libId) : undefined,
          },
        ];
  }

  return {
    session,
    result: {
      body: assistantContent.trim() || '—',
      sources,
      kind,
      supported: Boolean(assistantContent.trim() && (extracted.block || file)),
      needsReview: true,
      conversationId: session.conversationId,
      threadId: session.threadId,
      projectId: session.projectId,
    },
  };
}
