import React, { useEffect, useRef } from 'react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useCallSessionStore } from '@/stores/callSessionStore';

const PeerTile: React.FC<{
  peerId: number;
  name: string;
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
  hasVideo: boolean;
  cameraOff: boolean;
  className?: string;
}> = ({ peerId, name, avatar, firstName, lastName, hasVideo, cameraOff, className }) => {
  const getPeerStream = useCallSessionStore((s) => s.getPeerStream);
  const getRemoteStream = useCallSessionStore((s) => s.getRemoteStream);
  const videoRef = useRef<HTMLVideoElement>(null);
  const showFallback = !hasVideo || cameraOff;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const stream = getPeerStream(peerId) ?? (peerId < 0 ? null : getRemoteStream());
    el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
  }, [getPeerStream, getRemoteStream, peerId, hasVideo, cameraOff]);

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-slate-950', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={cn('h-full w-full object-cover', showFallback && 'opacity-0 absolute inset-0')}
      />
      {showFallback ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-900 to-slate-950">
          <UserAvatar
            image={avatar ?? undefined}
            firstName={firstName}
            lastName={lastName}
            size="lg"
            className="h-16 w-16 text-base ring-2 ring-white/10 sm:h-20 sm:w-20"
          />
          <p className="px-2 text-center text-xs font-medium text-slate-200 sm:text-sm">{name}</p>
        </div>
      ) : (
        <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
          {name}
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
  const remoteCameraOff = useCallSessionStore((s) => s.ui.remoteCameraOff);
  const hasRemoteVideo = useCallSessionStore((s) => s.ui.hasRemoteVideo);
  const status = useCallSessionStore((s) => s.ui.status);
  const getLocalStream = useCallSessionStore((s) => s.getLocalStream);
  const getRemoteStream = useCallSessionStore((s) => s.getRemoteStream);
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  const live = status === 'active' || status === 'reconnecting' || status === 'connecting';
  const isConference = mode === 'conference';

  useEffect(() => {
    const local = localRef.current;
    const localStream = getLocalStream();
    if (local) {
      local.srcObject = localStream;
      if (localStream) void local.play().catch(() => {});
    }
  }, [getLocalStream, live, kind, isCameraOff]);

  useEffect(() => {
    if (isConference) return;
    const remote = remoteRef.current;
    const remoteStream = getRemoteStream();
    if (remote) {
      remote.srcObject = remoteStream;
      if (remoteStream) void remote.play().catch(() => {});
    }
  }, [getRemoteStream, live, kind, hasRemoteVideo, isConference]);

  if (kind !== 'video') return null;

  const gridPeers =
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
            <PeerTile
              key={p.id}
              peerId={p.id}
              name={p.name}
              avatar={p.avatar}
              firstName={p.firstName}
              lastName={p.lastName}
              hasVideo={p.hasVideo}
              cameraOff={p.cameraOff}
              className="min-h-[100px]"
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
          className={cn('h-full w-full object-cover', isCameraOff && 'opacity-0')}
        />
        {isCameraOff ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-[10px] font-medium uppercase tracking-wide text-slate-300">
            You
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(VideoStage);
