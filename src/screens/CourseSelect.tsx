import { sfx } from '../audio/sfx';
import { COURSES, isCourseUnlocked } from '../data/courses';
import { useGame } from '../store/gameStore';

export function CourseSelect() {
  const save = useGame((s) => s.save);
  const selectCourse = useGame((s) => s.selectCourse);
  const setScreen = useGame((s) => s.setScreen);

  return (
    <div className="screen course-select">
      <div className="screen-header">
        <button type="button" className="back-btn" onClick={() => setScreen('menu')}>
          ◀
        </button>
        <span>코스를 고르자!</span>
      </div>
      <div className="course-select__list">
        {COURSES.map((c) => {
          const unlocked = isCourseUnlocked(c, save);
          return (
            <button
              key={c.id}
              type="button"
              className={`course-card${unlocked ? '' : ' course-card--locked'}`}
              style={{ background: c.bg }}
              onClick={() => {
                if (!unlocked) return;
                sfx.click();
                selectCourse(c.id);
              }}
            >
              <span className="course-card__emoji">{c.emoji}</span>
              <span className="course-card__name">{c.ko}</span>
              <span className="course-card__desc">
                {unlocked ? c.desc : `🔒 포켓몬 ${c.unlockCatches}마리를 잡으면 열려요!`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
