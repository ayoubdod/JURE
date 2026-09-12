import React, { useState } from 'react';
import {
  Ban,
  Check,
  CheckCheck,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Forward,
  Pin,
  PinOff,
} from 'lucide-react';
import useUserStore from '@/stores/userStore';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { BACKEND_BASE_URL, MessageAttachmentKind } from '@/utils/constants';
import AudioControl from './AudioControl';
import MediaGalleryDialog from './MediaGalleryDialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  coerceMessageSharedItem,
  getMessageType,
  getSharedIds,
  SharedMessageCard,
} from './SharedMessageCard';
import {
  CallHistoryMessage,
  callHistoryTitle,
  callMetaFromMessage,
  formatCallDuration,
  isCallMessageType,
} from '@/components/conversations/call/CallHistoryMessage';
import { formatTime, useAppTranslation } from '@/i18n';
import { attachmentFileName, attachmentHref, getMemberPerson } from './conversationUtils';

function formatAttachmentSize(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtensionLabel(fileName: string): string {
  const part = fileName.includes('.') ? fileName.split('.').pop() : '';
  const ext = (part || 'FILE').toUpperCase();
  return ext.length > 5 ? ext.slice(0, 5) : ext;
}

function ChatFileAttachment({
  file,
  size,
}: {
  file: string;
  size?: number | null;
}) {
  const href = attachmentHref(file, BACKEND_BASE_URL);
  const name = attachmentFileName(file);
  const ext = fileExtensionLabel(name);
  const sizeLabel = formatAttachmentSize(size);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download={name}
      className={cn(
        'flex w-full min-w-[220px] max-w-[280px] items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 no-underline shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        'transition-colors hover:border-slate-300 hover:bg-slate-50',
        'dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600 dark:hover:bg-slate-900'
      )}
    >
      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[#F1ECFF] text-[#64499D] dark:bg-[#64499D]/25 dark:text-[#CFC2FF]">
        <FileText className="h-4 w-4" aria-hidden />
        <span className="mt-0.5 text-[8px] font-bold leading-none tracking-wide">{ext}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
          {name}
        </span>
        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
          {sizeLabel || ext}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </a>
  );
}
interface MessageItemProps {
  conversation: API.Conversation;
  msg: API.Message;
  onEdit?: (msg: API.Message) => void;
  onDelete?: (msg: API.Message) => void;
  onForward?: (msg: API.Message) => void;
  onPin?: (msg: API.Message, pinned: boolean) => void;
  onOpenSharedCase?: (caseId: number) => void;
  onOpenSharedTask?: (taskId: number) => void;
  onOpenSharedAppointment?: (appointmentId: number) => void;
  onRecallCall?: (kind: 'voice' | 'video') => void;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({
  conversation,
  msg,
  onEdit,
  onDelete,
  onForward,
  onPin,
  onOpenSharedCase,
  onOpenSharedTask,
  onOpenSharedAppointment,
  onRecallCall,
  isFirstInGroup = true,
  isLastInGroup = true,
}) => {
  const currentUser = useUserStore((s) => s.user);
  const { t, tf, lang } = useAppTranslation();
  const callCopy = t.conversations.call;

  const senderObj = msg.sender;
  const isNestedSender = typeof senderObj === 'object' && senderObj != null;
  const senderId = isNestedSender ? senderObj?.id ?? senderObj?.pk : senderObj;
  const sender = !isNestedSender && conversation.memberships
    ? conversation.memberships.find((i) => {
        const p = getMemberPerson(i);
        const uid = p?.id ?? p?.pk;
        return uid != null && (uid == senderId || String(uid) === String(senderId));
      })
    : null;
  const senderUser = isNestedSender
    ? senderObj
    : sender
      ? getMemberPerson(sender)
      : null;
  const senderName = senderUser
    ? senderUser.full_name?.trim() ||
      `${senderUser.first_name ?? ''} ${senderUser.last_name ?? ''}`.trim() ||
      senderUser.email?.split('@')[0] ||
      t.conversations.unknownContact
    : t.conversations.unknownContact;
  const myMembership = currentUser?.email && conversation.memberships?.find((m) => {
    const p = getMemberPerson(m);
    const email = (p?.email || '').toLowerCase();
    return email && email === currentUser.email.toLowerCase();
  });
  const myId = myMembership ? (getMemberPerson(myMembership)?.id ?? getMemberPerson(myMembership)?.pk) : currentUser?.id;

  // In direct chat with 2 people: if sender is not "other", then sender is "me"
  const otherMembership = conversation.type === 'direct' && conversation.memberships?.find((m) => {
    const p = getMemberPerson(m);
    return (p?.email || '').toLowerCase() !== (currentUser?.email || '').toLowerCase();
  });
  const otherId = otherMembership ? (getMemberPerson(otherMembership)?.id ?? getMemberPerson(otherMembership)?.pk) : null;

  const isOwn =
    msg.is_own === true ||
    (myId != null && senderId != null && (myId == senderId || String(myId) === String(senderId))) ||
    (senderUser?.email && currentUser?.email && senderUser.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    (conversation.type === 'direct' && otherId != null && senderId != null && String(senderId) !== String(otherId));
  const time = formatTime(msg.sent_at ?? msg.created ?? 0, lang);

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const isDeleted = msg.is_deleted === true;
  const body = msg.body ?? msg.content ?? msg.text ?? msg.message ?? '';
  const attachments = msg.attachments ?? [];
  const fileAttachments = attachments.filter((a) => a.kind === MessageAttachmentKind.FILE);
  const nonFileAttachments = attachments.filter((a) => a.kind !== MessageAttachmentKind.FILE);
  const mediaAttachments = nonFileAttachments.filter((a) =>
    [MessageAttachmentKind.IMAGE, MessageAttachmentKind.VIDEO].includes(a.kind)
  );
  const audioAttachments = nonFileAttachments.filter((a) => a.kind === MessageAttachmentKind.AUDIO);
  const hasAttachments = attachments.length > 0;
  const messageType = getMessageType(msg);
  const isCallHistory = isCallMessageType(messageType);
  const isShared =
    messageType === 'SHARED_CASE' || messageType === 'SHARED_TASK' || messageType === 'SHARED_APPOINTMENT';
  const sharedIds = isShared ? getSharedIds(msg) : null;
  const coercedShared = isShared && sharedIds ? coerceMessageSharedItem(msg, messageType, sharedIds) : null;
  const showPlaceholder = isDeleted || (!isShared && !isCallHistory && !body && !hasAttachments);
  const editedAt = msg.edited_at;
  const isPinned = msg.is_pinned === true || msg.isPinned === true;
  const forwardedDetail = msg.forwarded_from_detail ?? undefined;
  const showMediaBlock = !isDeleted && !isShared && mediaAttachments.length > 0;
  const showAudioBlock = !isDeleted && !isShared && audioAttachments.length > 0;
  const showTextBubble =
    showPlaceholder ||
    isShared ||
    Boolean(forwardedDetail) ||
    Boolean(String(body || '').trim());

  const canEdit = isOwn && !isDeleted && !isShared && !isCallHistory && (body || hasAttachments);
  const canDelete = isOwn && !isDeleted && !isCallHistory;
  const canForward = !isDeleted && !isCallHistory;
  const canPin = !isCallHistory;

  if (isCallHistory && !isDeleted) {
    const { kind, outcome, durationSeconds } = callMetaFromMessage(msg);
    const missed = outcome === 'missed' || outcome === 'declined';
    const declined = outcome === 'declined';
    const duration = formatCallDuration(durationSeconds);
    const isGroup = conversation.type === 'group';
    const showSenderName = !isOwn && isGroup && senderName && isFirstInGroup;
    const callSubtitle = missed
      ? isOwn
        ? declined
          ? callCopy.declined
          : callCopy.missed
        : callCopy.missedCallSubtitle
      : duration
        ? undefined
        : callCopy.ended;

    return (
      <div className={cn('group flex w-full items-start gap-2', isFirstInGroup ? 'mt-2' : 'mt-0.5', isOwn && 'justify-end')}>
        {!isOwn && (
          isFirstInGroup ? (
            <UserAvatar
              image={getPersonImage(senderUser as Record<string, unknown>)}
              firstName={senderUser?.first_name}
              lastName={senderUser?.last_name}
              size="xs"
              className="h-7 w-7 shrink-0"
            />
          ) : (
            <div className="h-7 w-7 shrink-0" aria-hidden />
          )
        )}
        <div
          className={cn(
            'flex min-w-0 max-w-[85%] flex-col sm:max-w-[70%]',
            isOwn ? 'items-end' : 'items-start'
          )}
        >
          {showSenderName && (
            <span className="mb-0.5 px-0.5 text-[11px] font-semibold leading-none text-slate-500 dark:text-slate-400">
              {senderName}
            </span>
          )}
          <CallHistoryMessage
            msg={msg}
            isOwn={isOwn}
            showInlineTime={false}
            title={callHistoryTitle(msg, {
              missedVoice: callCopy.missedCallTitle,
              missedVideo: callCopy.missedVideoCallTitle,
              voice: callCopy.historyVoiceCall,
              video: callCopy.historyVideoCall,
            })}
            subtitle={callSubtitle}
            recallLabel={callCopy.missedCallRecall}
            onRecall={
              missed && onRecallCall
                ? () => onRecallCall(kind)
                : undefined
            }
          />
          {isLastInGroup ? (
            <span className="mt-0.5 px-0.5 text-[11px] leading-none text-slate-400 dark:text-slate-500">{time}</span>
          ) : null}
        </div>
      </div>
    );
  }

  const handleGalleryOpen = (index: number) => {
    setGalleryInitialIndex(index);
    setIsGalleryOpen(true);
  };

  const handleGalleryClose = () => {
    setIsGalleryOpen(false);
  };

  const renderContextMenuItems = () => (
    <>
      {canEdit && onEdit && (
        <ContextMenuItem onClick={() => onEdit(msg)}>
          <Pencil className="me-2 h-3.5 w-3.5" />
          Edit
        </ContextMenuItem>
      )}
      {canDelete && onDelete && (
        <ContextMenuItem
          onClick={() => onDelete(msg)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="me-2 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      )}
      {canForward && onForward && (
        <ContextMenuItem onClick={() => onForward(msg)}>
          <Forward className="me-2 h-3.5 w-3.5" />
          Forward
        </ContextMenuItem>
      )}
      {canPin && onPin && (
        <ContextMenuItem onClick={() => onPin(msg, !isPinned)}>
          {isPinned ? (
            <>
              <PinOff className="me-2 h-3.5 w-3.5" />
              Unpin
            </>
          ) : (
            <>
              <Pin className="me-2 h-3.5 w-3.5" />
              Pin
            </>
          )}
        </ContextMenuItem>
      )}
    </>
  );

  const renderDropdownMenuItems = () => (
    <>
      {canEdit && onEdit && (
        <DropdownMenuItem onClick={() => onEdit(msg)}>
          <Pencil className="me-2 h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
      )}
      {canDelete && onDelete && (
        <DropdownMenuItem
          onClick={() => onDelete(msg)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="me-2 h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      )}
      {canForward && onForward && (
        <DropdownMenuItem onClick={() => onForward(msg)}>
          <Forward className="me-2 h-3.5 w-3.5" />
          Forward
        </DropdownMenuItem>
      )}
      {canPin && onPin && (
        <DropdownMenuItem onClick={() => onPin(msg, !isPinned)}>
          {isPinned ? (
            <>
              <PinOff className="me-2 h-3.5 w-3.5" />
              Unpin
            </>
          ) : (
            <>
              <Pin className="me-2 h-3.5 w-3.5" />
              Pin
            </>
          )}
        </DropdownMenuItem>
      )}
    </>
  );

  const isSending = typeof msg.id === 'number' && msg.id < 0;
  // Layout stays LTR (own = right). Bubble radii are physical bottom-right / bottom-left.
  const bubbleRadius = isOwn
    ? cn('rounded-2xl', isLastInGroup ? 'rounded-br-md' : 'rounded-br-2xl')
    : cn('rounded-2xl', isLastInGroup ? 'rounded-bl-md' : 'rounded-bl-2xl');

  const mediaBlock = showMediaBlock ? (
    <div
      className={cn(
        'overflow-hidden',
        bubbleRadius,
        showTextBubble || showAudioBlock || fileAttachments.length > 0 ? 'mb-1.5' : null,
        isSending && 'opacity-80'
      )}
    >
      {mediaAttachments.length > 1 ? (
        <div className="grid grid-cols-2 gap-0.5 overflow-hidden bg-slate-100 dark:bg-slate-800">
          {mediaAttachments.slice(0, 4).map((attachment, index) => {
            const src = attachmentHref(attachment.file, BACKEND_BASE_URL);
            return (
              <div
                key={attachment.id}
                className="relative aspect-square cursor-pointer overflow-hidden"
                onClick={() => handleGalleryOpen(index)}
              >
                {attachment.kind === MessageAttachmentKind.IMAGE ? (
                  <img src={src} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={src} className="h-full w-full object-cover" />
                )}
                {index === 3 && mediaAttachments.length > 4 ? (
                  <div
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 text-lg font-medium text-white hover:bg-black/60"
                    onClick={() => handleGalleryOpen(3)}
                  >
                    +{mediaAttachments.length - 4}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        mediaAttachments.map((attachment, index) => {
          const src = attachmentHref(attachment.file, BACKEND_BASE_URL);
          return attachment.kind === MessageAttachmentKind.IMAGE ? (
            <img
              key={attachment.id}
              src={src}
              alt=""
              className="block max-h-[360px] max-w-full cursor-pointer object-cover hover:opacity-95"
              onClick={() => handleGalleryOpen(index)}
            />
          ) : (
            <video
              key={attachment.id}
              controls
              src={src}
              className="block max-h-[360px] max-w-full cursor-pointer object-cover"
              onClick={() => handleGalleryOpen(index)}
            />
          );
        })
      )}
    </div>
  ) : null;

  const audioBlock = showAudioBlock ? (
    <div className={cn('flex w-full flex-col gap-1.5', (showMediaBlock || showTextBubble) && 'mt-1.5')}>
      {audioAttachments.map((attachment) => (
        <AudioControl
          key={attachment.id}
          audioSrc={attachmentHref(attachment.file, BACKEND_BASE_URL)}
          isOwn={isOwn}
          durationMs={attachment.duration_ms}
        />
      ))}
    </div>
  ) : null;

  const bubbleContent = showTextBubble ? (
    <div
      dir="auto"
      className={cn(
        'text-[13px] leading-relaxed text-start',
        isDeleted
          ? cn(
              'border border-dashed px-3 py-2',
              bubbleRadius,
              isOwn
                ? 'border-[#64499D]/35 bg-[#64499D]/10 text-[#5a3f8f] dark:border-[#8B6FD1]/40 dark:bg-[#64499D]/15 dark:text-[#CFC2FF]'
                : 'border-slate-300/90 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-400'
            )
          : isShared
            ? 'rounded-none bg-transparent px-0 py-0 text-slate-900 dark:text-slate-100'
            : cn('px-3 py-1.5', bubbleRadius),
        !isDeleted &&
          !isShared &&
          (isOwn
            ? 'bg-[#64499D] text-white'
            : 'border border-slate-200/90 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'),
        isSending && !isDeleted && 'opacity-80'
      )}
    >
      {forwardedDetail && !isDeleted && (
        <div className="mb-1 flex items-center gap-1 text-[11px] opacity-90">
          <Forward className="h-3 w-3 shrink-0" />
          <span>{t.conversations.forwarded}</span>
          {forwardedDetail.body && (
            <span className="truncate opacity-80">
              — {forwardedDetail.body.slice(0, 40)}
              {forwardedDetail.body.length > 40 ? '…' : ''}
            </span>
          )}
        </div>
      )}
      {isDeleted ? (
        <p className="flex items-center gap-2 text-[12.5px] font-medium tracking-tight">
          <Ban className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          <span>{t.conversations.messageDeletedPreview}</span>
        </p>
      ) : showPlaceholder ? (
        <p className="text-current/50">…</p>
      ) : isShared ? (
        coercedShared === 'deleted' || coercedShared === null ? (
          <p className="max-w-[320px] text-[13px] italic text-slate-500 dark:text-slate-400">
            {tf(t.conversations.sharedUnavailable, {
              item:
                messageType === 'SHARED_CASE'
                  ? t.conversations.sharedCase
                  : messageType === 'SHARED_TASK'
                    ? t.conversations.sharedTask
                    : t.conversations.sharedAppointment,
            })}
          </p>
        ) : (
          <div className="flex w-full max-w-[320px] flex-col items-stretch gap-1.5">
            <SharedMessageCard
              item={coercedShared}
              onOpenCase={onOpenSharedCase}
              onOpenTask={onOpenSharedTask}
              onOpenAppointment={onOpenSharedAppointment}
            />
            {body?.trim() ? (
              <p className="break-words px-0.5 text-[13px] text-slate-800 dark:text-slate-200">{body.trim()}</p>
            ) : null}
          </div>
        )
      ) : body ? (
        <p className="break-words">{body}</p>
      ) : null}
    </div>
  ) : null;

  const fileCards =
    !showPlaceholder && fileAttachments.length > 0 ? (
      <div className={cn('flex w-full flex-col gap-1.5', (showTextBubble || showMediaBlock || showAudioBlock) && 'mt-1.5')}>
        {fileAttachments.map((attachment) => (
          <ChatFileAttachment key={attachment.id} file={attachment.file} size={attachment.size} />
        ))}
      </div>
    ) : null;

  // Read receipt (WhatsApp-style): only on sender's own messages when message.is_own or we detect ownership
  const deliveredCount = msg.delivered_count ?? 0;
  const readCount = msg.read_count ?? 0;
  const readReceipt =
    isOwn && !isDeleted ? (
      readCount > 0 ? (
        <CheckCheck className="h-3 w-3 text-blue-500 shrink-0" aria-label={t.conversations.readAria} />
      ) : deliveredCount > 0 ? (
        <CheckCheck className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" aria-label={t.conversations.deliveredAria} />
      ) : (
        <Check className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" aria-label={t.conversations.sentAria} />
      )
    ) : null;

  const hasMenu = (canEdit && onEdit) || (canDelete && onDelete) || (canForward && onForward) || (canPin && onPin);

  const wrapper = (children: React.ReactNode) => {
    if (hasMenu) {
      return (
        <ContextMenu>
          <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
          <ContextMenuContent>{renderContextMenuItems()}</ContextMenuContent>
        </ContextMenu>
      );
    }
    return <>{children}</>;
  };

  const isGroup = conversation.type === 'group';
  const showSenderName = !isOwn && isGroup && senderName && isFirstInGroup;

  return (
    <>
      {wrapper(
        <div className={cn('group flex w-full items-start gap-2', isFirstInGroup ? 'mt-2.5' : 'mt-0.5', isOwn && 'justify-end')}>
          {!isOwn && (
            isFirstInGroup ? (
              <UserAvatar
                image={getPersonImage(senderUser as Record<string, unknown>)}
                firstName={senderUser?.first_name}
                lastName={senderUser?.last_name}
                size="xs"
                className="h-7 w-7 shrink-0"
              />
            ) : (
              <div className="h-7 w-7 shrink-0" aria-hidden />
            )
          )}
          <div
            className={cn(
              'flex min-w-0 max-w-[70%] flex-col',
              isOwn ? 'items-end' : 'items-start'
            )}
          >
            {showSenderName && (
              <span className="mb-0.5 px-0.5 text-[11px] font-semibold leading-none text-slate-500 dark:text-slate-400">
                {senderName}
              </span>
            )}
            <div className="relative min-w-0 max-w-full">
              {hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        'absolute top-0 z-10 rounded-md p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:hover:bg-slate-700',
                        isOwn ? '-start-7' : '-end-7'
                      )}
                      aria-label={t.conversations.optionsAria}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                    {renderDropdownMenuItems()}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="flex min-w-0 items-start gap-1">
                {isPinned && (
                  <Pin className="mt-1.5 h-3 w-3 shrink-0 text-[#64499D]" />
                )}
                <div className="min-w-0">
                  {mediaBlock}
                  {bubbleContent}
                  {audioBlock}
                  {fileCards}
                </div>
              </div>
            </div>
            {isLastInGroup ? (
              <div className="mt-0.5 flex min-h-[14px] items-center gap-1 px-0.5">
                <span className="text-[11px] leading-none text-slate-400 dark:text-slate-500">
                  {isSending ? t.conversations.sending : time}
                </span>
                {editedAt && !isSending ? (
                  <span className="text-[11px] italic leading-none text-slate-400">{t.conversations.edited}</span>
                ) : null}
                {readReceipt}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <MediaGalleryDialog
        isOpen={isGalleryOpen}
        onClose={handleGalleryClose}
        attachments={(msg.attachments ?? []) as API.MessageAttachment[]}
        initialIndex={galleryInitialIndex}
      />
    </>
  );
};

export default MessageItem;
