// Web Audio로 합성한 8비트풍 BGM 루프 (저작권 음원 미사용)
import { getAudioContext, isSoundEnabled } from './sfx';

export type Track = 'menu' | 'battle';

interface TrackDef {
  stepSec: number;
  /** 멜로디 (Hz, 0 = 쉼표) */
  melody: number[];
  /** 베이스 — melody 2스텝당 1개 */
  bass: number[];
  melodyVol: number;
  bassVol: number;
}

const TRACKS: Record<Track, TrackDef> = {
  menu: {
    stepSec: 0.28,
    melody: [523, 659, 784, 988, 1047, 988, 784, 659, 523, 659, 784, 659, 587, 0, 494, 0],
    bass: [131, 165, 196, 165, 147, 175, 123, 131],
    melodyVol: 0.025,
    bassVol: 0.03,
  },
  battle: {
    stepSec: 0.16,
    melody: [
      523, 0, 659, 784, 880, 0, 784, 659, 523, 523, 659, 784, 1047, 880, 784, 0,
      440, 0, 523, 659, 698, 0, 659, 523, 587, 587, 698, 880, 784, 698, 659, 0,
    ],
    bass: [131, 131, 165, 165, 175, 175, 196, 196, 110, 110, 131, 131, 147, 147, 165, 196],
    melodyVol: 0.03,
    bassVol: 0.04,
  },
};

let current: Track | null = null;
let timer: number | undefined;
let nextStepTime = 0;
let stepIndex = 0;

function scheduleNote(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  vol: number
) {
  if (freq <= 0) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function tick() {
  if (!current || !isSoundEnabled()) return;
  // 백그라운드에서는 쉬기 (탭 복귀 시 밀린 음표가 한꺼번에 터지는 것 방지)
  if (typeof document !== 'undefined' && document.hidden) return;
  const ac = getAudioContext();
  if (!ac) return;
  const def = TRACKS[current];
  // 스케줄 시각이 뒤처졌으면(백그라운드 스로틀 등) 현재로 따라잡기
  if (nextStepTime < ac.currentTime) nextStepTime = ac.currentTime + 0.05;
  // 0.25초 미리보기 스케줄링
  while (nextStepTime < ac.currentTime + 0.25) {
    const i = stepIndex % def.melody.length;
    scheduleNote(ac, def.melody[i], nextStepTime, def.stepSec * 0.9, 'square', def.melodyVol);
    if (i % 2 === 0) {
      const b = def.bass[(i / 2) % def.bass.length];
      scheduleNote(ac, b, nextStepTime, def.stepSec * 1.7, 'triangle', def.bassVol);
    }
    nextStepTime += def.stepSec;
    stepIndex++;
  }
}

export const bgm = {
  play(track: Track) {
    if (current === track) return;
    bgm.stop();
    current = track;
    stepIndex = 0;
    const ac = getAudioContext();
    nextStepTime = ac ? ac.currentTime + 0.05 : 0;
    timer = window.setInterval(tick, 60);
  },
  stop() {
    current = null;
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  },
};
