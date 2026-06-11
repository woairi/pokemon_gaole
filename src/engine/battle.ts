import pokedexJson from '../data/pokedex.json';
import typechartJson from '../data/typechart.json';
import { getCourse } from '../data/courses';
import type {
  CourseId, DiskInstance, Grade, MoveData, Pokedex, PokemonData, Rarity, SaveData, TypeName,
} from '../types';
import {
  TUNING, dodgeChance, enemyDamage, playerDamage, playerMaxHp, typeMultiplier, wildMaxHp,
} from './damage';
import { chance, pickRandom, weightedPick } from './rng';

const dex = pokedexJson as unknown as Pokedex;
const zmoveKo = (typechartJson as { zmoveKo: Record<string, string> }).zmoveKo;

export const getSpecies = (id: number): PokemonData => dex[String(id)];
export const allSpecies = (): PokemonData[] => Object.values(dex);

export type BattlePhase =
  | 'intro' | 'legendIntro' | 'selectMove' | 'rush' | 'attack'
  | 'getChance' | 'enemyAttack' | 'stageClear' | 'battleEvolution' | 'megaAnim'
  | 'victory' | 'defeat';

export interface Combatant {
  speciesId: number;
  grade: Grade;
  rental?: boolean;
  maxHp: number;
  hp: number;
  mega?: boolean;
  intruder?: boolean; // 전설 난입 개체 (포획률 절반)
  catchResolved?: boolean;
  caught?: boolean;
}

export interface AttackEvent {
  side: 'player' | 'wild';
  attackerIdx: number;
  targetIdx: number;
  moveKo: string;
  moveType: TypeName;
  dmg: number;
  typeMult: number;
  crit: boolean;
  dodged: boolean;
  isZ: boolean;
  splashDmg?: number; // Z기술이 나머지 야생에게 준 데미지
}

export interface CatchOutcome {
  speciesId: number;
  grade: Grade;
  result: 'new' | 'gradeUp' | 'dupe' | 'escaped';
  prevGrade?: Grade;
}

export interface BattleEvo {
  monIdx: number;
  fromId: number;
  toId: number;
}

export interface BattleState {
  courseId: CourseId;
  phase: BattlePhase;
  stage: number; // 1~3 (3 = 보스전)
  round: number;
  player: Combatant[];
  wild: Combatant[];
  pending?: { monIdx: number; move: MoveData; isZ: boolean };
  lastAttack?: AttackEvent;
  zGauge: number;
  zUsedCount: number;
  megaUsed: boolean;
  gradeBoost: boolean; // 오늘 첫 배틀/스탬프 보너스: 등급 추첨 2회 중 최고
  targetOverride?: number;
  battleEvo?: BattleEvo;
  evoTriggered: boolean[];
  getChanceQueue: number[];
  catchOutcomes: CatchOutcome[];
  nextWildAttacker: number;
  legendEvent: boolean;
}

export interface BattleResult {
  won: boolean;
  courseId: CourseId;
  stageReached: number;
  team: DiskInstance[];
  catchOutcomes: CatchOutcome[];
  zUsed: number;
}

export const STAGE_COUNT = 3;
const STAGE_HP_MULT = [0.85, 1.0, 1.25]; // 스테이지별 야생 HP 배율
const STAGE_HEAL = 0.5; // 스테이지 클리어 시 회복 (최대 HP 비율)
const STAGE_REVIVE = 0.35; // 기절한 동료는 다음 스테이지에서 이 비율로 부활
const BOSS_WEIGHTS: Record<Rarity, number> = { C: 10, B: 25, A: 35, S: 22, SS: 8 };
const BOSS_WEIGHTS_LEGEND: Record<Rarity, number> = { C: 0, B: 0, A: 0, S: 20, SS: 80 };
const LEGEND_INTRUSION_CHANCE = 0.08;
const LEGEND_INTRUSION_MIN_WINS = 3;
const BATTLE_EVO_CHANCE = 0.25;
const BATTLE_EVO_HP_RATIO = 0.3;
const BATTLE_EVO_HEAL = 0.5;
export const INTRUDER_CATCH_MOD = 0.5;

function makeWild(species: PokemonData, hpMult: number, intruder = false): Combatant {
  const maxHp = wildMaxHp(species.hp, hpMult);
  return { speciesId: species.id, grade: 1, maxHp, hp: maxHp, intruder: intruder || undefined };
}

