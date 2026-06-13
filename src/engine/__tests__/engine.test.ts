import { describe, expect, it } from 'vitest';
import type { DiskInstance, SaveData, TypeName } from '../../types';
import { defaultSave } from '../../store/persistence';
import { rollEvolutions } from '../events';
import {
  ATK_ROULETTE, DEF_ROULETTE, STAGE_COUNT, advanceStage, afterRush, applyBattleEvolution,
  beginSelect, canMega, chooseMega, chooseMove, chooseZ, continueAfterAttack,
  continueAfterEnemyAttack, createBattle, finishCatch, getSpecies, resolveDefense,
  resolveRush, setTarget,
} from '../battle';
import { BASE_CATCH, GRADE_WEIGHTS, catchProbability, getBalls, rollGrade } from '../catch';
import { TUNING, enemyDamage, playerDamage, playerMaxHp, typeMultiplier, wildMaxHp } from '../damage';

const save: SaveData = defaultSave();
const team: DiskInstance[] = [
  { speciesId: 25, grade: 1, rental: true },
  { speciesId: 7, grade: 1, rental: true },
];

describe('타입 상성', () => {
  it('약점은 2배', () => {
    expect(typeMultiplier('electric', ['water'])).toBe(2);
  });
  it('이중 약점은 4배', () => {
    expect(typeMultiplier('electric', ['water', 'flying'])).toBe(4);
  });
  it('면역(0배)은 0.25로 완화', () => {
    expect(typeMultiplier('electric', ['ground'])).toBe(TUNING.immunitySoftener);
  });
});

describe('데미지 공식', () => {
  it('연타를 안 해도 절반 배율은 보장', () => {
    const weak = playerDamage({
      power: 100, atk: 80, fill: 0, moveType: 'normal',
      defenderTypes: ['normal'], defenderDef: 60, grade: 1,
    });
    const strong = playerDamage({
      power: 100, atk: 80, fill: 1, moveType: 'normal',
      defenderTypes: ['normal'], defenderDef: 60, grade: 1,
    });
    expect(weak.dmg).toBeGreaterThan(0);
    expect(strong.dmg).toBeGreaterThan(weak.dmg);
  });
  it('등급이 높으면 HP가 높다', () => {
    expect(playerMaxHp(60, 5)).toBeGreaterThan(playerMaxHp(60, 1));
  });
  it('적 데미지는 양수', () => {
    const { dmg } = enemyDamage({
      power: 80, atk: 70, moveType: 'water',
      defenderTypes: ['fire'], defenderDef: 50, courseDmgMult: 1,
    });
    expect(dmg).toBeGreaterThan(0);
  });
  it('야생 HP는 코스 배율을 따른다', () => {
    expect(wildMaxHp(100, 1.6)).toBeGreaterThan(wildMaxHp(100, 0.8));
  });
});

describe('포획', () => {
  it('마스터볼은 확정 포획', () => {
    const master = getBalls(0).find((b) => b.id === 'master')!;
    expect(catchProbability('SS', master)).toBe(1);
  });
  it('레어할수록 잡기 어렵다', () => {
    const poke = getBalls(0)[0];
    expect(catchProbability('C', poke)).toBeGreaterThan(catchProbability('SS', poke));
    expect(BASE_CATCH.C).toBeGreaterThan(BASE_CATCH.SS);
  });
  it('마일스톤이 좋은 볼 칸을 넓힌다 (합은 항상 100)', () => {
    for (const n of [0, 20, 50, 100]) {
      const balls = getBalls(n);
      expect(balls.reduce((a, b) => a + b.arc, 0)).toBe(100);
    }
    expect(getBalls(100).find((b) => b.id === 'master')!.arc).toBeGreaterThan(
      getBalls(0).find((b) => b.id === 'master')!.arc
    );
  });
  it('등급 추첨은 1~5성, SS는 3성 이상', () => {
    for (let i = 0; i < 200; i++) {
      const g = rollGrade('SS');
      expect(g).toBeGreaterThanOrEqual(3);
      expect(g).toBeLessThanOrEqual(5);
    }
    expect(GRADE_WEIGHTS.SS[0]).toBe(0);
  });
});

