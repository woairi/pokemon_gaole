import { useState } from 'react';
import { sfx } from '../audio/sfx';

const SLIDES = [
  {
    emoji: '⚔️',
    title: '배틀!',
    body: '기술을 고르고 버튼을 마구마구 연타하면 공격이 강해져요!\n💥 "효과 굉장!"이 붙은 기술을 쓰면 더 아파요.',
  },
  {
    emoji: '🔴',
    title: '겟 찬스!',
    body: '야생 포켓몬을 쓰러뜨리면 볼 룰렛이 나와요.\n타이밍 좋게 탭해서 좋은 볼을 노리자!\n잡은 포켓몬은 1~5성 디스크가 돼요.',
  },
  {
    emoji: '👑',
    title: '코스는 3연전!',
    body: '스테이지 3의 보스를 이기면 코스 클리어!\nZ게이지가 가득 차면 Z기술,\n5성 디스크는 메가진화도 할 수 있어요!',
  },
];

export function TutorialOverlay({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const last = idx === SLIDES.length - 1;

  return (
    <div className="tutorial">
      <div className="tutorial__card">
        <div className="tutorial__emoji">{slide.emoji}</div>
        <div className="tutorial__title">{slide.title}</div>
        <div className="tutorial__body">
          {slide.body.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="tutorial__dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={i === idx ? 'tutorial__dot tutorial__dot--on' : 'tutorial__dot'} />
          ))}
        </div>
        <button
          type="button"
          className="big-btn tutorial__btn"
          onClick={() => {
            sfx.click();
            if (last) onDone();
            else setIdx(idx + 1);
          }}
        >
          {last ? '시작하기!' : '다음'}
        </button>
      </div>
    </div>
  );
}
