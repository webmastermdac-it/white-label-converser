export const SERVICE_REQUEST_SOUND_KEY = "genius-service-request-sound";

let sharedCtx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new AudioCtx();
  return sharedCtx;
};

/**
 * Browsers (especially iOS/Android) keep audio suspended until a user gesture.
 * Call once at app start: the first tap/click/key unlocks the shared context so
 * later sounds triggered by Realtime events (no gesture) can actually play.
 */
export const installAudioUnlock = () => {
  const unlock = () => {
    try { void getCtx()?.resume(); } catch { /* ignore */ }
    if (sharedCtx?.state === "running") {
      ["pointerdown", "touchstart", "keydown", "click"].forEach((e) => window.removeEventListener(e, unlock, true));
    }
  };
  ["pointerdown", "touchstart", "keydown", "click"].forEach((e) => window.addEventListener(e, unlock, true));
  return () => ["pointerdown", "touchstart", "keydown", "click"].forEach((e) => window.removeEventListener(e, unlock, true));
};

/** True while the browser still blocks audio (no click on the page yet): request sounds would be silent. */
export const isAudioLocked = (): boolean => {
  try { const ctx = getCtx(); return !!ctx && ctx.state !== "running"; } catch { return false; }
};

/** Calls back whenever the audio lock changes (also once right away). Returns the unsubscribe function. */
export const subscribeAudioLock = (cb: (locked: boolean) => void): (() => void) => {
  let ctx: AudioContext | null = null;
  try { ctx = getCtx(); } catch { /* audio not available */ }
  if (!ctx) { cb(false); return () => {}; }
  const notify = () => cb(ctx!.state !== "running");
  ctx.addEventListener("statechange", notify);
  notify();
  return () => ctx!.removeEventListener("statechange", notify);
};

const beep = (ctx: AudioContext, start: number) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.2, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
  osc.start(start);
  osc.stop(start + 0.3);
};

export const playNotice = () => {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const run = () => { beep(ctx, ctx.currentTime); beep(ctx, ctx.currentTime + 0.4); };
    if (ctx.state === "suspended") void ctx.resume().then(run).catch(() => {});
    else run();
  } catch { /* audio not available */ }
};

/** Sound is on unless the user explicitly switched it off. */
export const soundEnabled = () => {
  try { return localStorage.getItem(SERVICE_REQUEST_SOUND_KEY) !== "false"; } catch { return true; }
};
