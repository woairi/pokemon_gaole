export function HpBar({ hp, maxHp, label }: { hp: number; maxHp: number; label?: string }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  const color = pct > 50 ? '#4caf50' : pct > 20 ? '#ffb300' : '#f44336';
  return (
    <div className="hp-bar">
      {label && <div className="hp-bar__label">{label}</div>}
      <div className="hp-bar__track">
        <div className="hp-bar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
