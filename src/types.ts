export type TypeName =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export type Rarity = 'C' | 'B' | 'A' | 'S' | 'SS';
export type CourseId = 'grass' | 'sea' | 'cave' | 'legend' | 'sky' | 'champion';
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
  shiny?: boolean;
}

export interface OwnedDisk {
  grade: Grade;
  caughtAt: number;
  timesUsed: number;
  /** 색이 다른 포켓몬(샤이니) 보유 여부 */
  shiny?: boolean;
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

/** 즐겨찾기 팀 프리셋: 출전했던 2마리의 종 id */
export type TeamPreset = number[];

export interface SaveV3 {
  version: 3;
  disks: Record<number, OwnedDisk>;
  dex: { seen: number[]; caught: number[] };
  stats: {
    battles: number;
    wins: number;
    catches: number;
    zMovesUsed: number;
    stamps: number;
    /** 챔피언 코스 클리어 횟수 (명예의 전당) */
    championClears: number;
  };
  settings: { sound: boolean; tutorialSeen: boolean };
  daily: { lastDate: string | null };
  pendingBoost: boolean;
  /** 즐겨찾기 팀 프리셋 (최대 4개) */
  teamPresets: TeamPreset[];
}

/** 0=끄기, 1=작게, 2=크게 */
export type Volume = 0 | 1 | 2;

export interface SaveV4 {
  version: 4;
  disks: Record<number, OwnedDisk>;
  dex: { seen: number[]; caught: number[]; shiny: number[] };
  stats: {
    battles: number;
    wins: number;
    catches: number;
    zMovesUsed: number;
    stamps: number;
    championClears: number;
    /** 잡은 샤이니 누적 수 */
    shinyCatches: number;
  };
  settings: { volume: Volume; tutorialSeen: boolean };
  daily: { lastDate: string | null };
  pendingBoost: boolean;
  teamPresets: TeamPreset[];
}

export interface SaveV5 {
  version: 5;
  disks: Record<number, OwnedDisk>;
  dex: { seen: number[]; caught: number[]; shiny: number[] };
  stats: {
    battles: number;
    wins: number;
    catches: number;
    zMovesUsed: number;
    stamps: number;
    championClears: number;
    /** 잡은 샤이니 누적 수 */
    shinyCatches: number;
  };
  /** cries = 포켓몬 울음소리 (효과음·BGM과 별개로 켜고 끔) */
  settings: { volume: Volume; cries: boolean; tutorialSeen: boolean };
  daily: { lastDate: string | null };
  pendingBoost: boolean;
  teamPresets: TeamPreset[];
}

export type SaveData = SaveV5;

export type Screen =
  | 'title' | 'menu' | 'course' | 'team'
  | 'battle' | 'result' | 'collection' | 'dex' | 'typechart';
