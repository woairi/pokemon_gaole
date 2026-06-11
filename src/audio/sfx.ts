// Web Audio로 합성한 효과음 (저작권 음원 미사용)
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export const isSoundEnabled = () => enabled;

export function getAudioContext(): AudioContext | null {
  return ensureCtx();
}

function ensureCtx(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
  delay?: number;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  const ac = ensureCtx();
  if (!ac) return;
  const { type = 'square', vol = 0.12, slideTo, delay = 0 } = opts;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.15, delay = 0) {
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(gain).connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  click: () => tone(880, 0.06, { type: 'sine', vol: 0.1 }),
  /** 러시 연타 — 충전량에 따라 음이 올라간다 */
  tap: (fill: number) => tone(300 + fill * 700, 0.05, { type: 'square', vol: 0.08 }),
  hit: () => {
    noise(0.12, 0.2);
    tone(140, 0.15, { type: 'sawtooth', vol: 0.15, slideTo: 60 });
  },
  superHit: () => {
    noise(0.2, 0.25);
    tone(220, 0.25, { type: 'sawtooth', vol: 0.2, slideTo: 50 });
    tone(440, 0.1, { type: 'square', vol: 0.1, delay: 0.05 });
  },
  weakHit: () => tone(200, 0.1, { type: 'triangle', vol: 0.08, slideTo: 150 }),
  dodge: () => tone(600, 0.15, { type: 'sine', vol: 0.1, slideTo: 1200 }),
  faint: () => tone(400, 0.5, { type: 'sawtooth', vol: 0.12, slideTo: 60 }),
  tick: () => tone(1200, 0.03, { type: 'square', vol: 0.06 }),
  throwBall: () => tone(300, 0.3, { type: 'sine', vol: 0.12, slideTo: 900 }),
  shake: () => tone(180, 0.12, { type: 'triangle', vol: 0.14 }),
  catchSuccess: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.18, { type: 'square', vol: 0.12, delay: i * 0.12 })
    );
  },
  escape: () => tone(500, 0.4, { type: 'triangle', vol: 0.12, slideTo: 150 }),
  zCharge: () => tone(100, 0.8, { type: 'sawtooth', vol: 0.12, slideTo: 1600 }),
  fanfare: () => {
    [523, 523, 523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.16, { type: 'square', vol: 0.12, delay: i * 0.13 })
    );
  },
  defeat: () => {
    [400, 350, 300, 200].forEach((f, i) =>
      tone(f, 0.25, { type: 'triangle', vol: 0.1, delay: i * 0.2 })
    );
  },
  legend: () => {
    tone(80, 1.2, { type: 'sawtooth', vol: 0.18, slideTo: 40 });
    noise(0.8, 0.1);
  },
  evolve: () => {
    [392, 494, 587, 784, 988].forEach((f, i) =>
      tone(f, 0.2, { type: 'sine', vol: 0.12, delay: i * 0.1 })
    );
  },
};
