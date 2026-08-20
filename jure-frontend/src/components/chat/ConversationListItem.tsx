import React from 'react';
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ImageIcon,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import UserAvatar, { getPersonImage, PresenceDot } from '@/components/common/UserAvatar';
import GroupChatIcon from './GroupChatIcon';
import LinkedMatterChip from './LinkedMatterChip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppTranslation, intlLocale } from '@/i18n';
import {
  formatListTimestamp,
  getDirectPeer,
  getDirectPeerInfo,
  getLinkedCase,
} from './conversationUtils';
import { getSharedMessagePreviewText } from './SharedMessageCard';
import { isAudioAttachment, isDocumentAttachment, isImageAttachment, isVideoAttachment } from './conversationUtils';

const truncateSnippet = (text: string, maxLen = 52) => {
  if (!text?.trim()) return '—';
  const trimmed = text.trim();
  return trimmed.length <= maxLen ? trimmed : `${trimmed.slice(0, maxLen)}…`;
};

const getPreviewText = (
  latestMessage: API.Message | undefined,
  labels: {
    deleted: string;
    attachment: string;
    voice: string;
    photo: string;
    video: string;
    document: string;
    missedVideo: string;
    missedVoice: string;
    videoCall: string;
    voiceCall: string;
    sharedCase: string;
    sharedTask: string;
    sharedAppointment: string;
  }
) => {
  if (!latestMessage) return '—';
  if (latestMessage.is_deleted === true) return labels.deleted;
  const sharedPreview = getSharedMessagePreviewText(latestMessage, {
    missedVideo: labels.missedVideo,
    missedVoice: labels.missedVoice,
    videoCall: labels.videoCall,
    voiceCall: labels.voiceCall,
    sharedCase: labels.sharedCase,
    sharedTask: labels.sharedTask,
    sharedAppointment: labels.sharedAppointment,
  });
  if (sharedPreview) return sharedPreview;
  const body = latestMessage.body ?? (latestMessage as { content?: string }).content ?? '';
  if (body?.trim()) return body.trim();
  const attachments = latestMessage.attachments ?? [];
  if (attachments.length === 0) return '—';
  if (attachments.some(isAudioAttachment)) return labels.voice;
  if (attachments.some(isImageAttachment)) return labels.photo;
  if (attachments.some(isVideoAttachment)) return labels.video;
  if (attachments.some(isDocumentAttachment)) return labels.document;
  return labels.attachment;
};