describe('진화 이벤트', () => {
  it('같은 종이 2마리 출전해도 진화 이벤트는 최대 1회', () => {
    const dupSave: SaveData = {
      ...defaultSave(),
      disks: { 25: { grade: 3, caughtAt: 1, timesUsed: 0 } },
    };
    const dupTeam: DiskInstance[] = [
      { speciesId: 25, grade: 3 },
      { speciesId: 25, grade: 1, rental: true }, // 렌탈은 제외되지만 종 중복 케이스 포함
    ];
    for (let i = 0; i < 200; i++) {
      const events = rollEvolutions([...dupTeam, { speciesId: 25, grade: 3 }], dupSave);
      const fromIds = events.map((e) => e.fromId);
      expect(new Set(fromIds).size).toBe(fromIds.length);
    }
  });
});

describe('배틀 흐름', () => {
  it('일반 공격은 야생 최대 HP의 70%를 넘지 않는다 (원킬 방지)', () => {
    // 최강 조건(5성 만렙 연타 + 약한 야생)에서도 한 방에 죽지 않아야 한다
    for (let i = 0; i < 50; i++) {
      let b = createBattle(
        [{ speciesId: 150, grade: 5 }, { speciesId: 25, grade: 1, rental: true }],
        'grass',
        save
      );
      b = beginSelect(b);
      b = chooseMove(b, 0, 0);
      b = resolveRush(b, 1);
      const target = b.wild[b.lastAttack!.targetIdx];
      expect(b.lastAttack!.dmg).toBeLessThanOrEqual(Math.round(target.maxHp * TUNING.wildDmgCapRatio));
      expect(target.hp).toBeGreaterThan(0);
    }
  });

  it('Z기술은 데미지 상한이 없다', () => {
    let b = createBattle(team, 'grass', save);
    b = beginSelect(b);
    b = { ...b, zGauge: 100, wild: b.wild.map((w) => ({ ...w, maxHp: 10, hp: 10 })) };
    b = chooseZ(b, 0);
    b = resolveRush(b, 1);
    // 상한(7)보다 큰 데미지 허용 → 원킬 가능
    expect(b.wild[b.lastAttack!.targetIdx].hp).toBe(0);
  });

  it('생성 → 기술 선택 → 러시 → 공격 룰렛 → 공격', () => {
    let b = createBattle(team, 'grass', save);
    expect(b.stage).toBe(1);
    expect(b.player).toHaveLength(2);
    expect(b.wild).toHaveLength(2);
    b = beginSelect(b);
    b = chooseMove(b, 0, 0);
    expect(b.phase).toBe('rush');
    b = afterRush(b, 1);
    expect(b.phase).toBe('atkRoulette'); // 일반 기술은 공격 룰렛 경유
    expect(b.pendingFill).toBe(1);
    b = resolveRush(b, b.pendingFill!, 2);
    expect(b.phase).toBe('attack');
    expect(b.lastAttack?.dmg).toBeGreaterThan(0);
    expect(b.lastAttack?.rouletteMult).toBe(2);
  });

  it('공격 룰렛: 배율이 높을수록 데미지 증가 (상한 내)', () => {
    let base = createBattle(team, 'sea', save);
    base = beginSelect(base);
    // 충분히 큰 야생 HP로 상한 영향 제거
    base = { ...base, wild: base.wild.map((w) => ({ ...w, maxHp: 9999, hp: 9999 })) };
    // 급소·랜덤폭이 단일 샘플에 끼치는 영향을 평균으로 제거
    let sum1 = 0;
    let sum3 = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      sum1 += resolveRush(chooseMove(base, 0, 0), 1, 1).lastAttack!.dmg;
      sum3 += resolveRush(chooseMove(base, 0, 0), 1, 3).lastAttack!.dmg;
    }
    expect(sum3 / N).toBeGreaterThan((sum1 / N) * 2.5); // 평균 ~3배
  });

  it('Z기술은 일반기술 최대(×3, 캡적용)보다 강하다', () => {
    // 동일 조건(공격자·타입·방어)에서 Z(위력 zPower, 룰렛X·캡X) vs 일반(위력 120, ×3·캡O)
    const opts = {
      atk: 159, fill: 1, moveType: 'normal' as const,
      defenderTypes: ['normal'] as TypeName[], defenderDef: 90, grade: 5 as const,
    };
    const wildMaxHp = 500;
    const cap = Math.round(wildMaxHp * TUNING.wildDmgCapRatio);
    let normalSum = 0;
    let zSum = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      normalSum += Math.min(playerDamage({ ...opts, power: 120 }).dmg * 3, cap);
      zSum += playerDamage({ ...opts, power: TUNING.zPower }).dmg; // 캡 없음
    }
    expect(zSum / N).toBeGreaterThan(normalSum / N);
  });

  it('Z기술은 공격 룰렛을 건너뛴다', () => {
    let b = createBattle(team, 'grass', save);
    b = beginSelect(b);
    b = { ...b, zGauge: 100 };
    b = chooseZ(b, 0);
    b = afterRush(b, 1);
    expect(b.phase).toBe('attack'); // 룰렛 없이 바로 공격
  });

  it('방어 룰렛: ×0은 완전 방어(무피해), ×1은 피해', () => {
    let b = createBattle(team, 'grass', save);
    b = beginSelect(b);
    const before = b.player.map((p) => p.hp);
    let sawBlockLabel = false;
    let sawHit = false;
    // 회피(랜덤 5~20%)가 끼어들 수 있어 여러 번 돌려 불변식을 검증한다
    for (let i = 0; i < 40; i++) {
      // ×0: 피해는 항상 0 (회피로 라벨될 수는 있어도 피해 0은 불변)
      const blocked = resolveDefense({ ...b, phase: 'defRoulette' }, 0);
      expect(blocked.player.map((p) => p.hp)).toEqual(before);
      if (blocked.lastAttack?.blocked) sawBlockLabel = true;
      // ×1: 회피가 아니면 반드시 피해
      const hit = resolveDefense({ ...b, phase: 'defRoulette' }, 1);
      if (!hit.lastAttack?.dodged) {
        expect(hit.player.some((p, idx) => p.hp < before[idx])).toBe(true);
        sawHit = true;
      }
    }
    expect(sawBlockLabel).toBe(true); // 회피 아닌 완전방어가 최소 1회 (라벨 동작 확인)
    expect(sawHit).toBe(true);
  });

  it('룰렛 순환표 기대값 검증 (밸런스 보정 기준)', () => {
    const atkAvg = ATK_ROULETTE.reduce((a, b) => a + b, 0) / ATK_ROULETTE.length;
    const defAvg = DEF_ROULETTE.reduce((a, b) => a + b, 0) / DEF_ROULETTE.length;
    expect(atkAvg).toBeCloseTo(1.375, 2);
    expect(defAvg).toBeCloseTo(0.733, 2);
  });

  it('야생 전멸 + 포획 처리 후 스테이지 클리어', () => {
    let b = createBattle(team, 'grass', save);
    b = beginSelect(b);
    b = { ...b, wild: b.wild.map((w) => ({ ...w, hp: 1 })) };
    // 두 야생을 차례로 쓰러뜨린다
    while (b.wild.some((w) => w.hp > 0)) {
      b = chooseMove(b, 0, 0);
      b = resolveRush(b, 1);
      b = continueAfterAttack(b);
      while (b.phase === 'getChance') {
        b = finishCatch(b, { speciesId: b.wild[b.getChanceQueue[0]].speciesId, grade: 1, result: 'escaped' });
      }
      if (b.phase === 'defRoulette') b = resolveDefense(b, 1);
      if (b.phase === 'enemyAttack') b = continueAfterEnemyAttack(b);
    }
    expect(b.phase).toBe('stageClear');
    const next = advanceStage(b);
    expect(next.stage).toBe(2);
    expect(next.phase).toBe('intro');
    expect(next.wild.every((w) => w.hp > 0)).toBe(true);
  });

  it('보스 스테이지(3) 클리어 시 승리', () => {
    let b = createBattle(team, 'grass', save);
    b = advanceStage(advanceStage(b));
    expect(b.stage).toBe(STAGE_COUNT);
    b = beginSelect(b);
    b = { ...b, wild: b.wild.map((w) => ({ ...w, hp: 1 })) };
    while (b.wild.some((w) => w.hp > 0)) {
      b = chooseMove(b, 0, 0);
      b = resolveRush(b, 1);
      b = continueAfterAttack(b);
      while (b.phase === 'getChance') {
        b = finishCatch(b, { speciesId: b.wild[b.getChanceQueue[0]].speciesId, grade: 1, result: 'escaped' });
      }
      if (b.phase === 'defRoulette') b = resolveDefense(b, 1);
      if (b.phase === 'enemyAttack') b = continueAfterEnemyAttack(b);
    }
    expect(b.phase).toBe('victory');
  });

  it('Z기술은 게이지 100 필요, 사용 후 리셋', () => {
    let b = createBattle(team, 'grass', save);
    b = beginSelect(b);
    expect(chooseZ(b, 0).phase).toBe('selectMove'); // 게이지 부족 → 무시
    b = { ...b, zGauge: 100 };
    b = chooseZ(b, 0);
    expect(b.phase).toBe('rush');
    expect(b.pending?.isZ).toBe(true);
    b = resolveRush(b, 1);
    expect(b.zGauge).toBe(0);
    expect(b.zUsedCount).toBe(1);
  });

  it('메가진화는 메가 폼 보유 5성만, 코스당 1회', () => {
    const megaTeam: DiskInstance[] = [
      { speciesId: 6, grade: 5 },   // 리자몽 (메가 가능)
      { speciesId: 25, grade: 5 },  // 피카츄 (메가 불가)
    ];
    let b = createBattle(megaTeam, 'grass', save);
    b = beginSelect(b);
    expect(canMega(b, 0)).toBe(true);
    expect(canMega(b, 1)).toBe(false);
    b = chooseMega(b, 0);
    expect(b.phase).toBe('megaAnim');
    expect(b.player[0].mega).toBe(true);
    expect(b.megaUsed).toBe(true);
    expect(canMega(b, 0)).toBe(false);
  });

  it('낮은 등급 디스크는 메가진화 불가', () => {
    const b = beginSelect(createBattle([{ speciesId: 6, grade: 4 }, { speciesId: 25, grade: 1, rental: true }], 'grass', save));
    expect(canMega(b, 0)).toBe(false);
  });

  it('직접 조준: 지정한 야생을 때린다', () => {
    let b = createBattle(team, 'grass', save);
    b = beginSelect(b);
    b = setTarget(b, 1);
    expect(b.targetOverride).toBe(1);
    b = chooseMove(b, 0, 0);
    b = resolveRush(b, 1);
    expect(b.lastAttack?.targetIdx).toBe(1);
  });

  it('배틀 중 진화 적용: 종 교체 + 회복', () => {
    let b = createBattle(team, 'grass', save);
    const before = b.player[0];
    b = {
      ...b,
      player: b.player.map((p, i) => (i === 0 ? { ...p, hp: 1 } : p)),
      battleEvo: { monIdx: 0, fromId: 25, toId: 26 },
      phase: 'battleEvolution',
    };
    const after = applyBattleEvolution(b);
    expect(after.player[0].speciesId).toBe(26);
    expect(after.player[0].hp).toBeGreaterThan(1);
    expect(after.phase).toBe('selectMove');
    expect(getSpecies(26).ko).toBe('라이츄');
    expect(before.speciesId).toBe(25);
  });
});
