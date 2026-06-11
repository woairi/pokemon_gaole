import type { CourseId, Rarity, SaveData } from '../types';

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
  unlockCatches: number; // 해금에 필요한 포획 수
}

const NORMAL_WEIGHTS: Record<Rarity, number> = { C: 45, B: 30, A: 17, S: 7, SS: 1 };

export const COURSES: Course[] = [
  {
    id: 'grass', ko: '풀숲 코스', emoji: '🌿', desc: '초보 트레이너에게 딱!',
    hpMult: 0.8, dmgMult: 0.7,
    bg: 'linear-gradient(160deg, #1b5e20, #4caf50 60%, #8bc34a)',
    rarityWeights: NORMAL_WEIGHTS, unlockCatches: 0,
  },
  {
    id: 'sea', ko: '바다 코스', emoji: '🌊', desc: '물 포켓몬이 가득!',
    hpMult: 1.0, dmgMult: 0.9,
    bg: 'linear-gradient(160deg, #01579b, #0288d1 60%, #4dd0e1)',
    rarityWeights: NORMAL_WEIGHTS, unlockCatches: 0,
  },
  {
    id: 'cave', ko: '동굴 코스', emoji: '⛰️', desc: '강한 포켓몬이 숨어있다!',
    hpMult: 1.2, dmgMult: 1.1,
    bg: 'linear-gradient(160deg, #311b92, #5e35b1 60%, #7e57c2)',
    rarityWeights: NORMAL_WEIGHTS, unlockCatches: 0,
  },
  {
    id: 'legend', ko: '전설 코스', emoji: '⚡', desc: '전설의 포켓몬에 도전!',
    hpMult: 1.6, dmgMult: 1.25,
    bg: 'linear-gradient(160deg, #b71c1c, #7b1fa2 60%, #283593)',
    rarityWeights: { C: 0, B: 0, A: 0, S: 30, SS: 70 }, unlockCatches: 10,
  },
];

export const getCourse = (id: CourseId) => COURSES.find((c) => c.id === id)!;

export const isCourseUnlocked = (course: Course, save: SaveData) =>
  save.dex.caught.length >= course.unlockCatches;
