import React, { useState } from 'react';
import {
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
  isCallMessageType,
} from '@/components/conversations/call/CallHistoryMessage';
import { useAppTranslation } from '@/i18n';
import { attachmentFileName, attachmentHref } from './conversationUtils';

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
  const { t, tf } = useAppTranslation();
  const callCopy = t.conversations.call;

  // Helper: get person object from membership (backend may use user or cabinet_member)
  const getMemberPerson = (m: API.ConversationMembership) =>
    (m as any).user ?? (m as any).cabinet_member ?? (m as any).member;

  const senderObj = (msg as any).sender;
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
    ? (senderUser as any).full_name?.trim() ||
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
    (msg as any).is_own === true ||
    (myId != null && senderId != null && (myId == senderId || String(myId) === String(senderId))) ||
    (senderUser?.email && currentUser?.email && senderUser.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    (conversation.type === 'direct' && otherId != null && senderId != null && String(senderId) !== String(otherId));
  const time = new Date((msg as any).sent_at ?? (msg as any).created ?? 0).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const isDeleted = (msg as any).is_deleted === true;
  const body = msg.body ?? (msg as any).content ?? (msg as any).text ?? (msg as any).message ?? '';
  const attachments = msg.attachments ?? [];
  const fileAttachments = attachments.filter((a) => a.kind === MessageAttachmentKind.FILE);
  const nonFileAttachments = attachments.filter((a) => a.kind !== MessageAttachmentKind.FILE);
  const hasAttachments = attachments.length > 0;
  const messageType = getMessageType(msg);
  const isCallHistory = isCallMessageType(messageType);
  const isShared =
    messageType === 'SHARED_CASE' || messageType === 'SHARED_TASK' || messageType === 'SHARED_APPOINTMENT';
  const sharedIds = isShared ? getSharedIds(msg) : null;
  const coercedShared = isShared && sharedIds ? coerceMessageSharedItem(msg, messageType, sharedIds) : null;
  const showPlaceholder = isDeleted || (!isShared && !isCallHistory && !body && !hasAttachments);
  const editedAt = (msg as any).edited_at;
  const isPinned =
    (msg as { is_pinned?: boolean }).is_pinned === true ||
    (msg as { isPinned?: boolean }).isPinned === true;
  const forwardedDetail = (msg as any).forwarded_from_detail as API.ForwardedFromDetail | undefined;
  const showTextBubble =
    showPlaceholder ||
    isShared ||
    Boolean(forwardedDetail) ||
    Boolean(String(body || '').trim()) ||
    nonFileAttachments.length > 0;

  const canEdit = isOwn && !isDeleted && !isShared && !isCallHistory && (body || hasAttachments);
  const canDelete = isOwn && !isCallHistory;
  const canForward = !isDeleted && !isCallHistory;
  const canPin = !isCallHistory;

  if (isCallHistory && !isDeleted) {
    const { kind, outcome } = callMetaFromMessage(msg);
    const missed = outcome === 'missed' || outcome === 'declined';
    const isGroup = conversation.type === 'group';
    const showSenderName = !isOwn && isGroup && senderName && isFirstInGroup;

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
            'flex min-w-0 max-w-[70%] flex-col',
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
            subtitle={missed ? callCopy.missedCallSubtitle : undefined}
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
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit
        </ContextMenuItem>
      )}
      {canDelete && onDelete && (
        <ContextMenuItem
          onClick={() => onDelete(msg)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      )}
      {canForward && onForward && (
        <ContextMenuItem onClick={() => onForward(msg)}>
          <Forward className="mr-2 h-3.5 w-3.5" />
          Forward
        </ContextMenuItem>
      )}
      {canPin && onPin && (
        <ContextMenuItem onClick={() => onPin(msg, !isPinned)}>
          {isPinned ? (
            <>
              <PinOff className="mr-2 h-3.5 w-3.5" />
              Unpin
            </>
          ) : (
            <>
              <Pin className="mr-2 h-3.5 w-3.5" />
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
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
      )}
      {canDelete && onDelete && (
        <DropdownMenuItem
          onClick={() => onDelete(msg)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      )}
      {canForward && onForward && (
        <DropdownMenuItem onClick={() => onForward(msg)}>
          <Forward className="mr-2 h-3.5 w-3.5" />
          Forward
        </DropdownMenuItem>
      )}
      {canPin && onPin && (
        <DropdownMenuItem onClick={() => onPin(msg, !isPinned)}>
          {isPinned ? (
            <>
              <PinOff className="mr-2 h-3.5 w-3.5" />
              Unpin
            </>
          ) : (
            <>
              <Pin className="mr-2 h-3.5 w-3.5" />
              Pin
            </>
          )}
        </DropdownMenuItem>
      )}
    </>
  );

  const isSending = typeof msg.id === 'number' && msg.id < 0;
  const bubbleRadius = isOwn
    ? cn('rounded-2xl', isLastInGroup ? 'rounded-br-md' : 'rounded-br-2xl')
    : cn('rounded-2xl', isLastInGroup ? 'rounded-bl-md' : 'rounded-bl-2xl');

  const bubbleContent = showTextBubble ? (
    <div
      className={cn(
        'text-[13px] leading-relaxed',
        isShared
          ? 'rounded-none bg-transparent px-0 py-0 text-slate-900 dark:text-slate-100'
          : cn('px-3 py-1.5', bubbleRadius),
        !isShared &&
          (isOwn
            ? 'bg-[#64499D] text-white'
            : 'border border-slate-200/90 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'),
        isSending && 'opacity-80'
      )}
    >
      {forwardedDetail && (
        <div className="text-[11px] opacity-90 mb-1 flex items-center gap-1">
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
      {showPlaceholder ? (
        <p className="italic opacity-75">{t.conversations.messageDeletedPreview}</p>
      ) : isShared ? (
        coercedShared === 'deleted' || coercedShared === null ? (
          <p className="text-[13px] italic text-slate-500 dark:text-slate-400 max-w-[320px]">
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
          <div className="flex flex-col gap-1.5 items-stretch max-w-[320px] w-full">
            <SharedMessageCard
              item={coercedShared}
              onOpenCase={onOpenSharedCase}
              onOpenTask={onOpenSharedTask}
              onOpenAppointment={onOpenSharedAppointment}
            />
            {body?.trim() ? (
              <p className="text-[13px] text-slate-800 dark:text-slate-200 break-words px-0.5">{body.trim()}</p>
            ) : null}
          </div>
        )
      ) : (
        <>
          {nonFileAttachments.length > 1 ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {nonFileAttachments
                  .filter((i) =>
                    [MessageAttachmentKind.IMAGE, MessageAttachmentKind.VIDEO].includes(i.kind)
                  )
                  .slice(0, 4)
                  .map((attachment, index) => {
                    const src = attachmentHref(attachment.file, BACKEND_BASE_URL);
                    return (
                      <div
                        key={attachment.id}
                        className="aspect-square relative cursor-pointer rounded-[4px] overflow-hidden"
                        onClick={() => handleGalleryOpen(index)}
                      >
                        {attachment.kind === MessageAttachmentKind.IMAGE && (
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        )}
                        {attachment.kind === MessageAttachmentKind.VIDEO && (
                          <video src={src} controls className="w-full h-full object-cover" />
                        )}
                        {index === 3 && nonFileAttachments.length > 4 && (
                          <div
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-lg font-medium cursor-pointer hover:bg-black/60"
                            onClick={() => handleGalleryOpen(3)}
                          >
                            +{nonFileAttachments.length - 4}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              {nonFileAttachments
                .filter((i) => i.kind === MessageAttachmentKind.AUDIO)
                .map((attachment) => (
                  <AudioControl
                    key={attachment.id}
                    audioSrc={attachmentHref(attachment.file, BACKEND_BASE_URL)}
                    isOwn={isOwn}
                    durationMs={attachment.duration_ms}
                  />
                ))}
            </>
          ) : (
            nonFileAttachments.map((attachment, index) => (
              <React.Fragment key={attachment.id}>
                {attachment.kind === MessageAttachmentKind.IMAGE && (
                  <img
                    src={attachmentHref(attachment.file, BACKEND_BASE_URL)}
                    alt=""
                    className="cursor-pointer hover:opacity-90 rounded-[4px] max-w-full"
                    onClick={() => handleGalleryOpen(index)}
                  />
                )}
                {attachment.kind === MessageAttachmentKind.VIDEO && (
                  <video
                    controls
                    src={attachmentHref(attachment.file, BACKEND_BASE_URL)}
                    className="cursor-pointer hover:opacity-90 rounded-[4px] max-w-full"
                    onClick={() => handleGalleryOpen(index)}
                  />
                )}
                {attachment.kind === MessageAttachmentKind.AUDIO && (
                  <AudioControl
                    audioSrc={attachmentHref(attachment.file, BACKEND_BASE_URL)}
                    isOwn={isOwn}
                    durationMs={attachment.duration_ms}
                  />
                )}
              </React.Fragment>
            ))
          )}
          {body ? <p className="break-words">{body}</p> : null}
        </>
      )}
    </div>
  ) : null;

  const fileCards =
    !showPlaceholder && fileAttachments.length > 0 ? (
      <div className={cn('flex w-full flex-col gap-1.5', showTextBubble && 'mt-1.5')}>
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
                  {bubbleContent}
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
