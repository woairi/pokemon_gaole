import type { Grade } from '../types';

export function StarGrade({ grade, size }: { grade: Grade; size?: 'big' }) {
  return (
    <span className={`star-grade${size === 'big' ? ' star-grade--big' : ''}`}>
      {'★'.repeat(grade)}
      <span className="star-grade__empty">{'★'.repeat(5 - grade)}</span>
    </span>
  );
}
