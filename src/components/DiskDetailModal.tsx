import { getSpecies } from '../engine/battle';
import type { OwnedDisk } from '../types';
import { artworkUrl } from '../utils/sprites';
import { StarGrade } from './StarGrade';
import { TypeBadge } from './TypeBadge';

interface Props {
  speciesId: number;
  disk: OwnedDisk;
  onClose: () => void;
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

export function DiskDetailModal({ speciesId, disk, onClose }: Props) {
  const species = getSpecies(speciesId);
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel disk-detail" onClick={(e) => e.stopPropagation()}>
        <img className="disk-detail__img" src={artworkUrl(speciesId)} alt={species.ko} draggable={false} />
        <div className="disk-detail__name">
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

        <div className="disk-detail__meta">
          {new Date(disk.caughtAt).toLocaleDateString('ko')} 획득 · 배틀 {disk.timesUsed}회 출전
        </div>
        <button type="button" className="modal__close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
