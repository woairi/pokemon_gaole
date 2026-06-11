export type TypeName =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export type Rarity = 'C' | 'B' | 'A' | 'S' | 'SS';
export type CourseId = 'grass' | 'sea' | 'cave' | 'legend';
export type Grade = 1 | 2 | 3 | 4 | 5;

export interface MoveData {
  id: number;
  ko: string;
  type: TypeName;
  power: number;
}

export interface PokemonData {
  id: number;
  ko: string;
  types: TypeName[];
  hp: number;
  atk: number;
  def: number;
  spd: number;
  moves: MoveData[];
  rarity: Rarity;
  courses: CourseId[];
  evolvesTo?: number[];
  /** showdown GIF가 없어 배틀에서도 아트워크를 써야 하는 경우 */
  noGif?: boolean;
  /** 메가진화 폼의 도감 id (있으면 5성 디스크가 메가진화 가능) */
  megaId?: number;
  /** 메가 폼 백스프라이트 GIF가 없는 경우 */
  megaNoBack?: boolean;
}

export type Pokedex = Record<string, PokemonData>;

export interface TypeChart {
  ko: Record<TypeName, string>;
  chart: Record<TypeName, Partial<Record<TypeName, number>>>;
}

/** 배틀에 출전하는 디스크 한 장 */
export interface DiskInstance {
  speciesId: number;
  grade: Grade;
  rental?: boolean;
}

export interface OwnedDisk {
  grade: Grade;
  caughtAt: number;
  timesUsed: number;
}

export interface SaveV1 {
  version: 1;
  disks: Record<number, OwnedDisk>;
  dex: { seen: number[]; caught: number[] };
  stats: { battles: number; wins: number; catches: number; zMovesUsed: number };
  settings: { sound: boolean };
}

export interface SaveV2 {
  version: 2;
  disks: Record<number, OwnedDisk>;
  dex: { seen: number[]; caught: number[] };
  stats: {
    battles: number;
    wins: number;
    catches: number;
    zMovesUsed: number;
    /** 패배 시 받는 참가 스탬프 (5개 = 등급 UP 찬스 1회) */
    stamps: number;
  };
  settings: { sound: boolean; tutorialSeen: boolean };
  /** 오늘 첫 배틀 보너스 추적 (YYYY-MM-DD) */
  daily: { lastDate: string | null };
  /** 스탬프 5개로 얻은 등급 UP 찬스 대기 중 */
  pendingBoost: boolean;
}

export type SaveData = SaveV2;

export type Screen =
  | 'title' | 'menu' | 'course' | 'team'
  | 'battle' | 'result' | 'collection' | 'dex';
