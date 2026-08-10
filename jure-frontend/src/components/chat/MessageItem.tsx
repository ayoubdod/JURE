import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Download,
  File,
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
}) => {
  const currentUser = useUserStore((s) => s.user);
  const { t } = useAppTranslation();
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
      '?'
    : 'Unknown';

  // Identify "me" by email match in memberships (works across User/CabinetMember id systems)
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
  const hasAttachments = (msg.attachments ?? []).length > 0;
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

  const canEdit = isOwn && !isDeleted && !isShared && !isCallHistory && (body || hasAttachments);
  const canDelete = isOwn && !isCallHistory;
  const canForward = !isDeleted && !isCallHistory;
  const canPin = !isCallHistory;

  if (isCallHistory && !isDeleted) {
    const { kind, outcome } = callMetaFromMessage(msg);
    const missed = outcome === 'missed' || outcome === 'declined';
    return (
      <CallHistoryMessage
        msg={msg}
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

  const bubbleContent = (
    <div
      className={cn(
        'rounded-2xl text-[13px]',
        isShared
          ? 'px-0 py-0 bg-transparent text-slate-900 dark:text-slate-100 rounded-none'
          : 'px-2.5 py-1.5',
        !isShared &&
          (isOwn
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md')
      )}
    >
      {forwardedDetail && (
        <div className="text-[11px] opacity-90 mb-1 flex items-center gap-1">
          <Forward className="h-3 w-3 shrink-0" />
          <span>Forwarded</span>
          {forwardedDetail.body && (
            <span className="truncate opacity-80">
              — {forwardedDetail.body.slice(0, 40)}
              {forwardedDetail.body.length > 40 ? '…' : ''}
            </span>
          )}
        </div>
      )}
      {showPlaceholder ? (
        <p className="italic opacity-75">[Message deleted]</p>
      ) : isShared ? (
        coercedShared === 'deleted' || coercedShared === null ? (
          <p className="text-[13px] italic text-slate-500 dark:text-slate-400 max-w-[320px]">
            This{' '}
            {messageType === 'SHARED_CASE' ? 'case' : messageType === 'SHARED_TASK' ? 'task' : 'appointment'} is no
            longer available
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
          {(msg.attachments ?? []).length > 1 ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(msg.attachments ?? [])
                  .map((i) => ({ ...i, file: BACKEND_BASE_URL + i.file }))
                  .filter((i) =>
                    [MessageAttachmentKind.IMAGE, MessageAttachmentKind.VIDEO].includes(i.kind)
                  )
                  .slice(0, 4)
                  .map((attachment, index) => (
                    <div
                      key={attachment.id}
                      className="aspect-square relative cursor-pointer rounded-[4px] overflow-hidden"
                      onClick={() => handleGalleryOpen(index)}
                    >
                      {attachment.kind === MessageAttachmentKind.IMAGE && (
                        <img
                          src={attachment.file}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      {attachment.kind === MessageAttachmentKind.VIDEO && (
                        <video
                          src={attachment.file}
                          controls
                          className="w-full h-full object-cover"
                        />
                      )}
                      {index === 3 && (msg.attachments ?? []).length > 4 && (
                        <div
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-lg font-medium cursor-pointer hover:bg-black/60"
                          onClick={() => handleGalleryOpen(3)}
                        >
                          +{(msg.attachments ?? []).length - 4}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
              {(msg.attachments ?? [])
                .map((i) => ({ ...i, file: BACKEND_BASE_URL + i.file }))
                .filter((i) =>
                  [MessageAttachmentKind.AUDIO, MessageAttachmentKind.FILE].includes(i.kind)
                )
                .map((attachment) => (
                  <React.Fragment key={attachment.id}>
                    {attachment.kind === MessageAttachmentKind.AUDIO && (
                      <AudioControl audioSrc={attachment.file} isOwn={isOwn} />
                    )}
                    {attachment.kind === MessageAttachmentKind.FILE && (
                      <div className="flex items-center gap-2 p-2 rounded-[4px] bg-black/10 dark:bg-white/10 mt-1">
                        <File className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate text-xs">{attachment.file}</span>
                        <a
                          href={attachment.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-black/10"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </React.Fragment>
                ))}
            </>
          ) : (
            (msg.attachments ?? [])
              .map((i) => ({ ...i, file: BACKEND_BASE_URL + i.file }))
              .map((attachment, index) => (
                <React.Fragment key={attachment.id}>
                  {attachment.kind === MessageAttachmentKind.IMAGE && (
                    <img
                      src={attachment.file}
                      alt=""
                      className="cursor-pointer hover:opacity-90 rounded-[4px] max-w-full"
                      onClick={() => handleGalleryOpen(index)}
                    />
                  )}
                  {attachment.kind === MessageAttachmentKind.VIDEO && (
                    <video
                      controls
                      src={attachment.file}
                      className="cursor-pointer hover:opacity-90 rounded-[4px] max-w-full"
                      onClick={() => handleGalleryOpen(index)}
                    />
                  )}
                  {attachment.kind === MessageAttachmentKind.AUDIO && (
                    <AudioControl audioSrc={attachment.file} isOwn={isOwn} />
                  )}
                  {attachment.kind === MessageAttachmentKind.FILE && (
                    <div className="flex items-center gap-2 p-2 rounded-[4px] bg-black/10 dark:bg-white/10">
                      <File className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate text-xs">{attachment.file}</span>
                      <a
                        href={attachment.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-black/10"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </React.Fragment>
              ))
          )}
          {body && <p className="break-words">{body}</p>}
        </>
      )}
    </div>
  );

  // Read receipt (WhatsApp-style): only on sender's own messages when message.is_own or we detect ownership
  const deliveredCount = msg.delivered_count ?? 0;
  const readCount = msg.read_count ?? 0;
  const readReceipt =
    isOwn && !isDeleted ? (
      readCount > 0 ? (
        <CheckCheck className="h-3 w-3 text-blue-500 shrink-0" aria-label="Read" />
      ) : deliveredCount > 0 ? (
        <CheckCheck className="h-3 w-3 text-gray-400 dark:text-gray-500 shrink-0" aria-label="Delivered" />
      ) : (
        <Check className="h-3 w-3 text-gray-400 dark:text-gray-500 shrink-0" aria-label="Sent" />
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
  const showSenderName = !isOwn && isGroup && senderName;

  // Fixed layout. Received: [Avatar][Content][Spacer]. Sent: [Spacer][Content]. Spacer = flex-1 pushes content to left/right.
  return (
    <>
      {wrapper(
        <div className="w-full flex gap-2 group items-end min-h-[32px]">
          {!isOwn && (
            <UserAvatar
              image={getPersonImage(senderUser as Record<string, unknown>)}
              firstName={senderUser?.first_name}
              lastName={senderUser?.last_name}
              size="xs"
              className="flex-shrink-0"
            />
          )}
          {isOwn && <div className="flex-1 min-w-0" aria-hidden />}
          <div
            className={cn(
              'max-w-[75%] min-w-0 flex flex-col flex-shrink-0',
              isOwn ? 'items-end' : 'items-start'
            )}
          >
            {showSenderName && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 px-0.5">
                {senderName}
              </span>
            )}
            <div className="flex items-start gap-1">
              {hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        'shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 mt-0.5 transition-opacity',
                        isOwn ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                      )}
                      aria-label="Message options"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                    {renderDropdownMenuItems()}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  {isPinned && (
                    <Pin className="h-3 w-3 shrink-0 text-slate-500 dark:text-slate-400" />
                  )}
                  {bubbleContent}
                </div>
                <div className="flex items-center gap-1 mt-0.5 min-h-[14px]">
                  <span className="text-[11px] text-slate-500 dark:text-slate-500">{time}</span>
                  {editedAt && (
                    <span className="text-[11px] italic text-slate-500 dark:text-slate-500">(edited)</span>
                  )}
                  {readReceipt}
                </div>
              </div>
            </div>
          </div>
          {!isOwn && <div className="flex-1 min-w-0" aria-hidden />}
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
