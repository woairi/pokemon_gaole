import typechart from '../data/typechart.json';
import type { Grade, TypeName } from '../types';
import { chance, rand } from './rng';

/** 게임 밸런스 상수 — 전부 여기에서 조정한다 */
export const TUNING = {
  baseHpBonus: 60,
  gradeHpStep: 0.1, // 등급당 HP +10%
  gradeDmgStep: 0.12, // 등급당 공격 +12%
  playerAtkBase: 0.35,
  playerAtkDiv: 200,
  enemyAtkBase: 0.25,
  enemyAtkDiv: 250,
  defScale: 140, // 방어 감쇠: defScale / (defScale + def)
  tapBase: 0.5, // 연타 0회여도 보장되는 배율
  tapsToFill: 18, // 게이지 풀충전에 필요한 탭 수
  rushDurationMs: 3000,
  zRushDurationMs: 4000,
  critChance: 0.1,
  critMult: 1.5,
  immunitySoftener: 0.25, // 면역(×0)을 ×0.25로 완화 (아이 배려)
  zPower: 180,
  zSplash: 0.4, // Z기술이 다른 야생에게 주는 비율
  zGainPerRush: 18,
  zGainOnHit: 12,
  zGainOnFaint: 25,
  dodgeBase: 0.05,
  dodgeDiv: 400,
  dodgeMax: 0.2,
};

const chart = typechart.chart as Record<TypeName, Partial<Record<TypeName, number>>>;

export function typeMultiplier(moveType: TypeName, defenderTypes: TypeName[]): number {
  let mult = 1;
  for (const t of defenderTypes) {
    mult *= chart[moveType]?.[t] ?? 1;
  }
  return mult === 0 ? TUNING.immunitySoftener : mult;
}

export const playerMaxHp = (baseHp: number, grade: Grade) =>
  Math.round((TUNING.baseHpBonus + baseHp) * (1 + TUNING.gradeHpStep * (grade - 1)));

export const wildMaxHp = (baseHp: number, hpMult: number) =>
  Math.round((TUNING.baseHpBonus + baseHp) * hpMult);

const defFactor = (def: number) => TUNING.defScale / (TUNING.defScale + def);

export interface DamageResult {
  dmg: number;
  typeMult: number;
  crit: boolean;
}

export function playerDamage(opts: {
  power: number;
  atk: number;
  fill: number; // 0~1 러시 충전량
  moveType: TypeName;
  defenderTypes: TypeName[];
  defenderDef: number;
  grade: Grade;
}): DamageResult {
  const typeMult = typeMultiplier(opts.moveType, opts.defenderTypes);
  const crit = chance(TUNING.critChance);
  const dmg =
    opts.power *
    (TUNING.playerAtkBase + opts.atk / TUNING.playerAtkDiv) *
    (TUNING.tapBase + opts.fill) *
    typeMult *
    (1 + TUNING.gradeDmgStep * (opts.grade - 1)) *
    (crit ? TUNING.critMult : 1) *
    defFactor(opts.defenderDef) *
    rand(0.9, 1.1);
  return { dmg: Math.max(1, Math.round(dmg)), typeMult, crit };
}

export function enemyDamage(opts: {
  power: number;
  atk: number;
  moveType: TypeName;
  defenderTypes: TypeName[];
  defenderDef: number;
  courseDmgMult: number;
}): DamageResult {
  const typeMult = typeMultiplier(opts.moveType, opts.defenderTypes);
  const dmg =
    opts.power *
    (TUNING.enemyAtkBase + opts.atk / TUNING.enemyAtkDiv) *
    typeMult *
    opts.courseDmgMult *
    defFactor(opts.defenderDef) *
    rand(0.85, 1.05);
  return { dmg: Math.max(1, Math.round(dmg)), typeMult, crit: false };
}

/** 스피드 차이로 적 공격을 회피할 확률 */
export const dodgeChance = (defenderSpd: number, attackerSpd: number) =>
  Math.min(
    TUNING.dodgeMax,
    Math.max(0.02, TUNING.dodgeBase + (defenderSpd - attackerSpd) / TUNING.dodgeDiv)
  );
