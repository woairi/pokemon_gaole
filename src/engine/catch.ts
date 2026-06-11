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

export const BASE_CATCH: Record<Rarity, number> = {
  C: 0.85,
  B: 0.7,
  A: 0.5,
  S: 0.3,
  SS: 0.15,
};

export function catchProbability(rarity: Rarity, ball: Ball, mod = 1): number {
  if (ball.id === 'master') return 1;
  return Math.min(0.99, Math.max(0.05, BASE_CATCH[rarity] * ball.mult * mod));
}

export const rollCatch = (p: number) => chance(p);

/** 레어도별 등급(별) 추첨 가중치 */
export const GRADE_WEIGHTS: Record<Rarity, number[]> = {
  C: [55, 30, 12, 2.5, 0.5],
  B: [40, 35, 18, 5.5, 1],
  A: [25, 35, 25, 11, 4],
  S: [10, 25, 35, 20, 10],
  SS: [0, 0, 40, 35, 25],
};

export function rollGrade(rarity: Rarity): Grade {
  return weightedPick([1, 2, 3, 4, 5] as Grade[], GRADE_WEIGHTS[rarity]);
}
