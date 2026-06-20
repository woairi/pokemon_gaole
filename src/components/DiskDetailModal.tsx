import { useState } from 'react';
import typechartJson from '../data/typechart.json';
import { sfx } from '../audio/sfx';
import { getSpecies } from '../engine/battle';
import { typeMultiplier } from '../engine/damage';
import type { OwnedDisk, TypeName } from '../types';
import { artworkUrl, shinyArtworkUrl, thumbUrl } from '../utils/sprites';
import { StarGrade } from './StarGrade';
import { TypeBadge } from './TypeBadge';

const ALL_TYPES = Object.keys(typechartJson.ko) as TypeName[];

interface Props {
  speciesId: number;
  disk: OwnedDisk;
  onClose: () => void;
  /** 진화 도전: 선택한 진화체 id로 미니게임을 시작한다 */
  onEvolve?: (toId: number) => void;
}

const STAT_MAX = 180;

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-bar">
      <span className="stat-bar__label">{label}</span>
      <div className="stat-bar__track">
        <div
          className="stat-bar__fill"
          style={{ width: `${Math.min(100, (value / STAT_MAX) * 100)}%` }}
        />
      </div>
      <span className="stat-bar__value">{value}</span>
    </div>
  );
}

/** 진화 도전 가능 최소 등급 — 충분히 키운 디스크만 도전 가능 */
const EVOLVE_MIN_GRADE = 3;

export function DiskDetailModal({ speciesId, disk, onClose, onEvolve }: Props) {
  const species = getSpecies(speciesId);
  const evolvesTo = species.evolvesTo ?? [];
  const evolvable = !!onEvolve && evolvesTo.length > 0;
  const gradeOk = disk.grade >= EVOLVE_MIN_GRADE;
  const canEvolve = evolvable && gradeOk;
  const [choosing, setChoosing] = useState(false);

  // 교육용: 이 포켓몬이 공격받을 때의 타입 상성
  const weakTo = ALL_TYPES.filter((a) => typeMultiplier(a, species.types) >= 2);
  const resists = ALL_TYPES.filter((a) => {
    const m = typeMultiplier(a, species.types);
    return m > 0 && m < 1;
  });
  const immuneTo = ALL_TYPES.filter((a) => typeMultiplier(a, species.types) === 0);

  const imgSrc = disk.shiny ? shinyArtworkUrl(speciesId) : artworkUrl(speciesId);

  const startEvolve = () => {
    sfx.click();
    if (evolvesTo.length === 1) onEvolve!(evolvesTo[0]);
    else setChoosing(true); // 이브이 등 여러 갈래 → 직접 선택
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel disk-detail" onClick={(e) => e.stopPropagation()}>
        {choosing ? (
          <>
            <div className="modal__title">어떤 모습으로 진화할까?</div>
            <div className="evo-choose">
              {evolvesTo.map((id) => {
                const t = getSpecies(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className="evo-choose__item"
                    onClick={() => onEvolve!(id)}
                  >
                    <img src={thumbUrl(id)} alt={t.ko} loading="lazy" draggable={false} />
                    <span>{t.ko}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="modal__close" onClick={() => setChoosing(false)}>
              뒤로
            </button>
          </>
        ) : (
          <>
            <img
              className={`disk-detail__img${disk.shiny ? ' disk-detail__img--shiny' : ''}`}
              src={imgSrc}
              alt={species.ko}
              draggable={false}
              onError={(e) => {
                if (disk.shiny) (e.target as HTMLImageElement).src = artworkUrl(speciesId);
              }}
            />
            <div className="disk-detail__name">
              {disk.shiny && <span className="disk-detail__shiny-badge">✨ 반짝이</span>}
              No.{species.id} {species.ko}
              {species.megaId && <span className="disk-detail__mega-badge">메가진화 가능</span>}
            </div>
            <StarGrade grade={disk.grade} size="big" />
            <div className="disk-detail__types">
              {species.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>

            <div className="disk-detail__stats">
              <StatBar label="HP" value={species.hp} />
              <StatBar label="공격" value={species.atk} />
              <StatBar label="방어" value={species.def} />
              <StatBar label="스피드" value={species.spd} />
            </div>

            <div className="disk-detail__moves">
              {species.moves.map((m) => (
                <div key={m.id} className="disk-detail__move">
                  <TypeBadge type={m.type} small />
                  <span className="disk-detail__move-name">{m.ko}</span>
                  <span className="disk-detail__move-power">위력 {m.power}</span>
                </div>
              ))}
            </div>

            <div className="disk-detail__matchup">
              <div className="disk-detail__matchup-row">
                <span className="disk-detail__matchup-label">💥 약점</span>
                <span className="disk-detail__matchup-types">
                  {weakTo.length
                    ? weakTo.map((t) => <TypeBadge key={t} type={t} small />)
                    : <span className="disk-detail__matchup-none">없음</span>}
                </span>
              </div>
              <div className="disk-detail__matchup-row">
                <span className="disk-detail__matchup-label">😎 잘 버팀</span>
                <span className="disk-detail__matchup-types">
                  {resists.length
                    ? resists.map((t) => <TypeBadge key={t} type={t} small />)
                    : <span className="disk-detail__matchup-none">없음</span>}
                </span>
              </div>
              {immuneTo.length > 0 && (
                <div className="disk-detail__matchup-row">
                  <span className="disk-detail__matchup-label">✨ 안 통함</span>
                  <span className="disk-detail__matchup-types">
                    {immuneTo.map((t) => <TypeBadge key={t} type={t} small />)}
                  </span>
                </div>
              )}
            </div>

            <div className="disk-detail__meta">
              {new Date(disk.caughtAt).toLocaleDateString('ko')} 획득 · 배틀 {disk.timesUsed}회 출전
            </div>

            {canEvolve && (
              <button type="button" className="big-btn disk-detail__evolve" onClick={startEvolve}>
                ✨ 진화 도전!
              </button>
            )}
            {evolvable && !gradeOk && (
              <div className="disk-detail__evolve-lock">
                🔒 {EVOLVE_MIN_GRADE}★ 이상이면 진화에 도전할 수 있어요
              </div>
            )}
            <button type="button" className="modal__close" onClick={onClose}>
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
