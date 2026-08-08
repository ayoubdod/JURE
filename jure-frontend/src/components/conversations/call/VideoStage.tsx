import React, { useEffect, useRef } from 'react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useCallSessionStore } from '@/stores/callSessionStore';

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
  const isCameraOff = useCallSessionStore((s) => s.ui.isCameraOff);
  const remoteCameraOff = useCallSessionStore((s) => s.ui.remoteCameraOff);
  const hasRemoteVideo = useCallSessionStore((s) => s.ui.hasRemoteVideo);
  const status = useCallSessionStore((s) => s.ui.status);
  const getLocalStream = useCallSessionStore((s) => s.getLocalStream);
  const getRemoteStream = useCallSessionStore((s) => s.getRemoteStream);
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  const live = status === 'active' || status === 'reconnecting' || status === 'connecting';

  useEffect(() => {
    const local = localRef.current;
    const remote = remoteRef.current;
    const localStream = getLocalStream();
    const remoteStream = getRemoteStream();
    if (local) {
      local.srcObject = localStream;
      if (localStream) void local.play().catch(() => {});
    }
    if (remote) {
      remote.srcObject = remoteStream;
      if (remoteStream) void remote.play().catch(() => {});
    }
  }, [getLocalStream, getRemoteStream, live, kind, isCameraOff, hasRemoteVideo]);

  if (kind !== 'video') return null;

  const showRemoteFallback = !hasRemoteVideo || remoteCameraOff;

  return (
    <div className={cn('relative w-full overflow-hidden rounded-2xl bg-slate-950', className)}>
      <video
        id="remote-video"
        ref={remoteRef}
        autoPlay
        playsInline
        className={cn(
          'h-full w-full object-cover',
          showRemoteFallback ? 'opacity-0 absolute inset-0' : 'opacity-100'
        )}
      />
      {showRemoteFallback ? (
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
