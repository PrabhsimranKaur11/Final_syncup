/** Classic two-tone phone ring — louder, WhatsApp-style */
let audioCtx = null;
let ringInterval = null;
let activeNodes = [];

const RING_VOLUME = 0.72;

const stopNodes = () => {
  activeNodes.forEach(({ osc, gain }) => {
    try {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* already stopped */
    }
  });
  activeNodes = [];
};

const ensureAudioContext = async () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  return audioCtx;
};

const playBurst = (ctx) => {
  const t = ctx.currentTime;
  const pattern = [
    { freq: 440, start: 0, dur: 0.45 },
    { freq: 480, start: 0.55, dur: 0.45 },
    { freq: 440, start: 1.1, dur: 0.45 },
    { freq: 480, start: 1.65, dur: 0.45 },
  ];

  pattern.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + start);
    gain.gain.linearRampToValueAtTime(RING_VOLUME, t + start + 0.04);
    gain.gain.setValueAtTime(RING_VOLUME, t + start + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, t + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.05);
    activeNodes.push({ osc, gain });
  });
};

export const startCallRingtone = async () => {
  stopCallRingtone();
  try {
    const ctx = await ensureAudioContext();
    playBurst(ctx);
    ringInterval = window.setInterval(() => {
      stopNodes();
      playBurst(ctx);
    }, 2400);
  } catch {
    /* autoplay blocked until user interacts */
  }
};

export const stopCallRingtone = () => {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  stopNodes();
};

/** Call once after login / first click so ring can play on incoming calls */
export const unlockCallAudio = () => {
  ensureAudioContext().catch(() => {});
};
