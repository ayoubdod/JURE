import React, { useEffect, useRef } from 'react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useCallSessionStore } from '@/stores/callSessionStore';
import type { ConferencePeerSnapshot } from '@/utils/conferenceMesh';
import { useAppTranslation } from '@/i18n';

const PeerTile: React.FC<{
  peer: ConferencePeerSnapshot;
  className?: string;
  /** Prefer letterboxing (screen share) over cropping faces. */
  contain?: boolean;
}> = ({ peer, className, contain = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stream = peer.stream ?? null;
  const showFallback = !peer.hasVideo || peer.cameraOff || !stream;

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video) {
      video.srcObject = stream;
      if (stream) void video.play().catch(() => {});
    }
    if (audio) {
      audio.srcObject = stream;
      if (stream) void audio.play().catch(() => {});
    }
  }, [stream, peer.hasVideo, peer.cameraOff, peer.id]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-slate-950',
        peer.isSpeaking && 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950',
        className
      )}
    >
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={cn(
          'h-full w-full',
          contain ? 'object-contain bg-black' : 'object-cover',
          showFallback && 'absolute inset-0 opacity-0'
        )}
      />
      {showFallback ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-900 to-slate-950">
          <UserAvatar
            image={peer.avatar ?? undefined}
            firstName={peer.firstName}
            lastName={peer.lastName}
            size="lg"
            className="h-14 w-14 text-sm ring-2 ring-white/10 sm:h-20 sm:w-20 sm:text-base"
          />
          <p className="max-w-full truncate px-2 text-center text-xs font-medium text-slate-200 sm:text-sm">
            {peer.name}
          </p>
        </div>
      ) : (
        <div className="absolute bottom-2 left-2 max-w-[70%] truncate rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          {peer.name}
        </div>
      )}
    </div>
  );
};