function rollWildPair(courseId: CourseId, stage: number): PokemonData[] {
  const course = getCourse(courseId);
  const weights =
    stage === STAGE_COUNT
      ? courseId === 'legend'
        ? BOSS_WEIGHTS_LEGEND
        : BOSS_WEIGHTS
      : course.rarityWeights;
  const pool = allSpecies().filter((p) => p.courses.includes(courseId));
  const byRarity = new Map<Rarity, PokemonData[]>();
  for (const p of pool) {
    byRarity.set(p.rarity, [...(byRarity.get(p.rarity) ?? []), p]);
  }
  const rarities = [...byRarity.keys()].filter((r) => weights[r] > 0);
  const usable = rarities.length ? rarities : [...byRarity.keys()];
  const pair: PokemonData[] = [];
  while (pair.length < 2) {
    const rarity = weightedPick(usable, usable.map((r) => weights[r] || 1));
    const candidates = byRarity.get(rarity)!.filter((p) => !pair.includes(p));
    if (!candidates.length) continue;
    pair.push(pickRandom(candidates));
  }
  return pair;
}

const stageWildHpMult = (courseId: CourseId, stage: number) =>
  getCourse(courseId).hpMult * STAGE_HP_MULT[stage - 1];

export function createBattle(
  team: DiskInstance[],
  courseId: CourseId,
  save: SaveData,
  gradeBoost = false
): BattleState {
  const wildSpecies = rollWildPair(courseId, 1);
  const hpMult = stageWildHpMult(courseId, 1);
  const wild = wildSpecies.map((s) => makeWild(s, hpMult));

  let legendEvent = false;
  if (
    courseId !== 'legend' &&
    save.stats.wins >= LEGEND_INTRUSION_MIN_WINS &&
    chance(LEGEND_INTRUSION_CHANCE)
  ) {
    const legends = allSpecies().filter((p) => p.rarity === 'SS');
    wild[1] = makeWild(pickRandom(legends), hpMult, true);
    legendEvent = true;
  }

  const player = team.map((d) => {
    const species = getSpecies(d.speciesId);
    const maxHp = playerMaxHp(species.hp, d.grade);
    return { speciesId: d.speciesId, grade: d.grade, rental: d.rental, maxHp, hp: maxHp };
  });

  return {
    courseId,
    phase: legendEvent ? 'legendIntro' : 'intro',
    stage: 1,
    round: 1,
    player,
    wild,
    zGauge: 0,
    zUsedCount: 0,
    megaUsed: false,
    gradeBoost,
    evoTriggered: team.map(() => false),
    getChanceQueue: [],
    catchOutcomes: [],
    nextWildAttacker: 0,
    legendEvent,
  };
}

export const beginSelect = (s: BattleState): BattleState => ({ ...s, phase: 'selectMove' });

/** 스테이지 클리어 후 다음 스테이지로 (야생 새로 등장 + 아군 일부 회복) */
export function advanceStage(s: BattleState): BattleState {
  const stage = s.stage + 1;
  const hpMult = stageWildHpMult(s.courseId, stage);
  const wild = rollWildPair(s.courseId, stage).map((sp) => makeWild(sp, hpMult));
  const player = s.player.map((c) =>
    c.hp > 0
      ? { ...c, hp: Math.min(c.maxHp, Math.round(c.hp + c.maxHp * STAGE_HEAL)) }
      : { ...c, hp: Math.round(c.maxHp * STAGE_REVIVE) }
  );
  return {
    ...s,
    phase: 'intro',
    stage,
    player,
    wild,
    targetOverride: undefined,
    nextWildAttacker: 0,
    lastAttack: undefined,
  };
}

export function chooseMove(s: BattleState, monIdx: number, moveIdx: number): BattleState {
  const mon = s.player[monIdx];
  if (!mon || mon.hp <= 0) return s;
  const move = getSpecies(mon.speciesId).moves[moveIdx];
  if (!move) return s;
  return { ...s, phase: 'rush', pending: { monIdx, move, isZ: false } };
}

export function chooseZ(s: BattleState, monIdx: number): BattleState {
  const mon = s.player[monIdx];
  if (!mon || mon.hp <= 0 || s.zGauge < 100) return s;
  const species = getSpecies(mon.speciesId);
  const type = species.types[0];
  const move: MoveData = { id: -1, ko: zmoveKo[type] ?? 'Z기술', type, power: TUNING.zPower };
  return { ...s, phase: 'rush', pending: { monIdx, move, isZ: true } };
}

/** 메가진화: 5성 디스크 + 메가 폼 보유 종, 코스당 1회. 턴을 소모하지 않는다. */
export function canMega(s: BattleState, monIdx: number): boolean {
  const mon = s.player[monIdx];
  if (!mon || mon.hp <= 0 || mon.mega || s.megaUsed) return false;
  return mon.grade === 5 && !!getSpecies(mon.speciesId).megaId;
}

export function chooseMega(s: BattleState, monIdx: number): BattleState {
  if (!canMega(s, monIdx)) return s;
  const player = s.player.map((c, i) => (i === monIdx ? { ...c, mega: true } : c));
  return { ...s, phase: 'megaAnim', player, megaUsed: true, pending: { monIdx, move: getSpecies(s.player[monIdx].speciesId).moves[0], isZ: false } };
}

