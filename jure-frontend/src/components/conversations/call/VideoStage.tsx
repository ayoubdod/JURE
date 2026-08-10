import React, { useEffect, useRef } from 'react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useCallSessionStore } from '@/stores/callSessionStore';
import type { ConferencePeerSnapshot } from '@/utils/conferenceMesh';
import { useAppTranslation } from '@/i18n';

const PeerTile: React.FC<{
  peer: ConferencePeerSnapshot;
  className?: string;
}> = ({ peer, className }) => {
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
        className={cn('h-full w-full object-cover', showFallback && 'opacity-0 absolute inset-0')}
      />
      {showFallback ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-900 to-slate-950">
          <UserAvatar
            image={peer.avatar ?? undefined}
            firstName={peer.firstName}
            lastName={peer.lastName}
            size="lg"
            className="h-16 w-16 text-base ring-2 ring-white/10 sm:h-20 sm:w-20"
          />
          <p className="px-2 text-center text-xs font-medium text-slate-200 sm:text-sm">{peer.name}</p>
        </div>
      ) : (
        <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
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
  const showStage = kind === 'video' || isScreenSharing;

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
  }, [getRemoteStream, live, kind, hasRemoteVideo, isConference]);

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

  const cols =
    gridPeers.length <= 1 ? 'grid-cols-1' : gridPeers.length === 2 ? 'grid-cols-2' : 'grid-cols-2';

  return (
    <div className={cn('relative w-full overflow-hidden rounded-2xl bg-slate-950', className)}>
      {isConference || gridPeers.length > 1 ? (
        <div className={cn('grid h-full min-h-[220px] gap-1.5 p-1.5', cols)}>
          {gridPeers.map((p) => (
            <PeerTile key={p.id} peer={p} className="min-h-[100px]" />
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
              'h-full w-full object-cover',
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
                className="h-24 w-24 text-xl ring-2 ring-white/10"
              />
              <p className="text-sm font-medium text-slate-200">{remoteName}</p>
              <p className="text-xs text-slate-400">Camera off</p>
            </div>
          ) : null}
        </>
      )}

      <div
        className={cn(
          'absolute bottom-3 right-3 overflow-hidden rounded-xl border border-white/20 bg-slate-900 shadow-lg',
          'h-28 w-20 sm:h-36 sm:w-28',
          localPipClassName
        )}
      >
        <video
          id="local-video"
          ref={localRef}
          autoPlay
          muted
          playsInline
          className={cn('h-full w-full object-cover', isCameraOff && !isScreenSharing && 'opacity-0')}
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
