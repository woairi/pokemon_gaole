import { useEffect } from 'react';
import { sfx } from '../audio/sfx';
import { GetChanceOverlay } from '../components/GetChanceOverlay';
import { HpBar } from '../components/HpBar';
import { RushOverlay } from '../components/RushOverlay';
import { getCourse } from '../data/courses';
import {
  type BattleState, beginSelect, chooseMove, chooseZ, continueAfterAttack,
  continueAfterEnemyAttack, finishCatch, getSpecies, resolveRush,
} from '../engine/battle';
import { TUNING } from '../engine/damage';
import { useGame } from '../store/gameStore';
import { iGa, wa } from '../utils/korean';
import { artworkUrl, battleSpriteUrl, preloadImages } from '../utils/sprites';
import { TYPE_COLORS } from '../utils/typeColors';

const ATTACK_ANIM_MS = 1700;

function buildMessage(b: BattleState): string {
  const a = b.lastAttack;
  switch (b.phase) {
    case 'intro': {
      const [w1, w2] = b.wild.map((w) => getSpecies(w.speciesId).ko);
      return `야생의 ${wa(w1)} ${iGa(w2)} 나타났다!`;
    }
    case 'legendIntro':
      return '!!거대한 그림자가 나타났다!';
    case 'selectMove':
      return b.zGauge >= 100 ? 'Z게이지 최대! Z기술을 쓸 수 있다!' : '기술을 고르자!';
    case 'attack': {
      if (!a) return '';
      const name = getSpecies(b.player[a.attackerIdx].speciesId).ko;
      let msg = `${name}의 ${a.moveKo}!`;
      if (a.crit) msg += ' 급소에 맞았다!';
      if (a.typeMult >= 2) msg += ' 효과가 굉장했다!';
      else if (a.typeMult <= 0.5) msg += ' 효과가 별로인 듯하다…';
      return msg;
    }
    case 'enemyAttack': {
      if (!a) return '';
      const name = getSpecies(b.wild[a.attackerIdx].speciesId).ko;
      const target = getSpecies(b.player[a.targetIdx].speciesId).ko;
      if (a.dodged) return `야생 ${name}의 ${a.moveKo}! ${iGa(target)} 재빨리 피했다!`;
      let msg = `야생 ${name}의 ${a.moveKo}!`;
      if (a.typeMult >= 2) msg += ' 효과가 굉장했다!';
      return msg;
    }
    case 'victory':
      return '승리했다!!';
    case 'defeat':
      return '아쉽다! 다음엔 이길 수 있어!';
    default:
      return '';
  }
}

