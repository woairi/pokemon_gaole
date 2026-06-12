import type { DiskInstance, Grade, SaveData } from '../types';
import { getSpecies } from './battle';
import { chance, pickRandom } from './rng';

const EVOLUTION_CHANCE = 0.2;

export interface EvolutionEvent {
  fromId: number;
  toId: number;
  grade: Grade;
}

/** 승리 후 사용한 디스크(렌탈 제외) 중 진화 가능 종에게 20% 확률로 진화 찬스 */
export function rollEvolutions(team: DiskInstance[], save: SaveData): EvolutionEvent[] {
  const events: EvolutionEvent[] = [];
  const rolled = new Set<number>();
  for (const disk of team) {
    if (disk.rental) continue;
    // 같은 종이 두 번 출전해도 진화 이벤트는 1회만
    if (rolled.has(disk.speciesId)) continue;
    rolled.add(disk.speciesId);
    const species = getSpecies(disk.speciesId);
    if (!species.evolvesTo?.length) continue;
    const owned = save.disks[disk.speciesId];
    if (!owned) continue;
    if (chance(EVOLUTION_CHANCE)) {
      events.push({
        fromId: disk.speciesId,
        toId: pickRandom(species.evolvesTo),
        grade: owned.grade,
      });
    }
  }
  return events;
}
