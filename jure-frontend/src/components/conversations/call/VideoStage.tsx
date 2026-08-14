import React, { useEffect, useRef } from 'react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useCallSessionStore } from '@/stores/callSessionStore';
import type { ConferencePeerSnapshot } from '@/utils/conferenceMesh';
import { useAppTranslation } from '@/i18n';

const PeerTile: React.FC<{
  peer: ConferencePeerSnapshot;
  className?: string;
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
      video.muted = true; // audio element owns playback
      video.srcObject = stream;
      if (stream) void video.play().catch(() => {});
    }
    if (audio) {
      audio.muted = false;
      audio.volume = 1;
      audio.srcObject = stream;
      if (stream) void audio.play().catch(() => {});
    }
  }, [stream, peer.hasVideo, peer.cameraOff, peer.id]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-slate-950',
        peer.isSpeaking && 'ring-2 ring-emerald-400/90 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]',
        className
      )}
    >
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <video
        ref={videoRef}
        autoPlay
        muted
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
  /** Edge-to-edge immersive stage (fullscreen call). */
  immersive?: boolean;
  /** Shared screen takes over; hide peer grid. */
  screenShareMode?: boolean;
}> = ({
  remoteName,
  remoteAvatar,
  remoteFirstName,
  remoteLastName,
  className,
  localPipClassName,
  immersive = false,
  screenShareMode = false,
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
  const sharePeerRef = useRef<HTMLVideoElement>(null);

  const live = status === 'active' || status === 'reconnecting' || status === 'connecting';
  const isConference = mode === 'conference';
  const showStage =
    kind === 'video' || isScreenSharing || hasRemoteVideo || peers.some((p) => p.hasVideo);

  const useContainRemote = screenShareMode || isScreenSharing || (kind === 'voice' && hasRemoteVideo);

  useEffect(() => {
    const local = localRef.current;
    const localStream = getLocalStream();
    if (local) {
      local.srcObject = localStream;
      if (localStream) void local.play().catch(() => {});
    }
  }, [getLocalStream, live, kind, isCameraOff, isScreenSharing]);

  useEffect(() => {
    if (isConference && !screenShareMode) return;
    const remote = remoteRef.current;
    const remoteStream = getRemoteStream();
    if (remote) {
      remote.muted = true; // #remote-audio owns playback for 1:1
      remote.srcObject = remoteStream;
      if (remoteStream) void remote.play().catch(() => {});
    }
  }, [getRemoteStream, live, kind, hasRemoteVideo, isConference, isScreenSharing, screenShareMode]);

  // Conference screen share: pin the peer who has video (shared content).
  const sharePeer = screenShareMode
    ? peers.find((p) => p.hasVideo) ?? null
    : null;

  useEffect(() => {
    const el = sharePeerRef.current;
    if (!el || !sharePeer?.stream) return;
    el.srcObject = sharePeer.stream;
    void el.play().catch(() => {});
  }, [sharePeer?.stream, sharePeer?.id, screenShareMode]);

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
  // Spec: 1 full, 2 split, 3 = hero + 2, 4 = 2×2
  const gridClass =
    n <= 1
      ? 'grid-cols-1 grid-rows-1'
      : n === 2
        ? 'grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1'
        : n === 3
          ? 'grid-cols-2 grid-rows-[1.35fr_1fr]'
          : 'grid-cols-2 grid-rows-2';

  const showPeerGrid = (isConference || gridPeers.length > 1) && !screenShareMode;

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-black',
        !immersive && 'rounded-none sm:rounded-2xl bg-slate-950',
        className
      )}
    >
      {screenShareMode ? (
        <div className="absolute inset-0 bg-black">
          {/* Keep peer audio alive while video tiles are hidden */}
          {peers.map((p) => (
            <audio
              key={`a-${p.id}`}
              autoPlay
              playsInline
              className="hidden"
              ref={(el) => {
                if (!el) return;
                el.srcObject = p.stream ?? null;
                if (p.stream) void el.play().catch(() => {});
              }}
            />
          ))}
          {isScreenSharing ? (
            <video
              id="local-video"
              ref={localRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain"
            />
          ) : sharePeer ? (
            <video
              ref={sharePeerRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <video
              id="remote-video"
              ref={remoteRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain"
            />
          )}
        </div>
      ) : showPeerGrid ? (
        <div className={cn('grid h-full min-h-0 gap-1.5 p-1.5', gridClass, immersive && 'gap-1 p-1')}>
          {gridPeers.map((p, idx) => (
            <PeerTile
              key={p.id}
              peer={p}
              contain={kind === 'voice' && p.hasVideo}
              className={cn(
                'min-h-0',
                n === 3 && idx === 0 && 'col-span-2',
                immersive && n === 1 && 'rounded-none'
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
            muted
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

      {!screenShareMode ? (
        <div
          className={cn(
            'absolute z-10 overflow-hidden rounded-xl border border-white/25 bg-slate-900 shadow-lg',
            'bottom-[max(0.75rem,env(safe-area-inset-bottom))] end-[max(0.75rem,env(safe-area-inset-right))]',
            'sm:bottom-3 sm:end-3',
            'h-24 w-[4.5rem] sm:h-36 sm:w-28',
            localPipClassName
          )}
        >
          <video
            id={isScreenSharing ? undefined : 'local-video'}
            ref={isScreenSharing ? undefined : localRef}
            autoPlay
            muted
            playsInline
            className={cn('h-full w-full object-cover', isCameraOff && 'opacity-0')}
          />
          {isCameraOff ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-[10px] font-medium uppercase tracking-wide text-slate-300">
              You
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(VideoStage);
