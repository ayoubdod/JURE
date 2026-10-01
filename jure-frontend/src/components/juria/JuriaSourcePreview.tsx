import { useEffect, useRef } from 'react';
import DocumentReaderModal, { type DocumentReaderModalRef } from '@/components/library/hub/DocumentReaderModal';
import { apiGetDocument } from '@/services/library/api';
import { apiGetCaseAttachments } from '@/services/case/api';
import { apiJuriaDownloadFileBlob } from '@/services/juria/api';
import type { JuriaSourceHit } from '@/types/juria';

export function JuriaSourcePreview({
  hit,
  projectId,
  linkedCaseId,
  onClose,
}: {
  hit: JuriaSourceHit | null;
  projectId: string;
  linkedCaseId?: number | null;
  onClose: () => void;
}) {
  const readerRef = useRef<DocumentReaderModalRef>(null);
  const revokeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hit) return;
    let cancelled = false;

    const open = async () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }

      const kind = (hit.source_type || '').toUpperCase();
      const caseCtx = linkedCaseId != null ? { caseId: linkedCaseId } : undefined;

      if (kind.includes('LIBRARY')) {
        try {
          const { data } = await apiGetDocument(Number(hit.document_id));
          if (!cancelled) readerRef.current?.show(data, caseCtx);
        } catch {
          /* keep closed */
        }
        return;
      }

      if (kind === 'CASE_DOCUMENT' && linkedCaseId) {
        try {
          const { data } = await apiGetCaseAttachments(linkedCaseId);
          const att = data.find((a) => String(a.id) === String(hit.document_id));
          if (att?.file_url && !cancelled) {
            readerRef.current?.show(
              {
                id: att.id,
                title: att.file_name || hit.document,
                file: att.file_url,
              },
              caseCtx
            );
          }
        } catch {
          /* keep closed */
        }
        return;
      }

      if (kind === 'UPLOAD') {
        try {
          const blob = await apiJuriaDownloadFileBlob(projectId, hit.document_id);
          const objectUrl = URL.createObjectURL(blob);
          revokeRef.current = objectUrl;
          if (!cancelled) {
            readerRef.current?.show(
              {
                id: hit.document_id,
                title: hit.document,
                file: objectUrl,
              },
              caseCtx
            );
          }
        } catch {
          /* keep closed */
        }
      }
    };

    void open();
    return () => {
      cancelled = true;
    };
  }, [hit, projectId, linkedCaseId]);

  useEffect(() => {
    return () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
    };
  }, []);

  return <DocumentReaderModal ref={readerRef} onHide={onClose} />;
}
