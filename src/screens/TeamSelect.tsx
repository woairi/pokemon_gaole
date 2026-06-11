import { useState } from 'react';
import { sfx } from '../audio/sfx';
import { DiskCard } from '../components/DiskCard';
import { getCourse } from '../data/courses';
import { RENTALS, useGame } from '../store/gameStore';
import type { DiskInstance } from '../types';

export function TeamSelect() {
  const save = useGame((s) => s.save);
  const courseId = useGame((s) => s.courseId);
  const setScreen = useGame((s) => s.setScreen);
  const startBattle = useGame((s) => s.startBattle);
  const [selected, setSelected] = useState<DiskInstance[]>([]);

  const owned: DiskInstance[] = Object.entries(save.disks)
    .map(([id, d]) => ({ speciesId: +id, grade: d.grade }))
    .sort((a, b) => b.grade - a.grade || a.speciesId - b.speciesId);

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

  const course = courseId ? getCourse(courseId) : null;

  return (
    <div className="screen team-select">
      <div className="screen-header">
        <button type="button" className="back-btn" onClick={() => setScreen('course')}>
          ◀
        </button>
        <span>{course?.ko} — 포켓몬 2마리를 고르자! ({selected.length}/2)</span>
      </div>

      <div className="team-select__scroll">
        {owned.length > 0 && (
          <>
            <div className="team-select__section">내 디스크</div>
            <div className="disk-grid">
              {owned.map((d) => (
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
