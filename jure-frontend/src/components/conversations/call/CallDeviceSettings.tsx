import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface MediaDeviceLists {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

async function listDevices(): Promise<MediaDeviceLists> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    audioInputs: devices.filter((d) => d.kind === 'audioinput'),
    videoInputs: devices.filter((d) => d.kind === 'videoinput'),
    audioOutputs: devices.filter((d) => d.kind === 'audiooutput'),
  };
}

const CallDeviceSettings: React.FC<{
  open: boolean;
  onClose: () => void;
  kind: 'voice' | 'video';
  selectedAudioInputId: string | null;
  selectedVideoInputId: string | null;
  selectedAudioOutputId: string | null;
  onSelectAudioInput: (id: string) => void;
  onSelectVideoInput: (id: string) => void;
  onSelectAudioOutput: (id: string) => void;
}> = ({
  open,
  onClose,
  kind,
  selectedAudioInputId,
  selectedVideoInputId,
  selectedAudioOutputId,
  onSelectAudioInput,
  onSelectVideoInput,
  onSelectAudioOutput,
}) => {
  const [devices, setDevices] = useState<MediaDeviceLists>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });
  const sinkSupported =
    typeof HTMLMediaElement !== 'undefined' &&
    typeof (HTMLMediaElement.prototype as HTMLMediaElement & { setSinkId?: unknown }).setSinkId ===
      'function';

  useEffect(() => {
    if (!open) return;
    void listDevices().then(setDevices);
    const onChange = () => void listDevices().then(setDevices);
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', onChange);
  }, [open]);

  if (!open) return null;

  const selectClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900';

  return (
    <div
      role="dialog"
      aria-label="Device settings"
      className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Device settings</p>
        <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800">
          Close
        </button>
      </div>

      <label className="block text-xs font-medium text-slate-500">
        Microphone
        <select
          className={selectClass}
          value={selectedAudioInputId ?? ''}
          onChange={(e) => onSelectAudioInput(e.target.value)}
        >
          <option value="">Default microphone</option>
          {devices.audioInputs.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
            </option>
          ))}
        </select>
      </label>

      {kind === 'video' ? (
        <label className={cn('mt-2 block text-xs font-medium text-slate-500')}>
          Camera
          <select
            className={selectClass}
            value={selectedVideoInputId ?? ''}
            onChange={(e) => onSelectVideoInput(e.target.value)}
          >
            <option value="">Default camera</option>
            {devices.videoInputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {sinkSupported ? (
        <label className="mt-2 block text-xs font-medium text-slate-500">
          Speaker
          <select
            className={selectClass}
            value={selectedAudioOutputId ?? ''}
            onChange={(e) => onSelectAudioOutput(e.target.value)}
          >
            <option value="">Default speaker</option>
            {devices.audioOutputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Speaker ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Speaker selection is not supported in this browser.</p>
      )}
    </div>
  );
};

export default React.memo(CallDeviceSettings);
