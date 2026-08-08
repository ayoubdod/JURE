/**
 * Telephony-style call tones via Web Audio (no asset files).
 * Cadences roughly follow classic PSTN ring / ringback / busy patterns.
 */

type ToneKind = 'ringing' | 'calling' | 'connecting' | 'connected' | 'ended' | 'busy';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let activeKind: ToneKind | null = null;
let pendingKind: ToneKind | null = null;
let gestureArmed = false;
const liveOsc: OscillatorNode[] = [];

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx || ctx.state === 'closed') {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.14;
    master.connect(ctx.destination);
  }
  return ctx;
}

async function unlock(): Promise<AudioContext | null> {
  const c = getCtx();
  if (!c) return null;
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      /* autoplay policy — gesture unlock below */
    }
  }
  return c;
}

function disarmGesture() {
  gestureArmed = false;
}

function armGestureUnlock() {
  if (gestureArmed || typeof window === 'undefined') return;
  gestureArmed = true;
  const resume = () => {
    disarmGesture();
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
    void (async () => {
      const c = await unlock();
      if (c && pendingKind) {
        const kind = pendingKind;
        pendingKind = null;
        await startKind(kind);
      }
    })();
  };
  window.addEventListener('pointerdown', resume, { once: true });
  window.addEventListener('keydown', resume, { once: true });
}

function clearLoop() {
  if (loopTimer != null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
}

function stopOscillators() {
  while (liveOsc.length) {
    const o = liveOsc.pop();
    try {
      o?.stop();
      o?.disconnect();
    } catch {
      /* already stopped */
    }
  }
}

function tone(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  dur: number,
  gain = 0.22,
  type: OscillatorType = 'sine'
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.setValueAtTime(gain, start + Math.max(0.03, dur - 0.04));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.02);
  liveOsc.push(osc);
}

/** Dual-tone burst (PSTN-style). */
function dualBurst(
  c: AudioContext,
  dest: AudioNode,
  f1: number,
  f2: number,
  start: number,
  dur: number,
  gain = 0.16
) {
  tone(c, dest, f1, start, dur, gain);
  tone(c, dest, f2, start, dur, gain * 0.9);
}

function scheduleRinging(c: AudioContext, dest: AudioNode) {
  // Incoming ring: 2s on / 4s off (US-like), dual 440+480
  const t0 = c.currentTime + 0.02;
  dualBurst(c, dest, 440, 480, t0, 2.0, 0.18);
  loopTimer = setTimeout(() => {
    if (activeKind === 'ringing') scheduleRinging(c, dest);
  }, 6000);
}

function scheduleCalling(c: AudioContext, dest: AudioNode) {
  // Outbound ringback: 2s on / 4s off
  const t0 = c.currentTime + 0.02;
  dualBurst(c, dest, 425, 450, t0, 2.0, 0.15);
  loopTimer = setTimeout(() => {
    if (activeKind === 'calling') scheduleCalling(c, dest);
  }, 6000);
}

function scheduleConnecting(c: AudioContext, dest: AudioNode) {
  const t0 = c.currentTime + 0.02;
  tone(c, dest, 520, t0, 0.08, 0.08);
  tone(c, dest, 520, t0 + 0.35, 0.08, 0.06);
  loopTimer = setTimeout(() => {
    if (activeKind === 'connecting') scheduleConnecting(c, dest);
  }, 1400);
}

function playConnected(c: AudioContext, dest: AudioNode) {
  const t0 = c.currentTime + 0.02;
  tone(c, dest, 523.25, t0, 0.12, 0.14);
  tone(c, dest, 659.25, t0 + 0.11, 0.16, 0.16);
  tone(c, dest, 783.99, t0 + 0.24, 0.22, 0.12);
}

function playEnded(c: AudioContext, dest: AudioNode) {
  const t0 = c.currentTime + 0.02;
  tone(c, dest, 480, t0, 0.18, 0.14);
  tone(c, dest, 380, t0 + 0.16, 0.28, 0.12);
}

function playBusy(c: AudioContext, dest: AudioNode) {
  const t0 = c.currentTime + 0.02;
  for (let i = 0; i < 3; i++) {
    dualBurst(c, dest, 480, 620, t0 + i * 1.0, 0.48, 0.14);
  }
}

async function startKind(kind: ToneKind): Promise<void> {
  const c = await unlock();
  if (!c || !master) {
    pendingKind = kind;
    armGestureUnlock();
    return;
  }
  if (c.state !== 'running') {
    pendingKind = kind;
    armGestureUnlock();
    return;
  }

  activeKind = kind;
  pendingKind = null;

  if (kind === 'ringing') scheduleRinging(c, master);
  else if (kind === 'calling') scheduleCalling(c, master);
  else if (kind === 'connecting') scheduleConnecting(c, master);
  else if (kind === 'connected') {
    playConnected(c, master);
    activeKind = null;
  } else if (kind === 'ended') {
    playEnded(c, master);
    activeKind = null;
  } else if (kind === 'busy') {
    playBusy(c, master);
    activeKind = null;
  }
}

export async function stopCallSounds(): Promise<void> {
  activeKind = null;
  pendingKind = null;
  disarmGesture();
  clearLoop();
  stopOscillators();
}

/**
 * Drive tones from call UI status. Looping tones replace each other;
 * one-shots stop any loop first.
 */
export async function playCallSoundForStatus(
  status:
    | 'idle'
    | 'calling'
    | 'ringing'
    | 'connecting'
    | 'reconnecting'
    | 'active'
    | 'ended'
    | 'declined'
    | 'missed'
    | 'error'
): Promise<void> {
  if (status === 'idle') {
    await stopCallSounds();
    return;
  }

  const map: Record<string, ToneKind | null> = {
    ringing: 'ringing',
    calling: 'calling',
    connecting: 'connecting',
    reconnecting: 'connecting',
    active: 'connected',
    ended: 'ended',
    declined: 'busy',
    missed: 'busy',
    error: 'busy',
  };

  const kind = map[status] ?? null;
  if (!kind) {
    await stopCallSounds();
    return;
  }

  if (activeKind === kind && (kind === 'ringing' || kind === 'calling' || kind === 'connecting')) {
    return;
  }

  clearLoop();
  stopOscillators();
  activeKind = null;
  await startKind(kind);
}
