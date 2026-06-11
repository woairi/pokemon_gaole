import type { SaveData, SaveV1 } from '../types';

const KEY = 'pokemon-gaole-save';

export function defaultSave(): SaveV1 {
  return {
    version: 1,
    disks: {},
    dex: { seen: [], caught: [] },
    stats: { battles: 0, wins: 0, catches: 0, zMovesUsed: 0 },
    settings: { sound: true },
  };
}

function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object' || !('version' in raw)) return defaultSave();
  const save = raw as { version: number };
  switch (save.version) {
    case 1:
      return save as SaveV1;
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
