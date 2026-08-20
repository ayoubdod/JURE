import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Mic, Send, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import DocumentLibraryPicker from './DocumentLibraryPicker';
import { SharePicker } from './SharePicker';
import type { SharePickResult } from './sharePickerTypes';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

const Composer: React.FC<{
  disabled?: boolean;
  conversationId?: number | null;
  onSend: (text: string, attachments?: File[]) => void | Promise<void>;
  onAttachFiles: (files: File[]) => void;
  onRecordVoice: (blob: Blob) => void | Promise<void>;
  onSendShared?: (args: {
    messageType: API.MessageType;
    sharedCaseId?: number;
    sharedTaskId?: number;
    sharedAppointmentId?: number;
    sharedItem: API.SharedItem;
  }) => Promise<void>;
}> = ({ disabled, conversationId, onSend, onAttachFiles, onRecordVoice, onSendShared }) => {
  const { t } = useAppTranslation();
  const c = t.conversations.composer;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const discardRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(18).fill(0.2));
  const [voiceSending, setVoiceSending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSending, setShareSending] = useState(false);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [text]);

  const stopAnalyser = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (rec || voiceSending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      discardRef.current = false;
      chunks.current = [];
      setElapsed(0);

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const next: number[] = [];
        const step = Math.max(1, Math.floor(data.length / 18));
        for (let i = 0; i < 18; i++) {
          const v = data[i * step] ?? 0;
          next.push(0.15 + (v / 255) * 0.85);
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mediaRec = new MediaRecorder(stream, { mimeType: mime });
      mediaRec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mediaRec.onstop = () => {
        const blob = new Blob(chunks.current, { type: mediaRec.mimeType || 'audio/webm' });
        chunks.current = [];
        stopAnalyser();
        stopStream();
        setRec(null);
        setLevels(Array(18).fill(0.2));
        if (discardRef.current || blob.size < 200) return;
        setVoiceSending(true);
        void Promise.resolve(onRecordVoice(blob))
          .catch(() => {})
          .finally(() => setVoiceSending(false));
      };
      mediaRec.start();
      setRec(mediaRec);
    } catch {
      stopAnalyser();
      stopStream();
    }
  };

  useEffect(() => {
    if (!rec) return;
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 200);
    return () => window.clearInterval(id);
  }, [rec]);

  useEffect(
    () => () => {
      stopAnalyser();
      stopStream();
    },
    []
  );

  const cancelRecording = () => {
    discardRef.current = true;
    rec?.stop();
  };

  const sendRecording = () => {
    discardRef.current = false;
    rec?.stop();
  };

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      /* keep draft on failure */
    } finally {
      setSending(false);
    }
  };

  const busy = disabled || sending || shareSending || voiceSending;
  const recording = !!rec;
  const iconBtn =
    'h-11 w-11 sm:h-9 sm:w-9 shrink-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';

  return (
    <div className="shrink-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-2 pt-1 dark:from-slate-950 dark:via-slate-950 sm:px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className={cn(
          'rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:border-slate-700 dark:bg-slate-900',
          'focus-within:border-[#64499D]/35 focus-within:ring-2 focus-within:ring-[#64499D]/15',
          recording && 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-200/40',
          busy && !recording && 'opacity-90'
        )}
      >
        {recording || voiceSending ? (
          <div className="flex items-center gap-2 px-1 py-0.5">
            {voiceSending ? (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#64499D]/10 text-[#64499D]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </span>
                <p className="min-w-0 flex-1 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                  {c.sendingVoice}
                </p>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 text-slate-500 sm:h-9 sm:w-9"
                  onClick={cancelRecording}
                  aria-label={c.cancelRecordAria}
                >
                  <X className="h-4 w-4" />
                </Button>
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                </span>
                <span className="w-10 shrink-0 font-mono text-[12px] tabular-nums text-slate-700 dark:text-slate-200">
                  {formatElapsed(elapsed)}
                </span>
                <div className="flex h-8 min-w-0 flex-1 items-center gap-[3px]" aria-hidden>
                  {levels.map((level, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full bg-rose-500/80"
                      style={{ height: `${Math.round(4 + level * 22)}px` }}
                    />
                  ))}
                </div>
                <span className="sr-only">{c.recording}</span>
                <Button
                  type="button"
                  size="icon"
                  className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
                  onClick={sendRecording}
                  aria-label={c.sendVoiceAria}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-end gap-1">
          <TooltipProvider>
            <DocumentLibraryPicker
              onSelect={onAttachFiles}
              onUploadClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={iconBtn}
                aria-label={c.attachAria}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </DocumentLibraryPicker>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={startRecording}
                  variant="ghost"
                  size="icon"
                  className={iconBtn}
                  disabled={busy}
                  aria-label={c.recordAria}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{c.recordTooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            placeholder={c.placeholder}
            disabled={busy}
            aria-label={c.placeholder}
            className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-1.5 py-2.5 text-[15px] leading-snug text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed dark:text-slate-100 sm:min-h-[36px] sm:py-2 sm:text-[13px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <span className="sr-only">{c.hint}</span>

          {onSendShared && conversationId != null && (
            <SharePicker
              open={shareOpen}
              onOpenChange={setShareOpen}
              disabled={busy}
              onPick={handleSharePick}
              triggerTooltip={c.shareAria}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(iconBtn, 'disabled:opacity-40')}
                  disabled={busy}
                  aria-label={c.shareAria}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              }
            />
          )}

          <Button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !text.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
            aria-label={sending ? c.sendingAria : c.sendAria}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
          </div>
        )}
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
