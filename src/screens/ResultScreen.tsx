import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { DiskCard } from '../components/DiskCard';
import { StarGrade } from '../components/StarGrade';
import { getSpecies } from '../engine/battle';
import type { EvolutionEvent } from '../engine/events';
import { useGame } from '../store/gameStore';
import { iGa } from '../utils/korean';
import { artworkUrl } from '../utils/sprites';

const ZONE_START = 0.35;
const ZONE_END = 0.65;

/** 진화 찬스 미니게임: 움직이는 커서를 초록 존에서 멈추면 진화 성공 */
function EvolutionOverlay({ ev, onClose }: { ev: EvolutionEvent; onClose: () => void }) {
  const applyEvolution = useGame((s) => s.applyEvolution);
  const from = getSpecies(ev.fromId);
  const to = getSpecies(ev.toId);
  const [stage, setStage] = useState<'prompt' | 'minigame' | 'evolving' | 'done' | 'failed'>(
    'prompt'
  );
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);

  useEffect(() => {
    if (stage === 'prompt') {
      const t = setTimeout(() => setStage('minigame'), 1600);
      return () => clearTimeout(t);
    }
    if (stage === 'minigame') {
      const start = performance.now();
      let raf = 0;
      const step = (now: number) => {
        const t = ((now - start) / 1200) % 1; // 1.2초 주기 삼각파
        const p = t < 0.5 ? t * 2 : (1 - t) * 2;
        posRef.current = p;
        setPos(p);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }
    if (stage === 'evolving') {
      sfx.evolve();
      applyEvolution(ev);
      const t = setTimeout(() => setStage('done'), 2600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // 타이밍 게임은 pointerdown(즉각 반응), 닫기는 click(탭 통과 방지)
  const onPointerDown = () => {
    if (stage !== 'minigame') return;
    const p = posRef.current;
    if (p >= ZONE_START && p <= ZONE_END) setStage('evolving');
    else {
      sfx.escape();
      setStage('failed');
    }
  };

  const onClick = () => {
    if (stage === 'done' || stage === 'failed') onClose();
  };

  return (
    <div className="evolution" onPointerDown={onPointerDown} onClick={onClick}>
      {stage === 'prompt' && (
        <div className="evolution__prompt">
          <img src={artworkUrl(ev.fromId)} alt={from.ko} draggable={false} />
          <div className="evolution__text">어라…? {from.ko}의 상태가…!</div>
        </div>
      )}

      {stage === 'minigame' && (
        <div className="evolution__game">
          <img className="evolution__glow" src={artworkUrl(ev.fromId)} alt={from.ko} draggable={false} />
          <div className="evolution__text">초록 칸에서 탭!</div>
          <div className="timing-bar">
            <div
              className="timing-bar__zone"
              style={{ left: `${ZONE_START * 100}%`, width: `${(ZONE_END - ZONE_START) * 100}%` }}
            />
            <div className="timing-bar__cursor" style={{ left: `${pos * 100}%` }} />
          </div>
        </div>
      )}

      {stage === 'evolving' && (
        <div className="evolution__flash">
          <img className="evolution__morph-from" src={artworkUrl(ev.fromId)} alt="" draggable={false} />
          <img className="evolution__morph-to" src={artworkUrl(ev.toId)} alt="" draggable={false} />
        </div>
      )}

      {stage === 'done' && (
        <div className="evolution__result">
          <img src={artworkUrl(ev.toId)} alt={to.ko} draggable={false} />
          <div className="evolution__text">
            축하합니다! {iGa(from.ko)} {to.ko}로 진화했다!!
          </div>
          <div className="tap-hint">화면을 터치!</div>
        </div>
      )}

      {stage === 'failed' && (
        <div className="evolution__result">
          <img src={artworkUrl(ev.fromId)} alt={from.ko} draggable={false} />
          <div className="evolution__text">진화하지 못했다… 다음에 다시 도전!</div>
          <div className="tap-hint">화면을 터치!</div>
        </div>
      )}
    </div>
  );
}

export function ResultScreen() {
  const result = useGame((s) => s.result);
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
      <div className="result__banner">{result.won ? '🏆 승리!!' : '다음엔 이길 수 있어!'}</div>

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