const VideoStage: React.FC<{
  remoteName: string;
  remoteAvatar?: string | null;
  remoteFirstName?: string;
  remoteLastName?: string;
  className?: string;
  localPipClassName?: string;
}> = ({
  remoteName,
  remoteAvatar,
  remoteFirstName,
  remoteLastName,
  className,
  localPipClassName,
}) => {
  const kind = useCallSessionStore((s) => s.ui.kind);
  const mode = useCallSessionStore((s) => s.ui.mode);
  const peers = useCallSessionStore((s) => s.ui.peers);
  const isCameraOff = useCallSessionStore((s) => s.ui.isCameraOff);
  const isScreenSharing = useCallSessionStore((s) => s.ui.isScreenSharing);
  const remoteCameraOff = useCallSessionStore((s) => s.ui.remoteCameraOff);
  const hasRemoteVideo = useCallSessionStore((s) => s.ui.hasRemoteVideo);
  const status = useCallSessionStore((s) => s.ui.status);
  const getLocalStream = useCallSessionStore((s) => s.getLocalStream);
  const getRemoteStream = useCallSessionStore((s) => s.getRemoteStream);
  const { t } = useAppTranslation();
  const call = t.conversations.call;
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  const live = status === 'active' || status === 'reconnecting' || status === 'connecting';
  const isConference = mode === 'conference';
  const showStage =
    kind === 'video' || isScreenSharing || hasRemoteVideo || peers.some((p) => p.hasVideo);

  // Voice + remote video ≈ screen share; prefer contain so content isn't cropped on phones.
  const remoteIsScreenLike = kind === 'voice' || peers.some((p) => p.hasVideo && kind === 'voice');
  const useContainRemote = isScreenSharing || remoteIsScreenLike || (kind === 'voice' && hasRemoteVideo);

  useEffect(() => {
    const local = localRef.current;
    const localStream = getLocalStream();
    if (local) {
      local.srcObject = localStream;
      if (localStream) void local.play().catch(() => {});
    }
  }, [getLocalStream, live, kind, isCameraOff, isScreenSharing]);

  useEffect(() => {
    if (isConference) return;
    const remote = remoteRef.current;
    const remoteStream = getRemoteStream();
    if (remote) {
      remote.srcObject = remoteStream;
      if (remoteStream) void remote.play().catch(() => {});
    }
  }, [getRemoteStream, live, kind, hasRemoteVideo, isConference, isScreenSharing]);

  if (!showStage) return null;

  const gridPeers: ConferencePeerSnapshot[] =
    peers.length > 0
      ? peers
      : [
          {
            id: -1,
            name: remoteName,
            avatar: remoteAvatar,
            firstName: remoteFirstName,
            lastName: remoteLastName,
            hasVideo: hasRemoteVideo,
            cameraOff: remoteCameraOff,
            isSpeaking: false,
            stream: null,
          },
        ];

  const n = gridPeers.length;
  const cols =
    n <= 1
      ? 'grid-cols-1'
      : n === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : n === 3
          ? 'grid-cols-2'
          : 'grid-cols-2';

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-slate-950',
        'rounded-none sm:rounded-2xl',
        className
      )}
    >
      {isConference || gridPeers.length > 1 ? (
        <div
          className={cn(
            'grid h-full min-h-0 gap-1 p-1 sm:gap-1.5 sm:p-1.5',
            cols,
            n === 1 && 'min-h-[40dvh]',
            n >= 2 && 'auto-rows-fr'
          )}
        >
          {gridPeers.map((p, idx) => (
            <PeerTile
              key={p.id}
              peer={p}
              contain={useContainRemote || (kind === 'voice' && p.hasVideo)}
              className={cn(
                'min-h-[120px]',
                n === 1 && 'min-h-[40dvh] sm:min-h-[220px]',
                n === 3 && idx === 0 && 'col-span-2 sm:col-span-1'
              )}
            />
          ))}
        </div>
      ) : (
        <>
          <video
            id="remote-video"
            ref={remoteRef}
            autoPlay
            playsInline
            className={cn(
              'h-full w-full',
              useContainRemote ? 'object-contain bg-black' : 'object-cover',
              !hasRemoteVideo || remoteCameraOff ? 'absolute inset-0 opacity-0' : 'opacity-100'
            )}
          />
          {!hasRemoteVideo || remoteCameraOff ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-900 to-slate-950">
              <UserAvatar
                image={remoteAvatar ?? undefined}
                firstName={remoteFirstName}
                lastName={remoteLastName}
                size="lg"
                className="h-20 w-20 text-lg ring-2 ring-white/10 sm:h-24 sm:w-24 sm:text-xl"
              />
              <p className="px-4 text-center text-sm font-medium text-slate-200">{remoteName}</p>
              <p className="text-xs text-slate-400">{call.cameraOff}</p>
            </div>
          ) : null}
        </>
      )}

      <div
        className={cn(
          'absolute overflow-hidden rounded-xl border border-white/20 bg-slate-900 shadow-lg',
          // Keep PIP clear of home indicator + controls on phones
          'bottom-[max(0.75rem,env(safe-area-inset-bottom))] end-[max(0.75rem,env(safe-area-inset-right))]',
          'sm:bottom-3 sm:end-3',
          isScreenSharing
            ? 'h-20 w-28 sm:h-28 sm:w-40'
            : 'h-24 w-[4.5rem] sm:h-36 sm:w-28',
          localPipClassName
        )}
      >
        <video
          id="local-video"
          ref={localRef}
          autoPlay
          muted
          playsInline
          className={cn(
            'h-full w-full',
            isScreenSharing ? 'object-contain bg-black' : 'object-cover',
            isCameraOff && !isScreenSharing && 'opacity-0'
          )}
        />
        {isScreenSharing ? (
          <div className="absolute inset-x-0 bottom-0 bg-indigo-600/90 px-1 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
            {call.sharingScreen}
          </div>
        ) : isCameraOff ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-[10px] font-medium uppercase tracking-wide text-slate-300">
            You
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(VideoStage);
