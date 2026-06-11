import { useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { DiskCard } from '../components/DiskCard';
import { TypeBadge } from '../components/TypeBadge';
import { getCourse } from '../data/courses';
import { allSpecies, getSpecies } from '../engine/battle';
import { typeMultiplier } from '../engine/damage';
import { RENTALS, useGame } from '../store/gameStore';
import type { CourseId, DiskInstance, TypeName } from '../types';
import { artworkUrl } from '../utils/sprites';

type SortMode = 'grade' | 'dex' | 'recent';

const SORT_LABELS: Record<SortMode, string> = {
  grade: '⭐ 등급순',
  dex: '📕 도감순',
  recent: '🕐 최신순',
};

/** 코스에서 잘 싸울 디스크 점수: 등급 + 코스 출현 포켓몬 상대 평균 상성 */
function diskScore(disk: DiskInstance, courseId: CourseId): number {
  const species = getSpecies(disk.speciesId);
  const pool = allSpecies().filter((p) => p.courses.includes(courseId));
  if (!pool.length) return disk.grade;
  const avgMult =
    pool.reduce(
      (sum, enemy) =>
        sum + Math.max(...species.moves.map((m) => typeMultiplier(m.type, enemy.types))),
      0
    ) / pool.length;
  return disk.grade * 10 + avgMult * 8 + species.atk / 50;
}

export function TeamSelect() {
  const save = useGame((s) => s.save);
  const courseId = useGame((s) => s.courseId);
  const setScreen = useGame((s) => s.setScreen);
  const startBattle = useGame((s) => s.startBattle);
  const [selected, setSelected] = useState<DiskInstance[]>([]);
  const [sort, setSort] = useState<SortMode>('grade');
  const [typeFilter, setTypeFilter] = useState<TypeName | null>(null);

  const owned = useMemo(() => {
    const list = Object.entries(save.disks).map(([id, d]) => ({
      speciesId: +id,
      grade: d.grade,
      caughtAt: d.caughtAt,
    }));
    switch (sort) {
      case 'grade':
        return list.sort((a, b) => b.grade - a.grade || a.speciesId - b.speciesId);
      case 'dex':
        return list.sort((a, b) => a.speciesId - b.speciesId);
      case 'recent':
        return list.sort((a, b) => b.caughtAt - a.caughtAt);
    }
  }, [save.disks, sort]);

  // 컬렉션에 있는 타입만 필터 칩으로
  const ownedTypes = useMemo(() => {
    const types = new Set<TypeName>();
    for (const d of owned) for (const t of getSpecies(d.speciesId).types) types.add(t);
    return [...types];
  }, [owned]);

  const visible = typeFilter
    ? owned.filter((d) => getSpecies(d.speciesId).types.includes(typeFilter))
    : owned;

  const isSelected = (d: DiskInstance) =>
    selected.some((s) => s.speciesId === d.speciesId && s.rental === d.rental);

  const toggle = (d: DiskInstance) => {
    sfx.click();
    if (isSelected(d)) {
      setSelected(selected.filter((s) => !(s.speciesId === d.speciesId && s.rental === d.rental)));
    } else if (selected.length < 2) {
      setSelected([...selected, d]);
    }
  };

  // 코스 상성 + 등급 기준 자동 추천
  const recommend = () => {
    if (!courseId || owned.length === 0) return;
    sfx.fanfare();
    const best = [...owned]
      .sort((a, b) => diskScore(b, courseId) - diskScore(a, courseId))
      .slice(0, 2)
      .map((d) => ({ speciesId: d.speciesId, grade: d.grade }));
    if (best.length < 2) {
      best.push({ ...RENTALS[0] });
    }
    setSelected(best);
  };

  const course = courseId ? getCourse(courseId) : null;
  const showRentals = owned.length < 4;

  return (
    <div className="screen team-select">
      <div className="screen-header">
        <button type="button" className="back-btn" onClick={() => setScreen('course')}>
          ◀
        </button>
        <span>{course?.ko} — 2마리를 고르자!</span>
      </div>

      {/* 선택 슬롯 (고정) */}
      <div className="team-select__picks">
        {[0, 1].map((i) => {
          const pick = selected[i];
          return (
            <button
              type="button"
              key={i}
              className={`team-select__pick${pick ? ' team-select__pick--filled' : ''}`}
              onClick={() => pick && toggle(pick)}
            >
              {pick ? (
                <img src={artworkUrl(pick.speciesId)} alt="" draggable={false} />
              ) : (
                <span className="team-select__pick-q">{i + 1}</span>
              )}
            </button>
          );
        })}
        {owned.length >= 2 && (
          <button type="button" className="team-select__auto" onClick={recommend}>
            ✨ 추천!
          </button>
        )}
      </div>

      {/* 정렬·필터 (디스크가 많을 때 유용) */}
      {owned.length > 6 && (
        <div className="team-select__tools">
          <button
            type="button"
            className="team-select__sort"
            onClick={() => {
              sfx.click();
              const order: SortMode[] = ['grade', 'dex', 'recent'];
              setSort(order[(order.indexOf(sort) + 1) % order.length]);
            }}
          >
            {SORT_LABELS[sort]}
          </button>
          <div className="team-select__type-filters">
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
        </div>
      )}

      <div className="team-select__scroll">
        {owned.length > 0 && (
          <>
            <div className="team-select__section">
              내 디스크 ({visible.length}
              {typeFilter ? `/${owned.length}` : ''}장)
            </div>
            <div className="disk-grid">
              {visible.map((d) => (
                <DiskCard
                  key={d.speciesId}
                  speciesId={d.speciesId}
                  grade={d.grade}
                  selected={isSelected(d)}
                  onClick={() => toggle(d)}
                />
              ))}
            </div>
          </>
        )}
        {showRentals && (
          <>
            <div className="team-select__section">렌탈 포켓몬</div>
            <div className="disk-grid">
              {RENTALS.map((d) => (
                <DiskCard
                  key={`r-${d.speciesId}`}
                  speciesId={d.speciesId}
                  grade={d.grade}
                  rental
                  selected={isSelected(d)}
                  onClick={() => toggle(d)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className="big-btn"
        disabled={selected.length !== 2}
        onClick={() => {
          sfx.fanfare();
          startBattle(selected);
        }}
      >
        {selected.length === 2 ? '배틀 시작!!' : '2마리를 골라줘!'}
      </button>
    </div>
  );
}
