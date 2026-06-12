import { useState } from 'react';
import { COURSES } from '../data/courses';
import { allSpecies } from '../engine/battle';
import { BALL_MILESTONES } from '../engine/catch';
import { useGame } from '../store/gameStore';
import type { CourseId } from '../types';
import { thumbUrl } from '../utils/sprites';

export function DexScreen() {
  const save = useGame((s) => s.save);
  const setScreen = useGame((s) => s.setScreen);
  const [filter, setFilter] = useState<CourseId | 'all'>('all');

  const species = allSpecies()
    .filter((sp) => filter === 'all' || sp.courses.includes(filter))
    .sort((a, b) => a.id - b.id);
  const caught = new Set(save.dex.caught);
  const seen = new Set(save.dex.seen);
  const nextMilestone = BALL_MILESTONES.find((m) => caught.size < m.catches);

  return (
    <div className="screen dex">
      <div className="screen-header">
        <button type="button" className="back-btn" onClick={() => setScreen('menu')}>
          ◀
        </button>
        <span>
          도감 — 잡았다 {caught.size} / {allSpecies().length}
        </span>
      </div>

      {nextMilestone && (
        <div className="dex__milestone">
          🎯 {nextMilestone.catches}마리 잡으면 {nextMilestone.desc} (앞으로{' '}
          {nextMilestone.catches - caught.size}마리)
        </div>
      )}

      <div className="dex__filters">
        <button
          type="button"
          className={`dex__filter${filter === 'all' ? ' dex__filter--on' : ''}`}
          onClick={() => setFilter('all')}
        >
          전체
        </button>
        {COURSES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`dex__filter${filter === c.id ? ' dex__filter--on' : ''}`}
            onClick={() => setFilter(c.id)}
          >
            {c.emoji} {c.ko.replace(' 코스', '')}
          </button>
        ))}
      </div>

      <div className="dex__scroll">
        <div className="dex__grid">
          {species.map((sp) => {
            const isCaught = caught.has(sp.id);
            const isSeen = seen.has(sp.id);
            const courseEmojis = sp.courses
              .map((c) => COURSES.find((x) => x.id === c)?.emoji)
              .join('');
            return (
              <div key={sp.id} className="dex__cell">
                {isCaught || isSeen ? (
                  <img
                    className={`dex__img${!isCaught ? ' dex__img--silhouette' : ''}`}
                    src={thumbUrl(sp.id)}
                    alt={isCaught ? sp.ko : '???'}
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <div className="dex__unknown">?</div>
                )}
                <div className="dex__name">{isCaught ? sp.ko : isSeen ? '???' : ''}</div>
                <div className="dex__no">
                  No.{sp.id} {courseEmojis}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
