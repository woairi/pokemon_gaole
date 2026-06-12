import { getSpecies } from '../engine/battle';
import type { Grade } from '../types';
import { thumbUrl } from '../utils/sprites';
import { GRADE_COLORS } from '../utils/typeColors';
import { StarGrade } from './StarGrade';
import { TypeBadge } from './TypeBadge';

interface Props {
  speciesId: number;
  grade: Grade;
  rental?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function DiskCard({ speciesId, grade, rental, selected, onClick }: Props) {
  const species = getSpecies(speciesId);
  const ring = GRADE_COLORS[grade];
  return (
    <button
      type="button"
      className={`disk-card${selected ? ' disk-card--selected' : ''}`}
      onClick={onClick}
    >
      <div
        className={`disk-card__disk${grade === 5 ? ' disk-card__disk--legend' : ''}`}
        style={{ borderColor: ring }}
      >
        <img
          className="disk-card__img"
          src={thumbUrl(speciesId)}
          alt={species.ko}
          loading="lazy"
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
        {rental && <span className="disk-card__rental">렌탈</span>}
      </div>
      <div className="disk-card__name">{species.ko}</div>
      <StarGrade grade={grade} />
      <div className="disk-card__types">
        {species.types.map((t) => (
          <TypeBadge key={t} type={t} small />
        ))}
      </div>
    </button>
  );
}
