import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Video,
  VideoOff,
  MoreHorizontal,
  Minimize2,
  Maximize2,
  Settings2,
  ScreenShare,
  ScreenShareOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import CallDeviceSettings from './CallDeviceSettings';
import { useAppTranslation } from '@/i18n';

const btn =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45';

const CallControls: React.FC<{
  variant?: 'full' | 'compact' | 'floating' | 'sheet';
  kind?: 'voice' | 'video';
  isMuted: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  canMinimize?: boolean;
  canExpand?: boolean;
  isFullscreen?: boolean;
  selectedAudioInputId?: string | null;
  selectedVideoInputId?: string | null;
  selectedAudioOutputId?: string | null;
  onToggleMute?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onEndCall?: () => void;
  onMinimize?: () => void;
  onExpand?: () => void;
  onSelectAudioInput?: (id: string) => void;
  onSelectVideoInput?: (id: string) => void;
  onSelectAudioOutput?: (id: string) => void;
  className?: string;
}> = ({
  variant = 'full',
  kind = 'voice',
  isMuted,
  isCameraOff = false,
  isScreenSharing = false,
  canMinimize,
  canExpand,
  isFullscreen,
  selectedAudioInputId = null,
  selectedVideoInputId = null,
  selectedAudioOutputId = null,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  onMinimize,
  onExpand,
  onSelectAudioInput,
  onSelectVideoInput,
  onSelectAudioOutput,
  className,
}) => {
  const { t } = useAppTranslation();
  const call = t.conversations.call;
  const [moreOpen, setMoreOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const showCamera = kind === 'video' && Boolean(onToggleCamera) && !isScreenSharing;
  const showScreenShare = Boolean(onToggleScreenShare);

  const glassBtn =
    'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/20 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50';

  const sheetBtn =
    'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  if (variant === 'sheet') {
    return (
      <div className={cn('relative flex w-full flex-col items-center', className)}>
        <div className="flex items-center justify-center gap-4 sm:gap-5">
          {onToggleMute ? (
            <button
              type="button"
              onClick={onToggleMute}
              aria-pressed={isMuted}
              aria-label={isMuted ? call.unmuteAria : call.muteAria}
              className={cn(
                sheetBtn,
                isMuted
                  ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100'
              )}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          ) : null}
          {showCamera ? (
            <button
              type="button"
              onClick={onToggleCamera}
              aria-pressed={isCameraOff}
              aria-label={isCameraOff ? call.cameraOnAria : call.cameraOffAria}
              className={cn(
                sheetBtn,
                isCameraOff
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100'
              )}
            >
              {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
          ) : null}
          {showScreenShare ? (
            <button
              type="button"
              onClick={onToggleScreenShare}
              aria-pressed={isScreenSharing}
              aria-label={isScreenSharing ? call.stopShareScreenAria : call.shareScreenAria}
              className={cn(
                sheetBtn,
                isScreenSharing
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
              )}
            >
              {isScreenSharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
            </button>
          ) : null}
          <div className="relative">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-label={call.moreOptionsAria}
              onClick={() => {
                setMoreOpen((v) => !v);
                setDevicesOpen(false);
              }}
              className={cn(
                sheetBtn,
                'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="absolute bottom-full left-1/2 z-20 mb-2 w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
              >
                {canMinimize && onMinimize ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => {
                      setMoreOpen(false);
                      onMinimize();
                    }}
                  >
                    <Minimize2 className="h-3.5 w-3.5" /> {call.minimize}
                  </button>
                ) : null}
                {canExpand && onExpand ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => {
                      setMoreOpen(false);
                      onExpand();
                    }}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />{' '}
                    {isFullscreen ? call.exitFullScreen : call.fullScreen}
                  </button>
                ) : null}
                {onSelectAudioInput ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => {
                      setMoreOpen(false);
                      setDevicesOpen(true);
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" /> {call.deviceSettings}
                  </button>
                ) : null}
              </div>
            ) : null}
            {devicesOpen && onSelectAudioInput && onSelectVideoInput && onSelectAudioOutput ? (
              <CallDeviceSettings
                open={devicesOpen}
                onClose={() => setDevicesOpen(false)}
                kind={kind}
                selectedAudioInputId={selectedAudioInputId}
                selectedVideoInputId={selectedVideoInputId}
                selectedAudioOutputId={selectedAudioOutputId}
                onSelectAudioInput={onSelectAudioInput}
                onSelectVideoInput={onSelectVideoInput}
                onSelectAudioOutput={onSelectAudioOutput}
              />
            ) : null}
          </div>
          {onEndCall ? (
            <button
              type="button"
              onClick={onEndCall}
              aria-label={call.endCallAria}
              className={cn(sheetBtn, 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400')}
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <div className={cn('mx-auto flex w-full max-w-md flex-col items-center gap-2', className)}>
        <div className="flex items-center justify-center gap-2.5 rounded-full bg-black/45 px-3 py-2.5 shadow-lg backdrop-blur-xl ring-1 ring-white/10 sm:gap-3 sm:px-4">
          {onToggleMute ? (
            <button
              type="button"
              onClick={onToggleMute}
              aria-pressed={isMuted}
              aria-label={isMuted ? call.unmuteAria : call.muteAria}
              className={cn(glassBtn, isMuted && 'bg-rose-600/90 ring-rose-400/40 hover:bg-rose-500')}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          ) : null}
          {showCamera ? (
            <button
              type="button"
              onClick={onToggleCamera}
              aria-pressed={isCameraOff}
              aria-label={isCameraOff ? call.cameraOnAria : call.cameraOffAria}
              className={cn(glassBtn, isCameraOff && 'bg-rose-600/90 ring-rose-400/40 hover:bg-rose-500')}
            >
              {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
          ) : null}
          {showScreenShare ? (
            <button
              type="button"
              onClick={onToggleScreenShare}
              aria-pressed={isScreenSharing}
              aria-label={isScreenSharing ? call.stopShareScreenAria : call.shareScreenAria}
              className={cn(
                glassBtn,
                isScreenSharing && 'bg-indigo-600/90 ring-indigo-300/40 hover:bg-indigo-500'
              )}
            >
              {isScreenSharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
            </button>
          ) : null}
          <div className="relative">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-label={call.moreOptionsAria}
              onClick={() => {
                setMoreOpen((v) => !v);
                setDevicesOpen(false);
              }}
              className={glassBtn}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="absolute bottom-full left-1/2 z-30 mb-2 w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 py-1 text-white shadow-xl backdrop-blur-xl"
              >
                {canMinimize && onMinimize ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/10"
                    onClick={() => {
                      setMoreOpen(false);
                      onMinimize();
                    }}
                  >
                    <Minimize2 className="h-3.5 w-3.5" /> {call.minimize}
                  </button>
                ) : null}
                {onSelectAudioInput ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/10"
                    onClick={() => {
                      setMoreOpen(false);
                      setDevicesOpen(true);
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" /> {call.deviceSettings}
                  </button>
                ) : null}
              </div>
            ) : null}
            {devicesOpen && onSelectAudioInput && onSelectVideoInput && onSelectAudioOutput ? (
              <CallDeviceSettings
                open={devicesOpen}
                onClose={() => setDevicesOpen(false)}
                kind={kind}
                selectedAudioInputId={selectedAudioInputId}
                selectedVideoInputId={selectedVideoInputId}
                selectedAudioOutputId={selectedAudioOutputId}
                onSelectAudioInput={onSelectAudioInput}
                onSelectVideoInput={onSelectVideoInput}
                onSelectAudioOutput={onSelectAudioOutput}
              />
            ) : null}
          </div>
          {onEndCall ? (
            <button
              type="button"
              onClick={onEndCall}
              aria-label={call.endCallAria}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {onToggleMute ? (
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={isMuted}
            aria-label={isMuted ? call.unmuteAria : call.muteAria}
            className={cn(
              btn,
              'h-10 w-10',
              isMuted
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'
            )}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        ) : null}
        {showCamera ? (
          <button
            type="button"
            onClick={onToggleCamera}
            aria-pressed={isCameraOff}
            aria-label={isCameraOff ? call.cameraOnAria : call.cameraOffAria}
            className={cn(
              btn,
              'h-10 w-10',
              isCameraOff
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'
            )}
          >
            {isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </button>
        ) : null}
        {showScreenShare ? (
          <button
            type="button"
            onClick={onToggleScreenShare}
            aria-pressed={isScreenSharing}
            aria-label={isScreenSharing ? call.stopShareScreenAria : call.shareScreenAria}
            className={cn(
              btn,
              'h-10 w-10',
              isScreenSharing
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'
            )}
          >
            {isScreenSharing ? <ScreenShareOff className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />}
          </button>
        ) : null}
        {canExpand && onExpand ? (
          <button
            type="button"
            onClick={onExpand}
            aria-label={call.expandAria}
            className={cn(btn, 'h-10 w-10 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100')}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        ) : null}
        {onEndCall ? (
          <button
            type="button"
            onClick={onEndCall}
            aria-label={call.endCallAria}
            className={cn(btn, 'h-10 w-10 bg-rose-600 text-white hover:bg-rose-700')}
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('relative flex w-full flex-col items-center gap-3', className)}>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-3">
          {onToggleMute ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-pressed={isMuted}
                  aria-label={isMuted ? call.unmuteAria : call.muteAria}
                  className={cn(
                    btn,
                    'h-12 w-12 sm:h-11 sm:w-11',
                    isMuted
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100'
                  )}
                >
                  {isMuted ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? call.unmute : call.mute}</TooltipContent>
            </Tooltip>
          ) : null}

          {showCamera ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCamera}
                  aria-pressed={isCameraOff}
                  aria-label={isCameraOff ? call.cameraOnAria : call.cameraOffAria}
                  className={cn(
                    btn,
                    'h-12 w-12 sm:h-11 sm:w-11',
                    isCameraOff
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100'
                  )}
                >
                  {isCameraOff ? (
                    <VideoOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Video className="h-[18px] w-[18px]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{isCameraOff ? call.cameraOn : call.cameraOff}</TooltipContent>
            </Tooltip>
          ) : null}

          {showScreenShare ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleScreenShare}
                  aria-pressed={isScreenSharing}
                  aria-label={isScreenSharing ? call.stopShareScreenAria : call.shareScreenAria}
                  className={cn(
                    btn,
                    'h-12 w-12 sm:h-11 sm:w-11',
                    isScreenSharing
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100'
                  )}
                >
                  {isScreenSharing ? (
                    <ScreenShareOff className="h-[18px] w-[18px]" />
                  ) : (
                    <ScreenShare className="h-[18px] w-[18px]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isScreenSharing ? call.stopShareScreen : call.shareScreen}
              </TooltipContent>
            </Tooltip>
          ) : kind !== 'video' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled
                  aria-label={call.speaker}
                  className={cn(btn, 'h-12 w-12 bg-slate-100 text-slate-500 dark:bg-slate-800 sm:h-11 sm:w-11')}
                >
                  <Volume2 className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{call.speakerHint}</TooltipContent>
            </Tooltip>
          ) : null}

          <div className="relative">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-label={call.moreOptionsAria}
              onClick={() => {
                setMoreOpen((v) => !v);
                setDevicesOpen(false);
              }}
              className={cn(
                btn,
                'h-12 w-12 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 sm:h-11 sm:w-11'
              )}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="absolute bottom-full left-1/2 z-20 mb-2 w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
              >
                {canMinimize && onMinimize ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => {
                      setMoreOpen(false);
                      onMinimize();
                    }}
                  >
                    <Minimize2 className="h-3.5 w-3.5" /> {call.minimize}
                  </button>
                ) : null}
                {canExpand && onExpand ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => {
                      setMoreOpen(false);
                      onExpand();
                    }}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />{' '}
                    {isFullscreen ? call.exitFullScreen : call.fullScreen}
                  </button>
                ) : null}
                {onSelectAudioInput ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => {
                      setMoreOpen(false);
                      setDevicesOpen(true);
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" /> {call.deviceSettings}
                  </button>
                ) : null}
              </div>
            ) : null}
            {devicesOpen && onSelectAudioInput && onSelectVideoInput && onSelectAudioOutput ? (
              <CallDeviceSettings
                open={devicesOpen}
                onClose={() => setDevicesOpen(false)}
                kind={kind}
                selectedAudioInputId={selectedAudioInputId}
                selectedVideoInputId={selectedVideoInputId}
                selectedAudioOutputId={selectedAudioOutputId}
                onSelectAudioInput={(id) => {
                  onSelectAudioInput(id);
                }}
                onSelectVideoInput={(id) => {
                  onSelectVideoInput(id);
                }}
                onSelectAudioOutput={(id) => {
                  onSelectAudioOutput(id);
                }}
              />
            ) : null}
          </div>

          {onEndCall ? (
            <button
              type="button"
              onClick={onEndCall}
              aria-label={call.endCallAria}
              className={cn(
                btn,
                'h-12 w-12 bg-rose-600 text-white hover:bg-rose-700 sm:hidden'
              )}
            >
              <PhoneOff className="h-[18px] w-[18px]" />
            </button>
          ) : null}
        </div>
        {onEndCall ? (
          <button
            type="button"
            onClick={onEndCall}
            aria-label={call.endCallAria}
            className="hidden h-11 min-w-[148px] items-center justify-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 sm:inline-flex"
          >
            <PhoneOff className="h-4 w-4" /> {call.endCall}
          </button>
        ) : null}
      </div>
    </TooltipProvider>
  );
};

export default React.memo(CallControls);
