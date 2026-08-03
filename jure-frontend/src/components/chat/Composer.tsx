import React, { useRef, useState } from 'react';
import { Paperclip, Mic, Send, Share2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import DocumentLibraryPicker from './DocumentLibraryPicker';
import { SharePicker } from './SharePicker';
import type { SharePickResult } from './sharePickerTypes';

const Composer: React.FC<{
  disabled?: boolean;
  conversationId?: number | null;
  onSend: (text: string, attachments?: File[]) => void;
  onAttachFiles: (files: File[]) => void;
  onRecordVoice: (blob: Blob) => void;
  onSendShared?: (args: {
    messageType: API.MessageType;
    sharedCaseId?: number;
    sharedTaskId?: number;
    sharedAppointmentId?: number;
    sharedItem: API.SharedItem;
  }) => Promise<void>;
}> = ({ disabled, conversationId, onSend, onAttachFiles, onRecordVoice, onSendShared }) => {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSending, setShareSending] = useState(false);

  const startRecording = async () => {
    if (rec) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRec = new MediaRecorder(stream);
    mediaRec.ondataavailable = (e) => chunks.current.push(e.data);
    mediaRec.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      chunks.current = [];
      onRecordVoice(blob);
      stream.getTracks().forEach((t) => t.stop());
      setRec(null);
    };
    mediaRec.start();
    setRec(mediaRec);
  };

  const stopRecording = () => {
    rec?.stop();
  };

  const mapPickToShared = (result: SharePickResult): {
    messageType: API.MessageType;
    sharedCaseId?: number;
    sharedTaskId?: number;
    sharedAppointmentId?: number;
    sharedItem: API.SharedItem;
  } | null => {
    if (result.kind === 'case') {
      const r = result.row;
      return {
        messageType: 'SHARED_CASE',
        sharedCaseId: r.id,
        sharedItem: {
          type: 'CASE',
          id: String(r.id),
          title: r.title ?? '',
          status: r.status ?? '',
          priority: r.priority ?? null,
          reference: r.reference ?? null,
          dueDate: null,
          caseType: r.caseType ?? null,
          assignedTo: null,
        },
      };
    }
    if (result.kind === 'task') {
      const r = result.row;
      return {
        messageType: 'SHARED_TASK',
        sharedTaskId: r.id,
        sharedItem: {
          type: 'TASK',
          id: String(r.id),
          title: r.title ?? '',
          status: r.status ?? '',
          priority: r.priority ?? null,
          reference: null,
          dueDate: r.dueDate ?? null,
          caseType: null,
          assignedTo: null,
        },
      };
    }
    const r = result.row;
    return {
      messageType: 'SHARED_APPOINTMENT',
      sharedAppointmentId: r.id,
      sharedItem: {
        type: 'APPOINTMENT',
        id: String(r.id),
        title: r.title ?? '',
        status: r.status ?? '',
        priority: null,
        reference: null,
        dueDate: null,
        caseType: null,
        assignedTo: null,
        date: r.date ?? null,
        duration: r.duration ?? null,
      },
    };
  };

  const handleSharePick = async (result: SharePickResult) => {
    if (!onSendShared || conversationId == null) return;
    const mapped = mapPickToShared(result);
    if (!mapped) return;
    setShareSending(true);
    try {
      await onSendShared(mapped);
    } finally {
      setShareSending(false);
    }
  };

  return (
    <div className="shrink-0 px-2 sm:px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <TooltipProvider>
          <DocumentLibraryPicker
            onSelect={onAttachFiles}
            onUploadClick={() => fileRef.current?.click()}
            disabled={disabled}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 sm:h-8 sm:w-8 shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              aria-label="Attach from Document Library"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </DocumentLibraryPicker>
          {!rec ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={startRecording}
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 sm:h-8 sm:w-8 shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  disabled={disabled}
                  aria-label="Record voice note"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Record voice note</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={stopRecording}
                  variant="destructive"
                  size="icon"
                  className="h-11 w-11 sm:h-8 sm:w-8 shrink-0"
                  aria-label="Stop recording"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop recording</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 h-11 sm:h-8 text-[15px] sm:text-[13px] rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus-visible:ring-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) {
                onSend(text.trim());
                setText('');
              }
            }
          }}
          disabled={disabled}
        />

        {onSendShared && conversationId != null && (
          <SharePicker
            open={shareOpen}
            onOpenChange={setShareOpen}
            disabled={disabled || shareSending}
            onPick={handleSharePick}
            triggerTooltip="Share case, task or appointment"
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 sm:h-8 sm:w-8 shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-40"
                disabled={disabled || shareSending}
                aria-label="Share case, task or appointment"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            }
          />
        )}

        <Button
          type="button"
          onClick={() => {
            if (!text.trim()) return;
            onSend(text.trim());
            setText('');
          }}
          disabled={disabled || !text.trim()}
          size="icon"
          className="h-11 w-11 sm:h-8 sm:w-8 shrink-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <Input
        ref={fileRef}
        type="file"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onAttachFiles(files);
          e.currentTarget.value = '';
        }}
        className="hidden"
        multiple
      />
    </div>
  );
};

export default Composer;
