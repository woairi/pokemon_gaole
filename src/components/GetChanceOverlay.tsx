import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { type CatchOutcome, INTRUDER_CATCH_MOD, getSpecies } from '../engine/battle';
import { type Ball, catchProbability, rollCatch } from '../engine/catch';
import { eulReul, iGa } from '../utils/korean';
import { artworkUrl } from '../utils/sprites';
import { BallRoulette } from './BallRoulette';
import { StarGrade } from './StarGrade';

interface Props {
  speciesId: number;
  intruder?: boolean;
  recordCatch: (speciesId: number, success: boolean) => CatchOutcome;
  onDone: (outcome: CatchOutcome) => void;
}

type Stage = 'banner' | 'roulette' | 'throw' | 'shake' | 'result';

/** 야생 포켓몬을 쓰러뜨렸을 때의 겟 찬스(포획) 연출 */
export function GetChanceOverlay({ speciesId, intruder, recordCatch, onDone }: Props) {
  const species = getSpecies(speciesId);
  const [stage, setStage] = useState<Stage>('banner');
  const [shakeCount, setShakeCount] = useState(0);
  const [outcome, setOutcome] = useState<CatchOutcome | null>(null);
  const ballRef = useRef<Ball | null>(null);
  const successRef = useRef(false);

  useEffect(() => {
    if (stage === 'banner') {
      sfx.fanfare();
      const t = setTimeout(() => setStage('roulette'), 1400);
      return () => clearTimeout(t);
    }
    if (stage === 'throw') {
      sfx.throwBall();
      const t = setTimeout(() => setStage('shake'), 900);
      return () => clearTimeout(t);
    }
    if (stage === 'shake') {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setShakeCount(count);
        sfx.shake();
        if (count >= 3) {
          clearInterval(interval);
          setTimeout(() => {
            const result = recordCatch(speciesId, successRef.current);
            setOutcome(result);
            if (successRef.current) sfx.catchSuccess();
            else sfx.escape();
            setStage('result');
          }, 600);
        }
      }, 650);
      return () => clearInterval(interval);
    }
  }, [stage, recordCatch, speciesId]);

  const onBallSelected = (ball: Ball) => {
    ballRef.current = ball;
    const p = catchProbability(species.rarity, ball, intruder ? INTRUDER_CATCH_MOD : 1);
    successRef.current = rollCatch(p);
    setStage('throw');
  };

  const resultLabel = () => {
    if (!outcome) return null;
    switch (outcome.result) {
      case 'new':
        return (
          <>
            <div className="getchance__got">GET!!</div>
            <div className="getchance__label">{eulReul(species.ko)} 잡았다!</div>
            <StarGrade grade={outcome.grade} size="big" />
            <div className="getchance__sub">새로운 디스크 획득!</div>
          </>
        );
      case 'gradeUp':
        return (
          <>
            <div className="getchance__got">GET!!</div>
            <div className="getchance__label">그레이드 업!</div>
            <div className="getchance__gradeup">
              <StarGrade grade={outcome.prevGrade!} /> → <StarGrade grade={outcome.grade} />
            </div>
          </>
        );
      case 'dupe':
        return (
          <>
            <div className="getchance__got">GET!!</div>
            <div className="getchance__label">{eulReul(species.ko)} 잡았다!</div>
            <StarGrade grade={outcome.grade} size="big" />
            <div className="getchance__sub">이미 가진 디스크보다 약했다…</div>
          </>
        );
      case 'escaped':
        return (
          <div className="getchance__label">
            아쉽다! {iGa(species.ko)} 도망가 버렸다…
          </div>
        );
    }
  };

  return (
    <div className="getchance" onClick={() => stage === 'result' && outcome && onDone(outcome)}>
      {stage === 'banner' && <div className="getchance__banner">GET CHANCE!!</div>}

      {stage !== 'banner' && (
        <div
          className={
            'getchance__mon' +
            (stage === 'shake' || (stage === 'result' && outcome?.result !== 'escaped')
              ? ' getchance__mon--hidden'
              : '') +
            (stage === 'result' && outcome?.result === 'escaped' ? ' getchance__mon--escape' : '')
          }
        >
          <img src={artworkUrl(speciesId)} alt={species.ko} draggable={false} />
        </div>
      )}

      {stage === 'roulette' && <BallRoulette onSelect={onBallSelected} />}

      {(stage === 'throw' || stage === 'shake') && (
        <div
          className={`getchance__ball${stage === 'throw' ? ' getchance__ball--throw' : ''}${
            stage === 'shake' ? ' getchance__ball--shake' : ''
          }`}
          style={{ background: ballRef.current?.color }}
          key={stage === 'shake' ? shakeCount : 'throw'}
        />
      )}

      {stage === 'result' && (
        <div className="getchance__result">
          {outcome?.result !== 'escaped' && (
            <img
              className="getchance__result-img"
              src={artworkUrl(speciesId)}
              alt={species.ko}
              draggable={false}
            />
          )}
          {resultLabel()}
          <div className="tap-hint">화면을 터치!</div>
        </div>
      )}
    </div>
  );
}
