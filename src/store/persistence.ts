import type { SaveData, SaveV1, SaveV2, SaveV3, SaveV4 } from '../types';

const KEY = 'pokemon-gaole-save';

export function defaultSave(): SaveV4 {
  return {
    version: 4,
    disks: {},
    dex: { seen: [], caught: [], shiny: [] },
    stats: {
      battles: 0, wins: 0, catches: 0, zMovesUsed: 0,
      stamps: 0, championClears: 0, shinyCatches: 0,
    },
    settings: { volume: 2, tutorialSeen: false },
    daily: { lastDate: null },
    pendingBoost: false,
    teamPresets: [],
  };
}

function v1ToV2(v1: SaveV1): SaveV2 {
  return {
    version: 2,
    disks: v1.disks,
    dex: v1.dex,
    stats: { ...v1.stats, stamps: 0 },
    settings: { sound: v1.settings.sound, tutorialSeen: v1.stats.battles > 0 },
    daily: { lastDate: null },
    pendingBoost: false,
  };
}

function v2ToV3(v2: SaveV2): SaveV3 {
  return {
    version: 3,
    disks: v2.disks,
    dex: v2.dex,
    stats: { ...v2.stats, championClears: 0 },
    settings: v2.settings,
    daily: v2.daily,
    pendingBoost: v2.pendingBoost,
    teamPresets: [],
  };
}

function v3ToV4(v3: SaveV3): SaveV4 {
  return {
    ...defaultSave(),
    disks: v3.disks,
    dex: { ...v3.dex, shiny: [] },
    stats: { ...v3.stats, shinyCatches: 0 },
    settings: { volume: v3.settings.sound ? 2 : 0, tutorialSeen: v3.settings.tutorialSeen },
    daily: v3.daily,
    pendingBoost: v3.pendingBoost,
    teamPresets: v3.teamPresets,
  };
}

export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object' || !('version' in raw)) return defaultSave();
  const save = raw as { version: number };
  switch (save.version) {
    case 1:
      return v3ToV4(v2ToV3(v1ToV2(save as SaveV1)));
    case 2:
      return v3ToV4(v2ToV3(save as SaveV2));
    case 3:
      return v3ToV4(save as SaveV3);
    case 4:
      return save as SaveV4;
    default:
      return defaultSave();
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

let pending: number | undefined;
let latest: SaveData | null = null;

function flush() {
  if (latest === null) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(latest));
  } catch {
    // 저장 공간 부족 등 — 게임은 계속 진행
  }
  latest = null;
  if (pending !== undefined) {
    clearTimeout(pending);
    pending = undefined;
  }
}

export function saveSave(save: SaveData): void {
  latest = save;
  if (pending !== undefined) clearTimeout(pending);
  pending = window.setTimeout(() => {
    pending = undefined;
    flush();
  }, 250);
}

// 앱 전환/종료 시 디바운스 대기 중인 저장을 즉시 기록 (모바일에서 기록 유실 방지)
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
}

/** 백업 코드 생성 (한글 안전 base64) */
export function exportSave(save: SaveData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(save))));
}

/** 백업 코드 복원. 실패 시 null */
export function importSave(code: string): SaveData | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed)) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}