export const afterMegaAnim = (s: BattleState): BattleState => ({
  ...s,
  phase: 'selectMove',
  pending: undefined,
});

/** 야생 직접 조준 (탭으로 선택) */
export function setTarget(s: BattleState, wildIdx: number): BattleState {
  if (s.wild[wildIdx]?.hp <= 0) return s;
  return { ...s, targetOverride: s.targetOverride === wildIdx ? undefined : wildIdx };
}

const livingIdx = (side: Combatant[]) =>
  side.map((c, i) => (c.hp > 0 ? i : -1)).filter((i) => i >= 0);

const megaStat = (c: Combatant, base: number) =>
  Math.round(base * (c.mega ? TUNING.megaStatMult : 1));

/** 직접 조준이 없으면 타입 상성이 가장 잘 통하는(같으면 HP 낮은) 야생을 자동 조준 */
function pickTarget(s: BattleState, moveType: TypeName): number {
  if (s.targetOverride !== undefined && s.wild[s.targetOverride]?.hp > 0) {
    return s.targetOverride;
  }
  const living = livingIdx(s.wild);
  return living.reduce((best, i) => {
    if (best < 0) return i;
    const mb = typeMultiplier(moveType, getSpecies(s.wild[best].speciesId).types);
    const mi = typeMultiplier(moveType, getSpecies(s.wild[i].speciesId).types);
    if (mi > mb) return i;
    if (mi === mb && s.wild[i].hp < s.wild[best].hp) return i;
    return best;
  }, -1);
}

export function resolveRush(s: BattleState, fill: number): BattleState {
  if (!s.pending) return s;
  const { monIdx, move, isZ } = s.pending;
  const attacker = s.player[monIdx];
  const attackerSpecies = getSpecies(attacker.speciesId);
  const targetIdx = pickTarget(s, move.type);
  const target = s.wild[targetIdx];
  const targetSpecies = getSpecies(target.speciesId);

  const { dmg: rawDmg, typeMult, crit } = playerDamage({
    power: move.power,
    atk: megaStat(attacker, attackerSpecies.atk),
    fill,
    moveType: move.type,
    defenderTypes: targetSpecies.types,
    defenderDef: targetSpecies.def,
    grade: attacker.grade,
  });
  // 일반 공격은 원킬 방지 상한 적용 (Z기술은 그대로)
  const dmg = isZ ? rawDmg : Math.min(rawDmg, Math.round(target.maxHp * TUNING.wildDmgCapRatio));

  const wild = s.wild.map((c) => ({ ...c }));
  wild[targetIdx].hp = Math.max(0, wild[targetIdx].hp - dmg);

  let splashDmg: number | undefined;
  if (isZ) {
    const otherIdx = livingIdx(s.wild).find((i) => i !== targetIdx);
    if (otherIdx !== undefined) {
      const other = getSpecies(wild[otherIdx].speciesId);
      splashDmg = Math.max(1, Math.round(dmg * TUNING.zSplash *
        (typeMultiplier(move.type, other.types) / Math.max(typeMult, 0.25))));
      wild[otherIdx].hp = Math.max(0, wild[otherIdx].hp - splashDmg);
    }
  }

  const getChanceQueue = wild
    .map((c, i) => (c.hp <= 0 && !c.catchResolved ? i : -1))
    .filter((i) => i >= 0);

  return {
    ...s,
    phase: 'attack',
    pending: undefined,
    wild,
    lastAttack: {
      side: 'player', attackerIdx: monIdx, targetIdx,
      moveKo: move.ko, moveType: move.type,
      dmg, typeMult, crit, dodged: false, isZ, splashDmg,
    },
    zGauge: isZ ? 0 : Math.min(100, s.zGauge + TUNING.zGainPerRush * fill),
    zUsedCount: s.zUsedCount + (isZ ? 1 : 0),
    getChanceQueue,
  };
}

function proceedAfterPlayerPhase(s: BattleState): BattleState {
  if (livingIdx(s.wild).length === 0) {
    return { ...s, phase: s.stage < STAGE_COUNT ? 'stageClear' : 'victory' };
  }
  return performEnemyAttack(s);
}

export function continueAfterAttack(s: BattleState): BattleState {
  if (s.getChanceQueue.length > 0) return { ...s, phase: 'getChance' };
  return proceedAfterPlayerPhase(s);
}

