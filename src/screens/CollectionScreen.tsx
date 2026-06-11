import { DiskCard } from '../components/DiskCard';
import { useGame } from '../store/gameStore';

export function CollectionScreen() {
  const save = useGame((s) => s.save);
  const setScreen = useGame((s) => s.setScreen);

  const owned = Object.entries(save.disks)
    .map(([id, d]) => ({ speciesId: +id, ...d }))
    .sort((a, b) => b.grade - a.grade || a.speciesId - b.speciesId);

  return (
    <div className="screen collection">
      <div className="screen-header">
        <button type="button" className="back-btn" onClick={() => setScreen('menu')}>
          ◀
        </button>
        <span>내 디스크 ({owned.length}장)</span>
      </div>
      {owned.length === 0 ? (
        <div className="collection__empty">
          아직 디스크가 없어요.
          <br />
          배틀에서 포켓몬을 잡아 디스크를 모으자!
        </div>
      ) : (
        <div className="collection__scroll">
          <div className="disk-grid">
            {owned.map((d) => (
              <DiskCard key={d.speciesId} speciesId={d.speciesId} grade={d.grade} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
