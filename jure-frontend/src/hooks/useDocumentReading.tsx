import { useCallback, useRef } from 'react';
import DocumentReaderModal, {
  type DocumentReaderModalRef,
} from '@/components/library/hub/DocumentReaderModal';
import type { ReadingContext, ReadingDocument } from '@/components/document-reading/types';

/** Shared opener so any surface can launch Reading Mode without a simple PDF tab. */
export function useDocumentReading() {
  const ref = useRef<DocumentReaderModalRef>(null);

  const openDocument = useCallback((doc: ReadingDocument | API.Document, context?: ReadingContext) => {
    ref.current?.show(doc, context);
  }, []);

  const openAttachment = useCallback(
    (
      att: { id?: number | string; file_name?: string; file_url?: string | null; title?: string },
      context?: ReadingContext
    ) => {
      if (!att.file_url) return;
      ref.current?.show(
        {
          id: att.id,
          title: att.file_name || att.title || 'Document',
          file: att.file_url,
        },
        context
      );
    },
    []
  );

  const readingPortal = <DocumentReaderModal ref={ref} />;

  return { openDocument, openAttachment, readingPortal };
}
