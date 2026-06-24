import { create } from 'zustand';
import { setCriesEnabled, setVolume } from '../audio/sfx';
import {
  type BattleResult, type BattleState, type CatchOutcome,
  createBattle, getSpecies,
} from '../engine/battle';
import { rollGrade } from '../engine/catch';
import type { Volume } from '../types';
import { type EvolutionEvent, rollEvolutions } from '../engine/events';
import type { CourseId, DiskInstance, SaveData, Screen } from '../types';
import { loadSave, saveSave } from './persistence';

/** 디스크가 2개 미만일 때 쓸 수 있는 렌탈 포켓몬 */
export const RENTALS: DiskInstance[] = [25, 1, 4, 7].map((speciesId) => ({
  speciesId,
  grade: 1,
  rental: true,
}));

export interface GameResult extends BattleResult {
  evolutions: EvolutionEvent[];
}

interface GameStore {
  screen: Screen;
  save: SaveData;
  courseId: CourseId | null;
  team: DiskInstance[];
  battle: BattleState | null;
  /** 이번 배틀의 등급 UP 찬스 출처 — 첫 포획 성공 시 소모 처리 */
  boostSource: 'daily' | 'stamp' | null;
  /** 연속 포획 실패 횟수 — 다음 포획 확률을 올려준다(자비 보정). 성공 시 0으로 */
  catchMisses: number;
  result: GameResult | null;

  setScreen: (s: Screen) => void;
  selectCourse: (c: CourseId) => void;
  startBattle: (team: DiskInstance[]) => void;
  setBattle: (b: BattleState) => void;
  markSeen: (ids: number[]) => void;
  recordCatchAttempt: (speciesId: number, success: boolean, shiny?: boolean) => CatchOutcome;
  endBattle: () => void;
  applyEvolution: (ev: EvolutionEvent) => void;
  setVolume: (v: Volume) => void;
  cycleVolume: () => void;
  toggleCries: () => void;
  markTutorialSeen: () => void;
  replaceSave: (save: SaveData) => void;
  saveTeamPreset: (speciesIds: number[]) => void;
  deleteTeamPreset: (index: number) => void;
}

const MAX_PRESETS = 4;

const today = () => new Date().toLocaleDateString('sv'); // YYYY-MM-DD (로컬)

const initialSave = loadSave();
setVolume(initialSave.settings.volume);
setCriesEnabled(initialSave.settings.cries);

const uniq = (arr: number[]) => [...new Set(arr)];

