import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import type { Ball } from '../engine/catch';

/** 볼 룰렛: 빠르게 도는 휠을 탭으로 멈춰 볼을 고른다 */
export function BallRoulette({ balls, onSelect }: { balls: Ball[]; onSelect: (ball: Ball) => void }) {
  const [stopped, setStopped] = useState(false);
  const [selected, setSelected] = useState<Ball | null>(null);
  // 시작 각도를 매번 무작위로 → 같은 타이밍 연타로 같은 볼이 나오는 패턴 방지
  const rotation = useRef(Math.random() * 360);
  const wheelRef = useRef<HTMLDivElement>(null);
  const stopping = useRef(false);
  const lastTick = useRef(0);

  useEffect(() => {
    let raf = 0;
    let speed = 6.5 + Math.random() * 3; // 회전 속도도 매번 다르게 (6.5~9.5 deg/frame)
    let decel = 0;
    const step = () => {
      if (stopping.current) {
        speed = Math.max(0, speed - decel);
        if (speed === 0) {
          finish();
          return;
        }
      }
      rotation.current = (rotation.current + speed) % 360;
      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${rotation.current}deg)`;
      }
      // 칸이 바뀔 때 틱 소리
      const now = performance.now();
      if (now - lastTick.current > 120) {
        lastTick.current = now;
        sfx.tick();
      }
      raf = requestAnimationFrame(step);
    };

    const finish = () => {
      // 포인터(12시 방향) 아래의 칸 계산
      const angle = (360 - rotation.current + 360) % 360;
      let acc = 0;
      let ball = balls[0];
      for (const b of balls) {
        acc += b.arc * 3.6;
        if (angle < acc) {
          ball = b;
          break;
        }
      }
      setSelected(ball);
      setTimeout(() => onSelect(ball), 900);
    };

    const stop = () => {
      if (stopping.current) return;
      stopping.current = true;
      // 감속 거리도 무작위로 → 탭 순간과 멈추는 칸 사이 관계를 흐트러뜨림
      decel = speed / (16 + Math.random() * 20);
      setStopped(true);
    };

    raf = requestAnimationFrame(step);
    window.addEventListener('pointerdown', stop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gradient = (() => {
    let acc = 0;
    const stops = balls.map((b) => {
      const from = acc;
      acc += b.arc;
      return `${b.color} ${from}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  })();

  return (
    <div className="roulette">
      <div className="roulette__pointer">▼</div>
      <div className="roulette__wheel" ref={wheelRef} style={{ background: gradient }}>
        {balls.map((b, i) => {
          const before = balls.slice(0, i).reduce((a, x) => a + x.arc, 0);
          const mid = (before + b.arc / 2) * 3.6;
          return (
            <span
              key={b.id}
              className="roulette__label"
              style={{ transform: `rotate(${mid}deg) translateY(max(-21vw, -92px)) rotate(${-mid}deg)` }}
            >
              <span className="mini-ball" style={{ background: b.color }} />
            </span>
          );
        })}
      </div>
      <div className="roulette__hint">
        {selected ? (
          <span className="roulette__result" style={{ color: selected.color }}>
            {selected.ko}!
          </span>
        ) : stopped ? (
          '두근두근...'
        ) : (
          '탭해서 볼을 정하자!'
        )}
      </div>
    </div>
  );
}
