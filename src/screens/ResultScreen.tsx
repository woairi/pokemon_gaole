import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { DiskCard } from '../components/DiskCard';
import { EvolutionOverlay } from '../components/EvolutionOverlay';
import { StarGrade } from '../components/StarGrade';
import { getSpecies } from '../engine/battle';
import type { EvolutionEvent } from '../engine/events';
import { useGame } from '../store/gameStore';

export function ResultScreen() {
  const result = useGame((s) => s.result);
  const save = useGame((s) => s.save);
  const setScreen = useGame((s) => s.setScreen);
  const [evoQueue, setEvoQueue] = useState<EvolutionEvent[] | null>(null);

  useEffect(() => {
    if (result) setEvoQueue(result.evolutions);
  }, [result]);

  if (!result) return null;
  const catches = result.catchOutcomes.filter((c) => c.result !== 'escaped');
  const escaped = result.catchOutcomes.filter((c) => c.result === 'escaped');
  const currentEvo = evoQueue?.[0];

  return (
    <div className={`screen result result--${result.won ? 'win' : 'lose'}`}>
      <div className="result__banner">{result.won ? '🏆 코스 클리어!!' : '다음엔 이길 수 있어!'}</div>
      {!result.won && (
        <div className="result__stage">스테이지 {result.stageReached}까지 도달!</div>
      )}
      {!result.won && (
        <div className="result__stamps">
          🎫 참가 스탬프 +1 (모은 스탬프 {save.stats.stamps}/5)
          {save.pendingBoost && <div className="result__boost">🎁 다음 배틀에서 등급 UP 찬스!</div>}
        </div>
      )}

      {catches.length > 0 && (
        <div className="result__catches">
          <div className="result__section">잡은 포켓몬</div>
          <div className="result__disk-row">
            {catches.map((c, i) => (
              <div key={i} className="result__catch">
                <DiskCard speciesId={c.speciesId} grade={c.grade} />
                {c.result === 'new' && <span className="result__tag result__tag--new">NEW!</span>}
                {c.result === 'gradeUp' && (
                  <span className="result__tag result__tag--up">
                    그레이드 업! <StarGrade grade={c.prevGrade!} />→<StarGrade grade={c.grade} />
                  </span>
                )}
                {c.result === 'dupe' && <span className="result__tag">이미 보유</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {escaped.length > 0 && (
        <div className="result__escaped">
          {escaped.map((c, i) => (
            <div key={i}>{getSpecies(c.speciesId).ko}는 도망갔다…</div>
          ))}
        </div>
      )}

      {result.zUsed > 0 && <div className="result__z">Z기술 {result.zUsed}회 사용!</div>}

      <div className="result__buttons">
        <button
          type="button"
          className="big-btn"
          onClick={() => {
            sfx.click();
            setScreen('team');
          }}
        >
          한 번 더 배틀!
        </button>
        <button
          type="button"
          className="big-btn big-btn--secondary"
          onClick={() => {
            sfx.click();
            setScreen('menu');
          }}
        >
          메뉴로
        </button>
      </div>

      {currentEvo && (
        <EvolutionOverlay
          key={currentEvo.fromId}
          ev={currentEvo}
          onClose={() => setEvoQueue((q) => (q ? q.slice(1) : q))}
        />
      )}
    </div>
  );
}
