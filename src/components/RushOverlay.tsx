import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { TUNING } from '../engine/damage';

interface Props {
  durationMs: number;
  isZ: boolean;
  moveKo: string;
  onDone: (fill: number) => void;
}

/** 러시(연타) 페이즈: 제한 시간 동안 버튼을 연타해 게이지를 채운다 */
export function RushOverlay({ durationMs, isZ, moveKo, onDone }: Props) {
  const [fill, setFill] = useState(0);
  const [progress, setProgress] = useState(1); // 남은 시간 비율
  const [bump, setBump] = useState(0);
  const fillRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const left = 1 - (now - start) / durationMs;
      if (left <= 0) {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone(fillRef.current);
        }
        return;
      }
      setProgress(left);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    if (isZ) sfx.zCharge();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (doneRef.current) return;
    fillRef.current = Math.min(1, fillRef.current + 1 / TUNING.tapsToFill);
    setFill(fillRef.current);
    setBump((b) => b + 1);
    sfx.tap(fillRef.current);
  };

  return (
    <div
      className={`rush-overlay${isZ ? ' rush-overlay--z' : ''}`}
      onPointerDown={tap}
    >
      <div className="rush-overlay__move">{moveKo}</div>
      <div className="rush-overlay__timer">
        <div className="rush-overlay__timer-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="rush-overlay__gauge">
        <div
          className={`rush-overlay__gauge-fill${fill >= 1 ? ' rush-overlay__gauge-fill--max' : ''}`}
          style={{ width: `${fill * 100}%` }}
        />
      </div>
      <button
        type="button"
        key={bump}
        className={`rush-button${isZ ? ' rush-button--z' : ''}`}
      >
        연타!!
      </button>
      <div className="rush-overlay__hint">{fill >= 1 ? 'MAX!!' : '마구마구 눌러라!'}</div>
    </div>
  );
}