export const useGame = create<GameStore>((set, get) => ({
  screen: 'title',
  save: initialSave,
  courseId: null,
  team: [],
  battle: null,
  boostSource: null,
  catchMisses: 0,
  result: null,

  setScreen: (screen) => set({ screen }),

  selectCourse: (courseId) => set({ courseId, screen: 'team' }),

  startBattle: (team) => {
    const { save, courseId } = get();
    if (!courseId) return;
    // 오늘 첫 배틀 또는 참가 스탬프 5개 교환 → 등급 UP 찬스
    // (보너스 소모는 첫 포획 성공 시점에 기록 — 중도 이탈해도 낭비되지 않게)
    const dailyBonus = save.daily.lastDate !== today();
    const gradeBoost = dailyBonus || save.pendingBoost;
    const boostSource = dailyBonus ? ('daily' as const) : save.pendingBoost ? ('stamp' as const) : null;
    const battle = createBattle(team, courseId, save, gradeBoost);
    const next: SaveData = {
      ...save,
      disks: { ...save.disks },
      dex: {
        ...save.dex,
        seen: uniq([...save.dex.seen, ...battle.wild.map((w) => w.speciesId)]),
      },
    };
    for (const d of team) {
      if (!d.rental && next.disks[d.speciesId]) {
        next.disks[d.speciesId] = {
          ...next.disks[d.speciesId],
          timesUsed: next.disks[d.speciesId].timesUsed + 1,
        };
      }
    }
    saveSave(next);
    set({ save: next, team, battle, boostSource, result: null, screen: 'battle' });
  },

  setBattle: (battle) => set({ battle }),

  markSeen: (ids) => {
    const { save } = get();
    const next: SaveData = {
      ...save,
      dex: { ...save.dex, seen: uniq([...save.dex.seen, ...ids]) },
    };
    saveSave(next);
    set({ save: next });
  },

  recordCatchAttempt: (speciesId, success, shiny = false) => {
    const { save, battle, boostSource, catchMisses } = get();
    const species = getSpecies(speciesId);
    if (!success) {
      // 실패하면 다음 포획 확률이 조금씩 올라간다 (자비 보정)
      set({ catchMisses: catchMisses + 1 });
      return { speciesId, grade: 1, result: 'escaped' } as CatchOutcome;
    }
    const grade = rollGrade(species.rarity, battle?.gradeBoost);
    // 등급 UP 찬스 실제 사용 시점에 소모 기록 (배틀 내내 유효, 기록은 1회)
    let boostConsumed: Partial<SaveData> = {};
    if (battle?.gradeBoost && boostSource) {
      boostConsumed =
        boostSource === 'daily' ? { daily: { lastDate: today() } } : { pendingBoost: false };
      set({ boostSource: null });
    }
    const existing = save.disks[speciesId];
    // 샤이니는 한 번이라도 잡으면 디스크에 영구 표시 (이후 일반 개체로 안 사라짐)
    const keepShiny = shiny || existing?.shiny;
    let outcome: CatchOutcome;
    const disks = { ...save.disks };
    if (!existing) {
      disks[speciesId] = { grade, caughtAt: Date.now(), timesUsed: 0, shiny: keepShiny };
      outcome = { speciesId, grade, result: 'new', shiny };
    } else if (grade > existing.grade) {
      disks[speciesId] = { ...existing, grade, shiny: keepShiny };
      outcome = { speciesId, grade, result: 'gradeUp', prevGrade: existing.grade, shiny };
    } else {
      disks[speciesId] = { ...existing, shiny: keepShiny };
      outcome = { speciesId, grade, result: 'dupe', prevGrade: existing.grade, shiny };
    }
    const next: SaveData = {
      ...save,
      ...boostConsumed,
      disks,
      dex: {
        ...save.dex,
        caught: uniq([...save.dex.caught, speciesId]),
        shiny: shiny ? uniq([...save.dex.shiny, speciesId]) : save.dex.shiny,
      },
      stats: {
        ...save.stats,
        catches: save.stats.catches + 1,
        shinyCatches: save.stats.shinyCatches + (shiny ? 1 : 0),
      },
    };
    saveSave(next);
    set({ save: next, catchMisses: 0 });
    return outcome;
  },

  endBattle: () => {
    const { battle, save, team } = get();
    if (!battle) return;
    const won = battle.phase === 'victory';
    // 패배 시 참가 스탬프 +1, 5개 모이면 다음 배틀 등급 UP 찬스로 교환
    let stamps = save.stats.stamps + (won ? 0 : 1);
    let pendingBoost = save.pendingBoost;
    // 이미 대기 중인 찬스가 있으면 스탬프를 아껴둔다
    if (stamps >= 5 && !pendingBoost) {
      stamps -= 5;
      pendingBoost = true;
    }
    const championClear = won && battle.courseId === 'champion';
    const next: SaveData = {
      ...save,
      pendingBoost,
      stats: {
        ...save.stats,
        battles: save.stats.battles + 1,
        wins: save.stats.wins + (won ? 1 : 0),
        zMovesUsed: save.stats.zMovesUsed + battle.zUsedCount,
        stamps,
        championClears: save.stats.championClears + (championClear ? 1 : 0),
      },
    };
    const result: GameResult = {
      won,
      courseId: battle.courseId,
      stageReached: battle.stage,
      team,
      catchOutcomes: battle.catchOutcomes,
      zUsed: battle.zUsedCount,
      evolutions: won ? rollEvolutions(team, next) : [],
    };
    saveSave(next);
    set({ save: next, battle: null, result, screen: 'result' });
  },

  markTutorialSeen: () => {
    const { save } = get();
    const next: SaveData = {
      ...save,
      settings: { ...save.settings, tutorialSeen: true },
    };
    saveSave(next);
    set({ save: next });
  },

  replaceSave: (save) => {
    setVolume(save.settings.volume);
    setCriesEnabled(save.settings.cries);
    saveSave(save);
    set({ save });
  },

  toggleCries: () => {
    const { save } = get();
    const cries = !save.settings.cries;
    const next: SaveData = { ...save, settings: { ...save.settings, cries } };
    setCriesEnabled(cries);
    saveSave(next);
    set({ save: next });
  },

  saveTeamPreset: (speciesIds) => {
    const { save } = get();
    const key = [...speciesIds].sort((a, b) => a - b).join(',');
    // 같은 조합은 중복 저장하지 않음
    if (save.teamPresets.some((p) => [...p].sort((a, b) => a - b).join(',') === key)) return;
    const teamPresets = [speciesIds, ...save.teamPresets].slice(0, MAX_PRESETS);
    const next: SaveData = { ...save, teamPresets };
    saveSave(next);
    set({ save: next });
  },

  deleteTeamPreset: (index) => {
    const { save } = get();
    const teamPresets = save.teamPresets.filter((_, i) => i !== index);
    const next: SaveData = { ...save, teamPresets };
    saveSave(next);
    set({ save: next });
  },

  applyEvolution: (ev) => {
    const { save } = get();
    const disks = { ...save.disks };
    const from = disks[ev.fromId];
    if (!from) return;
    delete disks[ev.fromId];
    const existing = disks[ev.toId];
    disks[ev.toId] = {
      grade: existing ? (Math.max(existing.grade, ev.grade) as typeof ev.grade) : ev.grade,
      caughtAt: existing?.caughtAt ?? Date.now(),
      timesUsed: existing?.timesUsed ?? from.timesUsed,
      // 샤이니 디스크가 진화하면 진화체도 샤이니로 (둘 중 하나라도 샤이니면 유지)
      shiny: existing?.shiny || from.shiny,
    };
    const evolvedShiny = disks[ev.toId].shiny;
    const next: SaveData = {
      ...save,
      disks,
      dex: {
        ...save.dex,
        seen: uniq([...save.dex.seen, ev.toId]),
        caught: uniq([...save.dex.caught, ev.toId]),
        shiny: evolvedShiny ? uniq([...save.dex.shiny, ev.toId]) : save.dex.shiny,
      },
    };
    saveSave(next);
    set({ save: next });
  },

  setVolume: (volume) => {
    const { save } = get();
    const next: SaveData = { ...save, settings: { ...save.settings, volume } };
    setVolume(volume);
    saveSave(next);
    set({ save: next });
  },

  cycleVolume: () => {
    const { save } = get();
    const volume = (((save.settings.volume + 1) % 3) as Volume); // 끄기→작게→크게→끄기
    const next: SaveData = { ...save, settings: { ...save.settings, volume } };
    setVolume(volume);
    saveSave(next);
    set({ save: next });
  },
}));
