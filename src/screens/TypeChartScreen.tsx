import { useState } from 'react';
import typechartJson from '../data/typechart.json';
import { sfx } from '../audio/sfx';
import { TypeBadge } from '../components/TypeBadge';
import { useGame } from '../store/gameStore';
import type { TypeName } from '../types';

const typeKo = typechartJson.ko as Record<TypeName, string>;
const chart = typechartJson.chart as Record<TypeName, Partial<Record<TypeName, number>>>;

const TYPES = Object.keys(typeKo) as TypeName[];

const mult = (atk: TypeName, def: TypeName) => chart[atk]?.[def] ?? 1;

/** 초등학생용 타입 상성 학습 화면 — 타입을 고르면 강점/약점을 보여준다 */
export function TypeChartScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const [sel, setSel] = useState<TypeName>('fire');

  // 고른 타입으로 "공격"할 때
  const attackStrong = TYPES.filter((d) => mult(sel, d) >= 2);
  const attackWeak = TYPES.filter((d) => mult(sel, d) > 0 && mult(sel, d) < 1);
  const attackNone = TYPES.filter((d) => mult(sel, d) === 0);

  // 고른 타입이 "공격받을" 때
  const defWeak = TYPES.filter((a) => mult(a, sel) >= 2); // 약점
  const defResist = TYPES.filter((a) => mult(a, sel) > 0 && mult(a, sel) < 1); // 잘 버팀
  const defNone = TYPES.filter((a) => mult(a, sel) === 0); // 안 통함

  const Row = ({ label, types, empty }: { label: string; types: TypeName[]; empty: string }) => (
    <div className="tc__row">
      <span className="tc__row-label">{label}</span>
      <span className="tc__row-types">
        {types.length ? (
          types.map((t) => <TypeBadge key={t} type={t} small />)
        ) : (
          <span className="tc__row-empty">{empty}</span>
        )}
      </span>
    </div>
  );

  return (
    <div className="screen tc">
      <div className="screen-header">
        <button type="button" className="back-btn" onClick={() => setScreen('menu')}>
          ◀
        </button>
        <span>타입 상성표</span>
      </div>

      <div className="tc__hint">타입을 골라봐! 무엇에 강하고 약한지 알려줄게 🔰</div>

      <div className="tc__picker">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`tc__pick${sel === t ? ' tc__pick--on' : ''}`}
            onClick={() => {
              sfx.click();
              setSel(t);
            }}
          >
            <TypeBadge type={t} small />
          </button>
        ))}
      </div>

      <div className="tc__panel">
        <div className="tc__title">
          <TypeBadge type={sel} /> <b>{typeKo[sel]}</b> 타입
        </div>

        <div className="tc__group">
          <div className="tc__group-head tc__group-head--atk">⚔️ 공격할 때</div>
          <Row label="💥 효과 굉장 (×2)" types={attackStrong} empty="없음" />
          <Row label="🛡️ 효과 별로 (×½)" types={attackWeak} empty="없음" />
          <Row label="🚫 안 통함 (×0)" types={attackNone} empty="없음" />
        </div>

        <div className="tc__group">
          <div className="tc__group-head tc__group-head--def">🛡️ 공격받을 때</div>
          <Row label="💥 약점 (×2로 아픔)" types={defWeak} empty="없음" />
          <Row label="😎 잘 버팀 (×½)" types={defResist} empty="없음" />
          <Row label="✨ 안 통함 (×0)" types={defNone} empty="없음" />
        </div>
      </div>
    </div>
  );
}
