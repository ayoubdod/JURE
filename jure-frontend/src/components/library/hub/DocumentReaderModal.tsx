import { forwardRef } from 'react';
import DocumentReadingWorkspace, {
  type DocumentReadingWorkspaceRef,
} from '@/components/document-reading/DocumentReadingWorkspace';

/**
 * Thin compatibility wrapper — any document open path that used the old
 * PDF preview modal now enters the premium Reading Mode workspace.
 */
export type DocumentReaderModalRef = DocumentReadingWorkspaceRef;

type Props = {
  /** @deprecated Reading Mode owns details; kept for call-site compatibility */
  onDetails?: (doc: API.Document) => void;
  onHide?: () => void;
};

const DocumentReaderModal = forwardRef<DocumentReaderModalRef, Props>(function DocumentReaderModal(
  { onHide },
  ref
) {
  return <DocumentReadingWorkspace ref={ref} onHide={onHide} />;
});

DocumentReaderModal.displayName = 'DocumentReaderModal';

export default DocumentReaderModal;
export type { DocumentReadingWorkspaceRef };
