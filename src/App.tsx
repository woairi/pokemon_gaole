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
