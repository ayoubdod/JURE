import React, { useEffect, useRef } from 'react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useCallSessionStore } from '@/stores/callSessionStore';
import type { ConferencePeerSnapshot } from '@/utils/conferenceMesh';

const VoicePeerCard: React.FC<{
  peer: ConferencePeerSnapshot;
  large?: boolean;
}> = ({ peer, large }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.srcObject = peer.stream ?? null;
    if (peer.stream) void el.play().catch(() => {});
  }, [peer.stream, peer.id]);

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl px-3 py-3 transition-all',
        peer.isSpeaking
          ? 'bg-emerald-500/10 ring-2 ring-emerald-400/80 scale-[1.02]'
          : 'bg-transparent'
      )}
    >
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <div className="relative">
        <UserAvatar
          image={peer.avatar ?? undefined}
          firstName={peer.firstName}
          lastName={peer.lastName}
          size={large ? 'lg' : 'md'}
          className={cn(
            large ? 'h-20 w-20 text-lg' : 'h-14 w-14 text-sm',
            'ring-2',
            peer.isSpeaking ? 'ring-emerald-400' : 'ring-slate-200 dark:ring-slate-700'
          )}
        />
        {peer.isSpeaking ? (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow">
            Speaking
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'max-w-[7rem] truncate text-center font-medium',
          large ? 'text-sm' : 'text-xs',
          peer.isSpeaking ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'
        )}
      >
        {peer.name}
      </p>
    </div>
  );
};

/** Group voice: show all participants; highlight whoever is speaking. */
const VoiceStage: React.FC<{ className?: string }> = ({ className }) => {
  const peers = useCallSessionStore((s) => s.ui.peers);
  const status = useCallSessionStore((s) => s.ui.status);
  const mode = useCallSessionStore((s) => s.ui.mode);
  const remoteUser = useCallSessionStore((s) => s.ui.remoteUser);

  if (mode !== 'conference') return null;

  const live = status === 'active' || status === 'reconnecting' || status === 'connecting';
  const list: ConferencePeerSnapshot[] =
    peers.length > 0
      ? peers
      : remoteUser
        ? [
            {
              id: remoteUser.id,
              name: remoteUser.name,
              avatar: remoteUser.avatar,
              firstName: remoteUser.firstName,
              lastName: remoteUser.lastName,
              hasVideo: false,
              cameraOff: true,
              isSpeaking: false,
              stream: null,
            },
          ]
        : [];

  if (!live && list.length === 0) return null;

  const speaker = list.find((p) => p.isSpeaking) ?? null;

  return (
    <div className={cn('w-full', className)}>
      {speaker ? (
        <p className="mb-3 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400" aria-live="polite">
          {speaker.name} is speaking
        </p>
      ) : (
        <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">
          {list.length > 0 ? `${list.length} in call` : 'Waiting for others…'}
        </p>
      )}
      <div
        className={cn(
          'flex flex-wrap items-start justify-center gap-2',
          list.length === 1 && 'justify-center'
        )}
      >
        {list.map((p) => (
          <VoicePeerCard key={p.id} peer={p} large={list.length <= 2} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(VoiceStage);
