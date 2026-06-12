import { useEffect } from 'react';
import { bgm } from './audio/bgm';
import { BattleScreen } from './screens/BattleScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { CourseSelect } from './screens/CourseSelect';
import { DexScreen } from './screens/DexScreen';
import { MainMenu } from './screens/MainMenu';
import { ResultScreen } from './screens/ResultScreen';
import { TeamSelect } from './screens/TeamSelect';
import { TitleScreen } from './screens/TitleScreen';
import { useGame } from './store/gameStore';

export default function App() {
  const screen = useGame((s) => s.screen);

  useEffect(() => {
    if (screen === 'title') bgm.stop();
    else if (screen === 'battle') bgm.play('battle');
    else bgm.play('menu');
  }, [screen]);

  return (
    <>
      <Screens screen={screen} />
      {/* 가로 모드 안내 (CSS로 가로일 때만 표시) */}
      <div className="rotate-overlay">
        <div className="rotate-overlay__icon">📱</div>
        <div className="rotate-overlay__text">세로로 돌려주세요!</div>
      </div>
    </>
  );
}

function Screens({ screen }: { screen: ReturnType<typeof useGame.getState>['screen'] }) {
  switch (screen) {
    case 'title':
      return <TitleScreen />;
    case 'menu':
      return <MainMenu />;
    case 'course':
      return <CourseSelect />;
    case 'team':
      return <TeamSelect />;
    case 'battle':
      return <BattleScreen />;
    case 'result':
      return <ResultScreen />;
    case 'collection':
      return <CollectionScreen />;
    case 'dex':
      return <DexScreen />;
  }
}
