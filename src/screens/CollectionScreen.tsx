import { useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { DiskCard } from '../components/DiskCard';
import { DiskDetailModal } from '../components/DiskDetailModal';
import { EvolutionOverlay } from '../components/EvolutionOverlay';
import { TypeBadge } from '../components/TypeBadge';
import { getSpecies } from '../engine/battle';
import type { EvolutionEvent } from '../engine/events';
import type { TypeName } from '../types';
import { useGame } from '../store/gameStore';

type SortMode = 'grade' | 'dex' | 'recent';

const SORT_LABELS: Record<SortMode, string> = {
  grade: '⭐ 등급순',
  dex: '📕 도감순',
  recent: '🕐 최신순',
};

export function CollectionScreen() {
  const save = useGame((s) => s.save);
  const setScreen = useGame((s) => s.setScreen);
  const [detail, setDetail] = useState<number | null>(null);
  const [evo, setEvo] = useState<EvolutionEvent | null>(null);
  const [sort, setSort] = useState<SortMode>('grade');
  const [typeFilter, setTypeFilter] = useState<TypeName | null>(null);

  const owned = useMemo(() => {
    const list = Object.entries(save.disks).map(([id, d]) => ({ speciesId: +id, ...d }));
    switch (sort) {
      case 'grade':
        return list.sort((a, b) => b.grade - a.grade || a.speciesId - b.speciesId);
      case 'dex':
        return list.sort((a, b) => a.speciesId - b.speciesId);
      case 'recent':
        return list.sort((a, b) => b.caughtAt - a.caughtAt);
    }
  }, [save.disks, sort]);

  const ownedTypes = useMemo(() => {
    const types = new Set<TypeName>();
    for (const d of owned) for (const t of getSpecies(d.speciesId).types) types.add(t);
    return [...types];
  }, [owned]);

  const visible = typeFilter
    ? owned.filter((d) => getSpecies(d.speciesId).types.includes(typeFilter))
    : owned;

  return (
    <div className="screen collection">
      <div className="screen-header">
        <button type="button" className="back-btn" onClick={() => setScreen('menu')}>
          ◀
        </button>
        <span>내 디스크 ({owned.length}장)</span>
        {owned.length > 1 && (
          <button
            type="button"
            className="collection__sort"
            onClick={() => {
              sfx.click();
              const order: SortMode[] = ['grade', 'dex', 'recent'];
              setSort(order[(order.indexOf(sort) + 1) % order.length]);
            }}
          >
            {SORT_LABELS[sort]}
          </button>
        )}
      </div>
      {owned.length > 6 && (
        <div className="dex__filters">
          <button
            type="button"
            className={`dex__filter${typeFilter === null ? ' dex__filter--on' : ''}`}
            onClick={() => setTypeFilter(null)}
          >
            전체
          </button>
          {ownedTypes.map((t) => (
            <button
              key={t}
              type="button"
              className={`team-select__type-chip${typeFilter === t ? ' team-select__type-chip--on' : ''}`}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
            >
              <TypeBadge type={t} small />
            </button>
          ))}
        </div>
      )}

      {owned.length === 0 ? (
        <div className="collection__empty">
          아직 디스크가 없어요.
          <br />
          배틀에서 포켓몬을 잡아 디스크를 모으자!
        </div>
      ) : (
        <div className="collection__scroll">
          <div className="disk-grid">
            {visible.map((d) => (
              <DiskCard
                key={d.speciesId}
                speciesId={d.speciesId}
                grade={d.grade}
                onClick={() => setDetail(d.speciesId)}
              />
            ))}
          </div>
        </div>
      )}

      {detail !== null && save.disks[detail] && (
        <DiskDetailModal
          speciesId={detail}
          disk={save.disks[detail]}
          onClose={() => setDetail(null)}
          onEvolve={(toId) => {
            // 디스크 상세를 닫고 진화 미니게임 시작 (등급 유지)
            setEvo({ fromId: detail, toId, grade: save.disks[detail].grade });
            setDetail(null);
          }}
        />
      )}

      {evo && <EvolutionOverlay ev={evo} onClose={() => setEvo(null)} />}
    </div>
  );
}
