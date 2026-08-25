import React from 'react';
import { ArrowLeft, ImageIcon, Link2, MoreHorizontal, PanelRight, Phone, Trash2, Video } from 'lucide-react';
import UserAvatar, { getPersonImage, PresenceDot } from '@/components/common/UserAvatar';
import GroupChatIcon from './GroupChatIcon';
import LinkedMatterChip from './LinkedMatterChip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import useUserStore from '@/stores/userStore';
import {
  formatCaseRef,
  getDirectPeer,
  getDirectPeerInfo,
  getLinkedCase,
  humanizeToken,
} from './conversationUtils';

const ConversationHeader: React.FC<{
  conversation: API.Conversation;
  isTyping?: boolean;
  isOnline?: boolean;
  callInProgress?: boolean;
  onBack?: () => void;
  onCallVoice?: () => void;
  onCallVideo?: () => void;
  onOpenContext?: () => void;
  onDeleteConversation?: (conversation: API.Conversation) => void;
  onChangeIcon?: (conversation: API.Conversation) => void;
  onOpenLinkCaseModal?: () => void;
  onUnlinkConversationCase?: () => void | Promise<void>;
  onOpenLinkedCase?: (caseId: number) => void;
}> = ({
  conversation,
  isTyping,
  isOnline,
  callInProgress,
  onBack,
  onCallVoice,
  onCallVideo,
  onOpenContext,
  onDeleteConversation,
  onChangeIcon,
  onOpenLinkCaseModal,
  onUnlinkConversationCase,
  onOpenLinkedCase,
}) => {
  const { t, tf } = useAppTranslation();
  const currentEmail = useUserStore((s) => s.user?.email);
  const isDirect = conversation.type === 'direct';
  const linkedCase = getLinkedCase(conversation);
  const peer = getDirectPeer(conversation, currentEmail);
  const peerInfo = isDirect
    ? getDirectPeerInfo(conversation, peer, t.conversations.unknownContact)
    : null;
  const peerPerson = peerInfo?.person ?? conversation.other_participant;
  const displayName =
    conversation.display_name ||
    (isDirect ? peerInfo?.fullName : conversation.title) ||
    'Chat';
  const memberCount = (conversation.memberships ?? []).filter((m) => !m.archived).length;
  const typeLabel = isDirect
    ? t.conversations.typeDirect
    : linkedCase
      ? tf(t.conversations.typeMatter, {
          type: humanizeToken(linkedCase.caseType ?? linkedCase.case_type) || t.conversations.typeGroup,
        })
      : t.conversations.typeGroup;
  const statusLabel = isTyping
    ? t.conversations.typing
    : isDirect
      ? isOnline
        ? t.conversations.presenceOnline
        : t.conversations.presenceOffline
      : tf(t.conversations.membersCount, { count: memberCount });

  const iconBtn =
    'inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-slate-800 dark:hover:text-slate-100';

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-2 dark:border-slate-800 dark:bg-slate-900/70 sm:px-3">
      <div className="flex min-w-0 items-center gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={cn(iconBtn, 'md:hidden')}
            aria-label={t.conversations.backAria}
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}

        {isDirect ? (
          <div className="relative shrink-0">
            <UserAvatar
              image={getPersonImage(peerPerson as Record<string, unknown>)}
              firstName={peerPerson?.first_name}
              lastName={peerPerson?.last_name}
              size="sm"
              className="h-9 w-9"
            />
            <PresenceDot online={isOnline} />
          </div>
        ) : (
          <GroupChatIcon
            iconUrl={conversation.icon_url}
            iconPresetEmoji={conversation.icon_preset_emoji}
            size="sm"
            className="h-9 w-9"
          />
        )}

        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {displayName}
            {conversation.is_temporary ? (
              <span className="ms-2 align-middle rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800">
                {t.calendar.appointmentModal.meetingChatBadge}
              </span>
            ) : null}
          </p>
          <p
            className={cn(
              'truncate text-[11px] text-slate-500 dark:text-slate-400',
              isTyping && 'animate-pulse text-[#64499D]'
            )}
          >
            {statusLabel}
            <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
            {typeLabel}
          </p>
          {linkedCase ? (
            <div className="mt-1 hidden min-[480px]:block">
              <LinkedMatterChip
                linkedCase={linkedCase}
                onClick={
                  onOpenLinkedCase
                    ? () => {
                        const id =
                          typeof linkedCase.id === 'number'
                            ? linkedCase.id
                            : parseInt(String(linkedCase.id), 10);
                        if (Number.isFinite(id)) onOpenLinkedCase(id);
                      }
                    : undefined
                }
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <button
                  type="button"
                  onClick={callInProgress ? undefined : onCallVoice}
                  disabled={callInProgress}
                  aria-disabled={callInProgress}
                  aria-label={t.conversations.call.call}
                  className={iconBtn}
                >
                  <Phone className="h-4 w-4" />
                </button>
              </span>
            </TooltipTrigger>
            {callInProgress ? (
              <TooltipContent side="bottom">{t.conversations.callInProgress}</TooltipContent>
            ) : null}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <button
                  type="button"
                  onClick={callInProgress ? undefined : onCallVideo}
                  disabled={callInProgress}
                  aria-disabled={callInProgress}
                  aria-label={t.conversations.call.cameraOn}
                  className={iconBtn}
                >
                  <Video className="h-4 w-4" />
                </button>
              </span>
            </TooltipTrigger>
            {callInProgress ? (
              <TooltipContent side="bottom">{t.conversations.callInProgress}</TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>

        {onOpenContext ? (
          <button
            type="button"
            onClick={onOpenContext}
            className={cn(iconBtn, 'min-[1200px]:hidden')}
            aria-label={t.conversations.openContextAria}
          >
            <PanelRight className="h-4 w-4" />
          </button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={iconBtn} aria-label={t.conversations.optionsAria}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isDirect && onChangeIcon ? (
              <DropdownMenuItem onClick={() => onChangeIcon(conversation)}>
                <ImageIcon className="mr-2 h-4 w-4" /> {t.conversations.changeIconMenu}
              </DropdownMenuItem>
            ) : null}
            {!isDirect && onOpenLinkCaseModal && onUnlinkConversationCase ? (
              linkedCase ? (
                <>
                  <div className="cursor-default px-2 py-1.5 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                      <Link2 className="h-3 w-3" />
                      {tf(t.conversations.linkedLabel, { ref: formatCaseRef(linkedCase) })}
                    </span>
                  </div>
                  <DropdownMenuItem onClick={() => onOpenLinkCaseModal()}>
                    <Link2 className="mr-2 h-4 w-4" /> {t.conversations.changeCase}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (window.confirm(t.conversations.removeLinkConfirm)) void onUnlinkConversationCase();
                    }}
                  >
                    {t.conversations.removeLink}
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => onOpenLinkCaseModal()}>
                  <Link2 className="mr-2 h-4 w-4" /> {t.conversations.linkCaseAction}
                </DropdownMenuItem>
              )
            ) : null}
            <DropdownMenuItem
              onClick={() => onDeleteConversation?.(conversation)}
              className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/30"
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t.conversations.deleteConversation}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ConversationHeader;