export function finishCatch(s: BattleState, outcome: CatchOutcome): BattleState {
  const [wildIdx, ...rest] = s.getChanceQueue;
  const wild = s.wild.map((c, i) =>
    i === wildIdx ? { ...c, catchResolved: true, caught: outcome.result !== 'escaped' } : c
  );
  const next: BattleState = {
    ...s,
    wild,
    catchOutcomes: [...s.catchOutcomes, outcome],
    getChanceQueue: rest,
  };
  if (rest.length > 0) return next;
  return proceedAfterPlayerPhase(next);
}

function performEnemyAttack(s: BattleState): BattleState {
  const living = livingIdx(s.wild);
  // 교대로 공격 (기절한 야생은 건너뜀)
  const attackerIdx = living.includes(s.nextWildAttacker % s.wild.length)
    ? s.nextWildAttacker % s.wild.length
    : living[0];
  const attacker = s.wild[attackerIdx];
  const attackerSpecies = getSpecies(attacker.speciesId);

  const targets = livingIdx(s.player);
  // 체력이 많은 쪽을 노린다 (한 마리 집중 공격 방지)
  const targetIdx = targets.reduce((a, b) => (s.player[b].hp > s.player[a].hp ? b : a));
  const target = s.player[targetIdx];
  const targetSpecies = getSpecies(target.speciesId);

  // 더 잘 통하는 기술 선택
  const move = attackerSpecies.moves.reduce((a, b) =>
    b.power * typeMultiplier(b.type, targetSpecies.types) >
    a.power * typeMultiplier(a.type, targetSpecies.types) ? b : a
  );

  const dodged = chance(dodgeChance(targetSpecies.spd, attackerSpecies.spd));
  const course = getCourse(s.courseId);
  const { dmg, typeMult } = enemyDamage({
    power: move.power,
    atk: attackerSpecies.atk,
    moveType: move.type,
    defenderTypes: targetSpecies.types,
    defenderDef: megaStat(target, targetSpecies.def),
    courseDmgMult: course.dmgMult,
  });

  const player = s.player.map((c) => ({ ...c }));
  let zGauge = s.zGauge;
  if (!dodged) {
    player[targetIdx].hp = Math.max(0, player[targetIdx].hp - dmg);
    zGauge = Math.min(100, zGauge + TUNING.zGainOnHit);
    if (player[targetIdx].hp <= 0) zGauge = Math.min(100, zGauge + TUNING.zGainOnFaint);
  }

  return {
    ...s,
    phase: 'enemyAttack',
    player,
    zGauge,
    nextWildAttacker: (attackerIdx + 1) % s.wild.length,
    lastAttack: {
      side: 'wild', attackerIdx, targetIdx,
      moveKo: move.ko, moveType: move.type,
      dmg: dodged ? 0 : dmg, typeMult, crit: false, dodged, isZ: false,
    },
  };
}

/** 위기에 몰리면 배틀 중 진화가 발동할 수 있다 (포켓몬당 코스에서 1회 판정) */
function checkBattleEvolution(s: BattleState): BattleState {
  for (let i = 0; i < s.player.length; i++) {
    const mon = s.player[i];
    if (s.evoTriggered[i] || mon.hp <= 0 || mon.mega) continue;
    if (mon.hp > mon.maxHp * BATTLE_EVO_HP_RATIO) continue;
    const species = getSpecies(mon.speciesId);
    if (!species.evolvesTo?.length) continue;
    const evoTriggered = [...s.evoTriggered];
    evoTriggered[i] = true;
    if (!chance(BATTLE_EVO_CHANCE)) {
      return { ...s, evoTriggered };
    }
    return {
      ...s,
      evoTriggered,
      phase: 'battleEvolution',
      battleEvo: { monIdx: i, fromId: mon.speciesId, toId: pickRandom(species.evolvesTo) },
    };
  }
  return s;
}

/** 배틀 중 진화 적용: 종 교체 + HP 회복 */
export function applyBattleEvolution(s: BattleState): BattleState {
  if (!s.battleEvo) return s;
  const { monIdx, toId } = s.battleEvo;
  const player = s.player.map((c) => ({ ...c }));
  const mon = player[monIdx];
  const newSpecies = getSpecies(toId);
  const newMax = playerMaxHp(newSpecies.hp, mon.grade);
  mon.speciesId = toId;
  mon.maxHp = newMax;
  mon.hp = Math.min(newMax, Math.round(mon.hp + newMax * BATTLE_EVO_HEAL));
  return { ...s, player, battleEvo: undefined, phase: 'selectMove', round: s.round + 1 };
}

export function continueAfterEnemyAttack(s: BattleState): BattleState {
  if (livingIdx(s.player).length === 0) return { ...s, phase: 'defeat' };
  const evoChecked = checkBattleEvolution(s);
  if (evoChecked.phase === 'battleEvolution') return evoChecked;
  return { ...evoChecked, phase: 'selectMove', round: s.round + 1, lastAttack: undefined };
}
