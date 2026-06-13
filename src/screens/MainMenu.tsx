import { useState } from 'react';
import { sfx } from '../audio/sfx';
import { BackupModal } from '../components/BackupModal';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { useGame } from '../store/gameStore';

export function MainMenu() {
  const setScreen = useGame((s) => s.setScreen);
  const save = useGame((s) => s.save);
  const toggleSound = useGame((s) => s.toggleSound);
  const markTutorialSeen = useGame((s) => s.markTutorialSeen);
  const [showBackup, setShowBackup] = useState(false);

  const go = (screen: 'course' | 'collection' | 'dex') => {
    sfx.click();
    setScreen(screen);
  };

  return (
    <div className="screen menu">
      <div className="menu__header">
        <span className="menu__title">포켓몬 가오레</span>
        <div className="menu__header-btns">
          <button type="button" className="menu__sound" onClick={() => setShowBackup(true)}>
            💾
          </button>
          <button type="button" className="menu__sound" onClick={toggleSound}>
            {save.settings.sound ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {save.pendingBoost && (
        <div className="menu__boost">🎁 다음 배틀에서 등급 UP 찬스!</div>
      )}

      <div className="menu__buttons">
        <button type="button" className="menu-btn menu-btn--battle" onClick={() => go('course')}>
          <span className="menu-btn__emoji">⚔️</span> 배틀 시작!
        </button>
        <button type="button" className="menu-btn" onClick={() => go('collection')}>
          <span className="menu-btn__emoji">💿</span> 내 디스크
          <span className="menu-btn__count">{Object.keys(save.disks).length}</span>
        </button>
        <button type="button" className="menu-btn" onClick={() => go('dex')}>
          <span className="menu-btn__emoji">📕</span> 도감
          <span className="menu-btn__count">{save.dex.caught.length}</span>
        </button>
      </div>

      <div className="menu__stats">
        배틀 {save.stats.battles}회 · 승리 {save.stats.wins}회 · 포획 {save.stats.catches}마리
        {save.stats.stamps > 0 && ` · 🎫 ${save.stats.stamps}/5`}
      </div>

      <div className="menu__version">v{__APP_VERSION__}</div>

      {showBackup && <BackupModal onClose={() => setShowBackup(false)} />}
      {!save.settings.tutorialSeen && <TutorialOverlay onDone={markTutorialSeen} />}
    </div>
  );
}
