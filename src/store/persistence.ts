import type { SaveData, SaveV1, SaveV2 } from '../types';

const KEY = 'pokemon-gaole-save';

export function defaultSave(): SaveV2 {
  return {
    version: 2,
    disks: {},
    dex: { seen: [], caught: [] },
    stats: { battles: 0, wins: 0, catches: 0, zMovesUsed: 0, stamps: 0 },
    settings: { sound: true, tutorialSeen: false },
    daily: { lastDate: null },
    pendingBoost: false,
  };
}

function v1ToV2(v1: SaveV1): SaveV2 {
  return {
    ...defaultSave(),
    disks: v1.disks,
    dex: v1.dex,
    stats: { ...v1.stats, stamps: 0 },
    settings: { sound: v1.settings.sound, tutorialSeen: v1.stats.battles > 0 },
  };
}

export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object' || !('version' in raw)) return defaultSave();
  const save = raw as { version: number };
  switch (save.version) {
    case 1:
      return v1ToV2(save as SaveV1);
    case 2:
      return save as SaveV2;
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

export function saveSave(save: SaveData): void {
  if (pending !== undefined) clearTimeout(pending);
  pending = window.setTimeout(() => {
    pending = undefined;
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch {
      // 저장 공간 부족 등 — 게임은 계속 진행
    }
  }, 250);
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
