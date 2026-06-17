import type { CourseId, PokemonData, Rarity, SaveData } from '../types';

export interface Course {
  id: CourseId;
  ko: string;
  emoji: string;
  desc: string;
  hpMult: number;
  dmgMult: number;
  /** 코스 배경 그라데이션 */
  bg: string;
  rarityWeights: Record<Rarity, number>;
  /** 보스(마지막) 스테이지 출현 가중치 */
  bossWeights: Record<Rarity, number>;
  unlockCatches: number; // 해금에 필요한 포획 수
  /** 야생 풀: 전체 종 목록에서 이 코스에 나올 포켓몬을 고른다 */
  pool: (all: PokemonData[]) => PokemonData[];
}

const NORMAL_WEIGHTS: Record<Rarity, number> = { C: 45, B: 30, A: 17, S: 7, SS: 1 };
const BOSS_WEIGHTS: Record<Rarity, number> = { C: 10, B: 25, A: 35, S: 22, SS: 8 };
const HIGH_WEIGHTS: Record<Rarity, number> = { C: 0, B: 0, A: 0, S: 30, SS: 70 };
const HIGH_BOSS_WEIGHTS: Record<Rarity, number> = { C: 0, B: 0, A: 0, S: 20, SS: 80 };
const CHAMPION_WEIGHTS: Record<Rarity, number> = { C: 0, B: 0, A: 10, S: 45, SS: 45 };
const CHAMPION_BOSS: Record<Rarity, number> = { C: 0, B: 0, A: 0, S: 25, SS: 75 };

const byTag = (id: CourseId) => (all: PokemonData[]) => all.filter((p) => p.courses.includes(id));

export const COURSES: Course[] = [
  {
    id: 'grass', ko: '풀숲 코스', emoji: '🌿', desc: '초보 트레이너에게 딱!',
    hpMult: 1.5, dmgMult: 0.52,
    bg: 'linear-gradient(160deg, #1b5e20, #4caf50 60%, #8bc34a)',
    rarityWeights: NORMAL_WEIGHTS, bossWeights: BOSS_WEIGHTS, unlockCatches: 0,
    pool: byTag('grass'),
  },
  {
    id: 'sea', ko: '바다 코스', emoji: '🌊', desc: '물 포켓몬이 가득!',
    hpMult: 1.95, dmgMult: 0.75,
    bg: 'linear-gradient(160deg, #01579b, #0288d1 60%, #4dd0e1)',
    rarityWeights: NORMAL_WEIGHTS, bossWeights: BOSS_WEIGHTS, unlockCatches: 0,
    pool: byTag('sea'),
  },
  {
    id: 'cave', ko: '동굴 코스', emoji: '⛰️', desc: '강한 포켓몬이 숨어있다!',
    hpMult: 2.35, dmgMult: 0.93,
    bg: 'linear-gradient(160deg, #311b92, #5e35b1 60%, #7e57c2)',
    rarityWeights: NORMAL_WEIGHTS, bossWeights: BOSS_WEIGHTS, unlockCatches: 0,
    pool: byTag('cave'),
  },
  {
    id: 'sky', ko: '하늘 코스', emoji: '✈️', desc: '비행·드래곤 포켓몬의 영역!',
    hpMult: 2.5, dmgMult: 1.0,
    bg: 'linear-gradient(160deg, #4a148c, #5c6bc0 55%, #80deea)',
    rarityWeights: NORMAL_WEIGHTS, bossWeights: BOSS_WEIGHTS, unlockCatches: 8,
    pool: (all) => all.filter((p) => p.types.includes('flying') || p.types.includes('dragon')),
  },
  {
    id: 'legend', ko: '전설 코스', emoji: '⚡', desc: '전설의 포켓몬에 도전!',
    hpMult: 3.1, dmgMult: 1.2,
    bg: 'linear-gradient(160deg, #b71c1c, #7b1fa2 60%, #283593)',
    rarityWeights: HIGH_WEIGHTS, bossWeights: HIGH_BOSS_WEIGHTS, unlockCatches: 10,
    pool: byTag('legend'),
  },
  {
    id: 'champion', ko: '챔피언 코스', emoji: '🏆', desc: '최강의 트레이너에게! 강자만 출현',
    hpMult: 3.6, dmgMult: 1.35,
    bg: 'linear-gradient(160deg, #4e342e, #c62828 50%, #f9a825)',
    rarityWeights: CHAMPION_WEIGHTS, bossWeights: CHAMPION_BOSS, unlockCatches: 30,
    pool: (all) => all.filter((p) => p.rarity === 'S' || p.rarity === 'SS'),
  },
];

export const getCourse = (id: CourseId) => COURSES.find((c) => c.id === id)!;

export const isCourseUnlocked = (course: Course, save: SaveData) =>
  save.dex.caught.length >= course.unlockCatches;

/** 도감 포획 수 + 챔피언 클리어로 정해지는 트레이너 칭호 */
export function trainerTitle(save: SaveData): string {
  if (save.stats.championClears > 0) return '🏆 챔피언';
  const caught = save.dex.caught.length;
  if (caught >= 150) return '포켓몬 마스터';
  if (caught >= 100) return '에이스 트레이너';
  if (caught >= 50) return '베테랑 트레이너';
  if (caught >= 20) return '중급 트레이너';
  return '새내기 트레이너';
}
