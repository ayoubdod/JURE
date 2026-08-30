import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DocumentReaderModal, { type DocumentReaderModalRef } from '@/components/library/hub/DocumentReaderModal';
import FilePreviewer from '@/components/library/FilePreviewer';
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
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (!hit) {
      setFileUrl(null);
      return;
    }
    let revoke: string | null = null;
    const open = async () => {
      const kind = (hit.source_type || '').toUpperCase();
      if (kind.includes('LIBRARY')) {
        try {
          const { data } = await apiGetDocument(Number(hit.document_id));
          readerRef.current?.show(data);
        } catch {
          /* keep closed */
        }
        return;
      }
      if (kind === 'CASE_DOCUMENT' && linkedCaseId) {
        try {
          const { data } = await apiGetCaseAttachments(linkedCaseId);
          const att = data.find((a) => String(a.id) === String(hit.document_id));
          if (att?.file_url) {
            setFileName(att.file_name || hit.document);
            setFileUrl(att.file_url);
          }
        } catch {
          /* keep closed */
        }
        return;
      }
      if (kind === 'UPLOAD') {
        try {
          const blob = await apiJuriaDownloadFileBlob(projectId, hit.document_id);
          revoke = URL.createObjectURL(blob);
          setFileName(hit.document);
          setFileUrl(revoke);
        } catch {
          /* keep closed */
        }
      }
    };
    void open();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [hit, projectId, linkedCaseId]);

  return (
    <>
      <DocumentReaderModal ref={readerRef} />
      <Dialog open={Boolean(fileUrl)} onOpenChange={(v) => { if (!v) { setFileUrl(null); onClose(); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate text-sm">{fileName}{hit?.page ? ` · p. ${hit.page}` : ''}</DialogTitle>
          </DialogHeader>
          {fileUrl && <FilePreviewer fileUrl={fileUrl} fileName={fileName} className="max-h-[70vh]" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
