import { sfx } from '../audio/sfx';
import { useGame } from '../store/gameStore';
import { artworkUrl } from '../utils/sprites';

export function TitleScreen() {
  const setScreen = useGame((s) => s.setScreen);
  return (
    <div
      className="screen title"
      onClick={() => {
        sfx.fanfare();
        setScreen('menu');
      }}
    >
      <div className="title__logo">
        <span className="title__pokemon">포켓몬</span>
        <span className="title__gaole">가오레</span>
      </div>
      <img className="title__mascot" src={artworkUrl(25)} alt="피카츄" draggable={false} />
      <div className="title__tap tap-hint">화면을 터치하세요!</div>
      <div className="title__credit">팬 게임 · 원재를 위해 만들었어요</div>
    </div>
  );
}
