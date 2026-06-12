import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { haptic } from '../utils/haptics';

interface Props {
  mode: 'attack' | 'defense';
  /** 순환표 (등장 횟수 = 확률 가중치) */
  segments: number[];
  onStop: (mult: number) => void;
}

const AUTO_STOP_MS = 2500;
const STEP_MS = 80;

function defenseLabel(v: number): string {
  if (v === 0) return '완전 방어!!';
  if (v === 0.5) return '절반 방어!';
  if (v === 0.7) return '방어!';
  return '실패…';
}

/** 공격/방어 배율 룰렛: 빠르게 순환하는 배율을 탭으로 정지 */
export function MultiplierRoulette({ mode, segments, onStop }: Props) {
  const [idx, setIdx] = useState(0);
  const [stopped, setStopped] = useState(false);
  const idxRef = useRef(Math.floor(Math.random() * segments.length));
  const doneRef = useRef(false);

  useEffect(() => {
    const spin = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % segments.length;
      setIdx(idxRef.current);
      sfx.tick();
    }, STEP_MS);

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      clearInterval(spin);
      setStopped(true);
      const value = segments[idxRef.current];
      if (mode === 'attack' ? value >= 2 : value <= 0.5) {
        sfx.superHit();
        haptic.superHit();
      } else sfx.click();
      setTimeout(() => onStop(value), 850);
    };

    const auto = setTimeout(finish, AUTO_STOP_MS);
    window.addEventListener('pointerdown', finish);
    return () => {
      clearInterval(spin);
      clearTimeout(auto);
      window.removeEventListener('pointerdown', finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = segments[idx];
  const big = mode === 'attack' ? value >= 2 : value <= 0.5;

  return (
    <div className={`mult-roulette mult-roulette--${mode}`}>
      <div className="mult-roulette__title">
        {mode === 'attack' ? '⚔️ 공격 배율!' : '🛡️ 막아라!'}
      </div>
      <div
        className={`mult-roulette__value${big ? ' mult-roulette__value--big' : ''}${
          stopped ? ' mult-roulette__value--stopped' : ''
        }`}
      >
        {mode === 'attack' ? `×${value}` : defenseLabel(value)}
      </div>
      <div className="mult-roulette__hint">{stopped ? '' : '탭해서 멈춰라!'}</div>
    </div>
  );
}