export function BattleScreen() {
  const battle = useGame((s) => s.battle);
  const setBattle = useGame((s) => s.setBattle);
  const recordCatchAttempt = useGame((s) => s.recordCatchAttempt);
  const endBattle = useGame((s) => s.endBattle);

  const phase = battle?.phase;

  useEffect(() => {
    if (!battle) return;
    const current = () => useGame.getState().battle;

    if (phase === 'intro' || phase === 'legendIntro') {
      if (phase === 'legendIntro') sfx.legend();
      const urls = [
        ...battle.wild.map((w) => battleSpriteUrl(w.speciesId, 'front')),
        ...battle.player.map((p) => battleSpriteUrl(p.speciesId, 'back')),
        ...battle.wild.map((w) => artworkUrl(w.speciesId)),
      ];
      let cancelled = false;
      const minWait = new Promise((r) => setTimeout(r, phase === 'legendIntro' ? 2400 : 1800));
      Promise.all([preloadImages(urls), minWait]).then(() => {
        const b = current();
        if (!cancelled && b && (b.phase === 'intro' || b.phase === 'legendIntro')) {
          setBattle(beginSelect(b));
        }
      });
      return () => {
        cancelled = true;
      };
    }

    if (phase === 'attack') {
      const a = battle.lastAttack!;
      if (a.typeMult >= 2) sfx.superHit();
      else if (a.typeMult <= 0.5) sfx.weakHit();
      else sfx.hit();
      if (battle.wild.some((w) => w.hp <= 0 && !w.catchResolved)) {
        setTimeout(() => sfx.faint(), 600);
      }
      const t = setTimeout(() => {
        const b = current();
        if (b?.phase === 'attack') setBattle(continueAfterAttack(b));
      }, ATTACK_ANIM_MS);
      return () => clearTimeout(t);
    }

    if (phase === 'enemyAttack') {
      const a = battle.lastAttack!;
      if (a.dodged) sfx.dodge();
      else if (a.typeMult >= 2) sfx.superHit();
      else sfx.hit();
      if (battle.player.some((p) => p.hp <= 0)) setTimeout(() => sfx.faint(), 600);
      const t = setTimeout(() => {
        const b = current();
        if (b?.phase === 'enemyAttack') setBattle(continueAfterEnemyAttack(b));
      }, ATTACK_ANIM_MS);
      return () => clearTimeout(t);
    }

    if (phase === 'victory' || phase === 'defeat') {
      if (phase === 'victory') sfx.fanfare();
      else sfx.defeat();
      const t = setTimeout(() => endBattle(), 2200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!battle) return null;
  const course = getCourse(battle.courseId);
  const message = buildMessage(battle);
  const attack = battle.lastAttack;
  const zReady = battle.zGauge >= 100;

  return (
    <div
      className={`screen battle${battle.phase === 'legendIntro' ? ' battle--dark' : ''}`}
      style={{ background: course.bg }}
    >
      {/* Z 게이지 */}
      <div className="battle__zbar">
        <span className={`battle__zlabel${zReady ? ' battle__zlabel--ready' : ''}`}>Z</span>
        <div className="battle__ztrack">
          <div
            className={`battle__zfill${zReady ? ' battle__zfill--ready' : ''}`}
            style={{ width: `${battle.zGauge}%` }}
          />
        </div>
        <span className="battle__round">{battle.round}라운드</span>
      </div>

      {/* 야생 포켓몬 */}
      <div className="battle__enemies">
        {battle.wild.map((w, i) => {
          const sp = getSpecies(w.speciesId);
          const hitNow =
            battle.phase === 'attack' &&
            attack?.side === 'player' &&
            (attack.targetIdx === i || (attack.isZ && w.hp >= 0));
          const showDmg =
            battle.phase === 'attack' && attack?.side === 'player'
              ? attack.targetIdx === i
                ? attack.dmg
                : attack.isZ && attack.splashDmg
                  ? attack.splashDmg
                  : null
              : null;
          return (
            <div key={i} className="battle__slot">
              <HpBar hp={w.hp} maxHp={w.maxHp} label={`${sp.ko}${w.intruder ? ' ⚠️' : ''}`} />
              <div className={`battle__sprite-box${hitNow ? ' battle__sprite-box--hit' : ''}`}>
                {w.caught ? (
                  <div className="battle__caught">🔴 GET!</div>
                ) : w.hp <= 0 && w.catchResolved ? (
                  <div className="battle__escaped" />
                ) : (
                  <img
                    className={`battle__sprite battle__sprite--front${
                      w.hp <= 0 ? ' battle__sprite--fainted' : ''
                    }`}
                    src={battleSpriteUrl(w.speciesId, 'front')}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = artworkUrl(w.speciesId);
                    }}
                    alt={sp.ko}
                    draggable={false}
                  />
                )}
                {showDmg != null && (
                  <div key={`${battle.round}-${i}`} className="dmg-popup">
                    {showDmg}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 내 포켓몬 */}
      <div className="battle__players">
        {battle.player.map((p, i) => {
          const sp = getSpecies(p.speciesId);
          const hitNow =
            battle.phase === 'enemyAttack' && !attack?.dodged && attack?.targetIdx === i;
          const attacking =
            (battle.phase === 'attack' && attack?.side === 'player' && attack.attackerIdx === i) ||
            (battle.phase === 'rush' && battle.pending?.monIdx === i);
          return (
            <div key={i} className="battle__slot">
              <div
                className={`battle__sprite-box${hitNow ? ' battle__sprite-box--hit' : ''}${
                  attacking ? ' battle__sprite-box--attacking' : ''
                }`}
              >
                <img
                  className={`battle__sprite battle__sprite--back${
                    p.hp <= 0 ? ' battle__sprite--fainted' : ''
                  }`}
                  src={battleSpriteUrl(p.speciesId, 'back')}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = artworkUrl(p.speciesId);
                  }}
                  alt={sp.ko}
                  draggable={false}
                />
                {hitNow && attack && (
                  <div key={`p-${battle.round}-${i}`} className="dmg-popup dmg-popup--enemy">
                    {attack.dmg}
                  </div>
                )}
              </div>
              <HpBar hp={p.hp} maxHp={p.maxHp} label={sp.ko} />
            </div>
          );
        })}
      </div>

      {/* 메시지 */}
      {message && <div className="message-box">{message}</div>}

      {/* 기술 선택 */}
      {battle.phase === 'selectMove' && (
        <div className="battle__controls">
          {battle.player.map((p, i) => {
            const sp = getSpecies(p.speciesId);
            const dead = p.hp <= 0;
            return (
              <div key={i} className={`battle__moves${dead ? ' battle__moves--dead' : ''}`}>
                {zReady && !dead && (
                  <button
                    type="button"
                    className="move-btn move-btn--z"
                    onClick={() => {
                      sfx.click();
                      setBattle(chooseZ(battle, i));
                    }}
                  >
                    Z기술!!
                  </button>
                )}
                {sp.moves.map((m, mi) => (
                  <button
                    key={mi}
                    type="button"
                    className="move-btn"
                    style={{ background: TYPE_COLORS[m.type] }}
                    disabled={dead}
                    onClick={() => {
                      sfx.click();
                      setBattle(chooseMove(battle, i, mi));
                    }}
                  >
                    <span className="move-btn__name">{m.ko}</span>
                    <span className="move-btn__power">{m.power}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* 러시(연타) */}
      {battle.phase === 'rush' && battle.pending && (
        <RushOverlay
          durationMs={battle.pending.isZ ? TUNING.zRushDurationMs : TUNING.rushDurationMs}
          isZ={battle.pending.isZ}
          moveKo={battle.pending.move.ko}
          onDone={(fill) => {
            const b = useGame.getState().battle;
            if (b?.phase === 'rush') setBattle(resolveRush(b, fill));
          }}
        />
      )}

      {/* 겟 찬스 */}
      {battle.phase === 'getChance' && battle.getChanceQueue.length > 0 && (
        <GetChanceOverlay
          key={battle.getChanceQueue[0]}
          speciesId={battle.wild[battle.getChanceQueue[0]].speciesId}
          intruder={battle.wild[battle.getChanceQueue[0]].intruder}
          recordCatch={recordCatchAttempt}
          onDone={(outcome) => {
            const b = useGame.getState().battle;
            if (b?.phase === 'getChance') setBattle(finishCatch(b, outcome));
          }}
        />
      )}

      {/* 승리/패배 배너 */}
      {(battle.phase === 'victory' || battle.phase === 'defeat') && (
        <div className={`battle__banner battle__banner--${battle.phase}`}>
          {battle.phase === 'victory' ? 'WIN!!' : 'LOSE…'}
        </div>
      )}
    </div>
  );
}
