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
  shiny?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function DiskCard({ speciesId, grade, rental, shiny, selected, onClick }: Props) {
  const species = getSpecies(speciesId);
  const ring = GRADE_COLORS[grade];
  const isLegendary = species.rarity === 'SS';
  return (
    <button
      type="button"
      className={`disk-card${selected ? ' disk-card--selected' : ''}${
        isLegendary ? ' disk-card--legendary' : ''
      }${shiny ? ' disk-card--shiny' : ''}`}
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
        {isLegendary && <span className="disk-card__legend">⚡전설</span>}
        {shiny && <span className="disk-card__shiny" title="색이 다른 포켓몬">✨</span>}
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
