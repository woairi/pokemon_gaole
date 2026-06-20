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
  const [filter, setFilter] = useState<CourseId | 'all' | 'mega'>('all');
  const [uncaughtOnly, setUncaughtOnly] = useState(false);

  const caught = new Set(save.dex.caught);
  const seen = new Set(save.dex.seen);
  const shiny = new Set(save.dex.shiny);
  const species = allSpecies()
    .filter((sp) =>
      filter === 'all' ? true : filter === 'mega' ? !!sp.megaId : sp.courses.includes(filter)
    )
    .filter((sp) => !uncaughtOnly || !caught.has(sp.id))
    .sort((a, b) => a.id - b.id);
  const nextMilestone = BALL_MILESTONES.find((m) => caught.size < m.catches);
  // 메가 가능 종 수집 현황 (실제 폼은 도감에 없으므로 기본 종 기준)
  const megaSpecies = allSpecies().filter((sp) => sp.megaId);
  const megaCaught = megaSpecies.filter((sp) => caught.has(sp.id)).length;

  return (
    <div className="screen dex">
      <div className="screen-header">
        <button type="button" className="back-btn" onClick={() => setScreen('menu')}>
          ◀
        </button>
        <span>
          도감 — 잡았다 {caught.size} / {allSpecies().length}
          {shiny.size > 0 && <span className="dex__shiny-count"> · ✨{shiny.size}</span>}
        </span>
      </div>

      {filter !== 'mega' && nextMilestone && (
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
        <button
          type="button"
          className={`dex__filter${filter === 'mega' ? ' dex__filter--on' : ''}`}
          onClick={() => setFilter('mega')}
        >
          🔥 메가
        </button>
        <button
          type="button"
          className={`dex__filter${uncaughtOnly ? ' dex__filter--on' : ''}`}
          onClick={() => setUncaughtOnly((v) => !v)}
        >
          ❔ 안 잡은 것만
        </button>
      </div>

      {filter === 'mega' && (
        <div className="dex__milestone">
          🔥 메가진화 가능 종 {megaCaught} / {megaSpecies.length} 수집 — 5★ 디스크로 만들면
          배틀에서 메가진화!
        </div>
      )}

      <div className="dex__scroll">
        <div className="dex__grid">
          {species.map((sp) => {
            const isCaught = caught.has(sp.id);
            const isSeen = seen.has(sp.id);
            const courseEmojis = sp.courses
              .map((c) => COURSES.find((x) => x.id === c)?.emoji)
              .join('');
            const showMega = !!sp.megaId && (isCaught || isSeen);
            const isShiny = shiny.has(sp.id);
            return (
              <div
                key={sp.id}
                className={`dex__cell${showMega ? ' dex__cell--mega' : ''}${
                  isShiny ? ' dex__cell--shiny' : ''
                }`}
              >
                {showMega && <span className="dex__mega" title="메가진화 가능">🔥</span>}
                {isShiny && <span className="dex__shiny" title="색이 다른 포켓몬">✨</span>}
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
