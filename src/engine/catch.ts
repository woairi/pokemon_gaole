import type { Grade, Rarity } from '../types';
import { chance, weightedPick } from './rng';

export interface Ball {
  id: 'poke' | 'great' | 'ultra' | 'master';
  ko: string;
  mult: number; // 포획률 배수 (master는 확정)
  arc: number; // 룰렛에서 차지하는 비율 (%)
  color: string;
}

export const BALLS: Ball[] = [
  { id: 'poke', ko: '몬스터볼', mult: 1.0, arc: 50, color: '#e3350d' },
  { id: 'great', ko: '슈퍼볼', mult: 1.3, arc: 30, color: '#2563eb' },
  { id: 'ultra', ko: '하이퍼볼', mult: 1.7, arc: 15, color: '#f59e0b' },
  { id: 'master', ko: '마스터볼', mult: Infinity, arc: 5, color: '#9333ea' },
];

/** 도감 마일스톤 보상: 포획 수에 따라 좋은 볼의 룰렛 칸이 넓어진다 */
export const BALL_MILESTONES = [
  { catches: 20, desc: '하이퍼볼 칸 UP!' },
  { catches: 50, desc: '마스터볼 칸 UP!' },
  { catches: 100, desc: '마스터볼 칸 MAX!' },
];

export function getBalls(caughtCount: number): Ball[] {
  // [몬스터/슈퍼/하이퍼/마스터] 룰렛 칸 비율 — 합은 항상 100.
  // 마스터볼(확정 포획) 칸을 조금 키워 전체 디스크 획득률을 높인다.
  // 도감 마일스톤마다 좋은 볼(특히 마스터볼) 칸이 더 넓어진다.
  let arc = { poke: 46, great: 30, ultra: 16, master: 8 };
  if (caughtCount >= 20) arc = { poke: 40, great: 30, ultra: 20, master: 10 };
  if (caughtCount >= 50) arc = { poke: 36, great: 30, ultra: 21, master: 13 };
  if (caughtCount >= 100) arc = { poke: 30, great: 28, ultra: 24, master: 18 };
  return BALLS.map((b) => ({ ...b, arc: arc[b.id] }));
}

export const BASE_CATCH: Record<Rarity, number> = {
  C: 0.68,
  B: 0.52,
  A: 0.35,
  S: 0.2,
  SS: 0.1,
};

export function catchProbability(rarity: Rarity, ball: Ball, mod = 1): number {
  if (ball.id === 'master') return 1;
  return Math.min(0.99, Math.max(0.05, BASE_CATCH[rarity] * ball.mult * mod));
}

/** 연속 실패 시 다음 포획 확률을 올려주는 자비 보정 (실패 1회당 +12%, 최대 +48%) */
const PITY_PER_MISS = 0.12;
const PITY_MAX = 0.48;
export const pityBonus = (misses: number) => 1 + Math.min(PITY_MAX, misses * PITY_PER_MISS);

export const rollCatch = (p: number) => chance(p);

/** 레어도별 등급(별) 추첨 가중치 */
export const GRADE_WEIGHTS: Record<Rarity, number[]> = {
  C: [55, 30, 12, 2.5, 0.5],
  B: [40, 35, 18, 5.5, 1],
  A: [25, 35, 25, 11, 4],
  S: [10, 25, 35, 20, 10],
  SS: [0, 0, 40, 35, 25],
};

export function rollGrade(rarity: Rarity, boost = false): Grade {
  const roll = () => weightedPick([1, 2, 3, 4, 5] as Grade[], GRADE_WEIGHTS[rarity]);
  if (!boost) return roll();
  // 등급 UP 찬스: 두 번 굴려 높은 쪽
  return Math.max(roll(), roll()) as Grade;
}
