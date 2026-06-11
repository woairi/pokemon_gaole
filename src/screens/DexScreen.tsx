import { allSpecies } from '../engine/battle';
import { useGame } from '../store/gameStore';
import { artworkUrl } from '../utils/sprites';

export function DexScreen() {
  const save = useGame((s) => s.save);
  const setScreen = useGame((s) => s.setScreen);

  const species = allSpecies().sort((a, b) => a.id - b.id);
  const caught = new Set(save.dex.caught);
  const seen = new Set(save.dex.seen);

  return (
    <div className="screen dex">
      <div className="screen-header">
        <button type="button" className="back-btn" onClick={() => setScreen('menu')}>
          ◀
        </button>
        <span>
          도감 — 잡았다 {caught.size} / {species.length}
        </span>
      </div>
      <div className="dex__scroll">
        <div className="dex__grid">
          {species.map((sp) => {
            const isCaught = caught.has(sp.id);
            const isSeen = seen.has(sp.id);
            return (
              <div key={sp.id} className="dex__cell">
                {isCaught || isSeen ? (
                  <img
                    className={`dex__img${!isCaught ? ' dex__img--silhouette' : ''}`}
                    src={artworkUrl(sp.id)}
                    alt={isCaught ? sp.ko : '???'}
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <div className="dex__unknown">?</div>
                )}
                <div className="dex__name">{isCaught ? sp.ko : isSeen ? '???' : ''}</div>
                <div className="dex__no">No.{sp.id}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
