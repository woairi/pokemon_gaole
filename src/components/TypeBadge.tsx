import typechart from '../data/typechart.json';
import type { TypeName } from '../types';
import { TYPE_COLORS } from '../utils/typeColors';

const typeKo = typechart.ko as Record<TypeName, string>;

export function TypeBadge({ type, small }: { type: TypeName; small?: boolean }) {
  return (
    <span
      className={`type-badge${small ? ' type-badge--small' : ''}`}
      style={{ background: TYPE_COLORS[type] }}
    >
      {typeKo[type]}
    </span>
  );
}