export const ConversationListItem: React.FC<{
  conversation: API.Conversation;
  active?: boolean;
  currentEmail?: string;
  isOnline?: boolean;
  unreadCount: number;
  archived?: boolean;
  onSelect: (id: number) => void;
  onArchive?: (c: API.Conversation) => void;
  onUnarchive?: (c: API.Conversation) => void;
  onPin?: (c: API.Conversation) => void;
  onUnpin?: (c: API.Conversation) => void;
  onDelete?: (c: API.Conversation) => void;
  onRename?: (c: API.Conversation) => void;
  onChangeIcon?: (c: API.Conversation) => void;
  onOpenLinkedCase?: (caseId: number) => void;
}> = ({
  conversation,
  active,
  currentEmail,
  isOnline,
  unreadCount,
  archived,
  onSelect,
  onArchive,
  onUnarchive,
  onPin,
  onUnpin,
  onDelete,
  onRename,
  onChangeIcon,
  onOpenLinkedCase,
}) => {
  const { t, lang } = useAppTranslation();
  const peer = getDirectPeer(conversation, currentEmail);
  const peerInfo =
    conversation.type === 'direct'
      ? getDirectPeerInfo(conversation, peer, t.conversations.unknownContact)
      : null;
  const displayName =
    conversation.display_name ||
    (conversation.type === 'direct'
      ? peerInfo?.fullName ?? t.conversations.unknownContact
      : conversation.title);
  const snippet = truncateSnippet(
              getPreviewText(conversation.latest_message, {
                  deleted: t.conversations.messageDeletedPreview,
                  attachment: t.conversations.attachmentPreview,
                  voice: t.conversations.voicePreview,
                  photo: t.conversations.photoPreview,
                  video: t.conversations.videoPreview,
                  document: t.conversations.documentPreview,
                  missedVideo: t.conversations.call.missedVideoCallTitle,
                  missedVoice: t.conversations.call.missedCallTitle,
                  videoCall: t.conversations.call.historyVideoCall,
                  voiceCall: t.conversations.call.historyVoiceCall,
                  sharedCase: t.conversations.sharedCase,
                  sharedTask: t.conversations.sharedTask,
                  sharedAppointment: t.conversations.sharedAppointment,
                })
  );
  const lm = conversation.latest_message;
  const timestamp = formatListTimestamp(lm?.sent_at ?? lm?.created, intlLocale(lang));
  const linkedCase = getLinkedCase(conversation);
  const isPinned = conversation.is_pinned === true;
  const hasMenu =
    onArchive ||
    onUnarchive ||
    onPin ||
    onUnpin ||
    onDelete ||
    (onRename && conversation.type === 'group') ||
    (onChangeIcon && conversation.type === 'group');

  return (
    <div
      role="option"
      aria-selected={active}
      tabIndex={0}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(conversation.id);
        }
      }}
      className={cn(
        'group relative flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#64499D]/35',
        active
          ? 'bg-[#F7F4FF] dark:bg-[#64499D]/15'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
      )}
    >
      {active ? (
        <span
          className="absolute inset-y-2 start-0 w-[3px] rounded-e-full bg-[#64499D]"
          aria-hidden
        />
      ) : null}

      <div className="relative mt-0.5 shrink-0">
        {conversation.type === 'group' ? (
          <GroupChatIcon
            iconUrl={conversation.icon_url}
            iconPresetEmoji={conversation.icon_preset_emoji}
            size="md"
            className="h-10 w-10"
          />
        ) : (
          <UserAvatar
            image={
              getPersonImage(conversation.other_participant as Record<string, unknown> | undefined) ??
              getPersonImage(peerInfo?.person as Record<string, unknown> | undefined)
            }
            firstName={peerInfo?.firstName}
            lastName={peerInfo?.lastName}
            size="md"
            className="h-10 w-10 shrink-0"
          />
        )}
        <PresenceDot online={conversation.type === 'direct' && isOnline} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {isPinned ? (
              <Pin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            ) : null}
            <span
              className={cn(
                'truncate text-[13px] text-slate-800 dark:text-slate-100',
                unreadCount > 0 || active ? 'font-semibold' : 'font-medium'
              )}
            >
              {displayName}
            </span>
          </div>
          <span
            className={cn(
              'shrink-0 text-[11px] tabular-nums',
              unreadCount > 0 ? 'font-medium text-[#64499D]' : 'text-slate-400 dark:text-slate-500'
            )}
          >
            {timestamp}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 truncate text-[12px] leading-snug',
              unreadCount > 0
                ? 'font-medium text-slate-700 dark:text-slate-300'
                : 'text-slate-500 dark:text-slate-500'
            )}
          >
            {snippet}
          </p>
          {unreadCount > 0 ? (
            <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#64499D] px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
          {hasMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-opacity hover:bg-slate-200/80 hover:text-slate-600 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:hover:bg-slate-700"
                  aria-label={t.conversations.optionsAria}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {conversation.type === 'group' && onRename ? (
                  <DropdownMenuItem onClick={() => onRename(conversation)}>
                    <Pencil className="me-2 h-3.5 w-3.5" />
                    {t.conversations.renameGroupMenu}
                  </DropdownMenuItem>
                ) : null}
                {conversation.type === 'group' && onChangeIcon ? (
                  <DropdownMenuItem onClick={() => onChangeIcon(conversation)}>
                                <ImageIcon className="me-2 h-3.5 w-3.5" />
                                {t.conversations.changeIconMenu}
                  </DropdownMenuItem>
                ) : null}
                {archived && onUnarchive ? (
                  <DropdownMenuItem onClick={() => onUnarchive(conversation)}>
                    <ArchiveRestore className="me-2 h-3.5 w-3.5" />
                    {t.conversations.unarchive}
                  </DropdownMenuItem>
                ) : null}
                {!archived && onArchive ? (
                  <DropdownMenuItem onClick={() => onArchive(conversation)}>
                    <Archive className="me-2 h-3.5 w-3.5" />
                    {t.conversations.archive}
                  </DropdownMenuItem>
                ) : null}
                {isPinned && onUnpin ? (
                  <DropdownMenuItem onClick={() => onUnpin(conversation)}>
                    <PinOff className="me-2 h-3.5 w-3.5" />
                    {t.conversations.unpin}
                  </DropdownMenuItem>
                ) : null}
                {!isPinned && onPin ? (
                  <DropdownMenuItem onClick={() => onPin(conversation)}>
                    <Pin className="me-2 h-3.5 w-3.5" />
                    {t.conversations.pin}
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <DropdownMenuItem
                    onClick={() => onDelete(conversation)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="me-2 h-3.5 w-3.5" />
                    {t.common.delete}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {linkedCase ? (
          <div className="mt-1.5">
            <LinkedMatterChip
              linkedCase={linkedCase}
              compact
              onClick={
                onOpenLinkedCase
                  ? (e) => {
                      e.stopPropagation();
                      const id = typeof linkedCase.id === 'number' ? linkedCase.id : parseInt(String(linkedCase.id), 10);
                      if (Number.isFinite(id)) onOpenLinkedCase(id);
                    }
                  : undefined
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ConversationListItem;
