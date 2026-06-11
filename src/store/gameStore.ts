import { create } from 'zustand';
import { setSoundEnabled } from '../audio/sfx';
import {
  type BattleResult, type BattleState, type CatchOutcome,
  createBattle, getSpecies,
} from '../engine/battle';
import { rollGrade } from '../engine/catch';
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
  result: GameResult | null;

  setScreen: (s: Screen) => void;
  selectCourse: (c: CourseId) => void;
  startBattle: (team: DiskInstance[]) => void;
  setBattle: (b: BattleState) => void;
  recordCatchAttempt: (speciesId: number, success: boolean) => CatchOutcome;
  endBattle: () => void;
  applyEvolution: (ev: EvolutionEvent) => void;
  toggleSound: () => void;
}

const initialSave = loadSave();
setSoundEnabled(initialSave.settings.sound);

const uniq = (arr: number[]) => [...new Set(arr)];

export const useGame = create<GameStore>((set, get) => ({
  screen: 'title',
  save: initialSave,
  courseId: null,
  team: [],
  battle: null,
  result: null,

  setScreen: (screen) => set({ screen }),

  selectCourse: (courseId) => set({ courseId, screen: 'team' }),

  startBattle: (team) => {
    const { save, courseId } = get();
    if (!courseId) return;
    const battle = createBattle(team, courseId, save);
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
    set({ save: next, team, battle, result: null, screen: 'battle' });
  },

  setBattle: (battle) => set({ battle }),

  recordCatchAttempt: (speciesId, success) => {
    const { save } = get();
    const species = getSpecies(speciesId);
    if (!success) {
      return { speciesId, grade: 1, result: 'escaped' } as CatchOutcome;
    }
    const grade = rollGrade(species.rarity);
    const existing = save.disks[speciesId];
    let outcome: CatchOutcome;
    const disks = { ...save.disks };
    if (!existing) {
      disks[speciesId] = { grade, caughtAt: Date.now(), timesUsed: 0 };
      outcome = { speciesId, grade, result: 'new' };
    } else if (grade > existing.grade) {
      disks[speciesId] = { ...existing, grade };
      outcome = { speciesId, grade, result: 'gradeUp', prevGrade: existing.grade };
    } else {
      outcome = { speciesId, grade, result: 'dupe', prevGrade: existing.grade };
    }
    const next: SaveData = {
      ...save,
      disks,
      dex: { ...save.dex, caught: uniq([...save.dex.caught, speciesId]) },
      stats: { ...save.stats, catches: save.stats.catches + 1 },
    };
    saveSave(next);
    set({ save: next });
    return outcome;
  },

  endBattle: () => {
    const { battle, save, team } = get();
    if (!battle) return;
    const won = battle.phase === 'victory';
    const next: SaveData = {
      ...save,
      stats: {
        ...save.stats,
        battles: save.stats.battles + 1,
        wins: save.stats.wins + (won ? 1 : 0),
        zMovesUsed: save.stats.zMovesUsed + battle.zUsedCount,
      },
    };
    const result: GameResult = {
      won,
      courseId: battle.courseId,
      team,
      catchOutcomes: battle.catchOutcomes,
      zUsed: battle.zUsedCount,
      evolutions: won ? rollEvolutions(team, next) : [],
    };
    saveSave(next);
    set({ save: next, battle: null, result, screen: 'result' });
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
    };
    const next: SaveData = {
      ...save,
      disks,
      dex: {
        ...save.dex,
        seen: uniq([...save.dex.seen, ev.toId]),
        caught: uniq([...save.dex.caught, ev.toId]),
      },
    };
    saveSave(next);
    set({ save: next });
  },

  toggleSound: () => {
    const { save } = get();
    const next: SaveData = {
      ...save,
      settings: { ...save.settings, sound: !save.settings.sound },
    };
    setSoundEnabled(next.settings.sound);
    saveSave(next);
    set({ save: next });
  },
}));
