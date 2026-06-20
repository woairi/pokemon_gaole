import { useEffect, useState } from 'react';
import { playCry, sfx } from '../audio/sfx';
import { GetChanceOverlay } from '../components/GetChanceOverlay';
import { HpBar } from '../components/HpBar';
import { RushOverlay } from '../components/RushOverlay';
import { getCourse } from '../data/courses';
import { MultiplierRoulette } from '../components/MultiplierRoulette';
import {
  ATK_ROULETTE, type BattleState, DEF_ROULETTE, STAGE_COUNT, advanceStage, afterMegaAnim,
  afterRush, applyBattleEvolution, beginSelect, canMega, chooseMega, chooseMove, chooseZ,
  continueAfterAttack, continueAfterEnemyAttack, finishCatch, getSpecies, resolveDefense,
  resolveRush, setTarget,
} from '../engine/battle';
import { TUNING, typeMultiplier } from '../engine/damage';
import { useGame } from '../store/gameStore';
import { haptic } from '../utils/haptics';
import { iGa, wa } from '../utils/korean';
import {
  artworkUrl, battleSpriteUrl, preloadImages, shinyArtworkUrl, shinyBattleSpriteUrl,
} from '../utils/sprites';
import { TYPE_COLORS } from '../utils/typeColors';

const ATTACK_ANIM_MS = 1700;

function buildMessage(b: BattleState): string {
  const a = b.lastAttack;
  switch (b.phase) {
    case 'intro': {
      const [w1, w2] = b.wild.map((w) => getSpecies(w.speciesId).ko);
      const prefix = b.stage === STAGE_COUNT ? '보스 스테이지! ' : b.stage > 1 ? `스테이지 ${b.stage}! ` : '';
      return `${prefix}야생의 ${wa(w1)} ${iGa(w2)} 나타났다!`;
    }
    case 'legendIntro':
      return '!!거대한 그림자가 나타났다!';
    case 'selectMove':
      return b.zGauge >= 100 ? 'Z게이지 최대! Z기술을 쓸 수 있다!' : '기술을 고르자!';
    case 'attack': {
      if (!a) return '';
      const name = getSpecies(b.player[a.attackerIdx].speciesId).ko;
      let msg = `${name}의 ${a.moveKo}!`;
      if (a.rouletteMult >= 2) msg += ` 배율 ×${a.rouletteMult}!!`;
      if (a.crit) msg += ' 급소에 맞았다!';
      if (a.typeMult >= 2) msg += ' 효과가 굉장했다!';
      else if (a.typeMult <= 0.5) msg += ' 효과가 별로인 듯하다…';
      return msg;
    }
    case 'defRoulette':
      return '야생 포켓몬이 공격해온다! 막아라!';
    case 'enemyAttack': {
      if (!a) return '';
      const name = getSpecies(b.wild[a.attackerIdx].speciesId).ko;
      const target = getSpecies(b.player[a.targetIdx].speciesId).ko;
      if (a.dodged) return `야생 ${name}의 ${a.moveKo}! ${iGa(target)} 재빨리 피했다!`;
      if (a.blocked) return `야생 ${name}의 ${a.moveKo}! 완전 방어 성공!!`;
      let msg = `야생 ${name}의 ${a.moveKo}!`;
      if (a.rouletteMult <= 0.5) msg += ' 절반으로 막았다!';
      if (a.typeMult >= 2) msg += ' 효과가 굉장했다!';
      return msg;
    }
    case 'stageClear':
      return b.stage === STAGE_COUNT - 1 ? '스테이지 클리어! 다음은 보스 스테이지!' : '스테이지 클리어!';
    case 'megaAnim': {
      const monIdx = b.pending?.monIdx ?? 0;
      return `${getSpecies(b.player[monIdx].speciesId).ko}, 메가진화!!`;
    }
    case 'battleEvolution':
      return b.battleEvo ? `어라…?! ${getSpecies(b.battleEvo.fromId).ko}의 상태가…!` : '';
    case 'victory':
      return '코스 클리어!!';
    case 'defeat':
      return '아쉽다! 다음엔 이길 수 있어!';
    default:
      return '';
  }
}

/** 살아있는 야생 기준 최대 상성 배율 (자동 조준이 최적 대상을 고르므로) */
function moveHint(b: BattleState, moveType: Parameters<typeof typeMultiplier>[0]): number {
  const living = b.wild.filter((w) => w.hp > 0);
  if (!living.length) return 1;
  return Math.max(...living.map((w) => typeMultiplier(moveType, getSpecies(w.speciesId).types)));
}

function playerSpriteUrl(c: { speciesId: number; mega?: boolean }): {
  src: string;
  mirror: boolean;
} {
  const species = getSpecies(c.speciesId);
  if (c.mega && species.megaId) {
    if (species.megaNoBack) return { src: battleSpriteUrl(species.megaId, 'front'), mirror: true };
    return { src: battleSpriteUrl(species.megaId, 'back'), mirror: false };
  }
  return { src: battleSpriteUrl(c.speciesId, 'back'), mirror: false };
}

export function BattleScreen() {
  const battle = useGame((s) => s.battle);
  const setBattle = useGame((s) => s.setBattle);
  const markSeen = useGame((s) => s.markSeen);
  const recordCatchAttempt = useGame((s) => s.recordCatchAttempt);
  const applyEvolution = useGame((s) => s.applyEvolution);
  const endBattle = useGame((s) => s.endBattle);
  const [showForfeit, setShowForfeit] = useState(false);

  const phase = battle?.phase;

  useEffect(() => {
    if (!battle) return;
    const current = () => useGame.getState().battle;

    if (phase === 'intro' || phase === 'legendIntro') {
      if (phase === 'legendIntro') sfx.legend();
      const urls = [
        ...battle.wild.map((w) =>
          w.shiny ? shinyBattleSpriteUrl(w.speciesId, 'front') : battleSpriteUrl(w.speciesId, 'front')
        ),
        ...battle.player.map((p) => playerSpriteUrl(p).src),
        ...battle.wild.map((w) => (w.shiny ? shinyArtworkUrl(w.speciesId) : artworkUrl(w.speciesId))),
      ];
      let cancelled = false;
      // 등장하는 야생 포켓몬의 울음소리 (난입 연출 후 한 박자 뒤)
      const cryTimer = setTimeout(
        () => playCry(battle.wild[0].speciesId),
        phase === 'legendIntro' ? 1400 : 700
      );
      const minWait = new Promise((r) => setTimeout(r, phase === 'legendIntro' ? 2400 : 1800));
      Promise.all([preloadImages(urls), minWait]).then(() => {
        const b = current();
        if (!cancelled && b && (b.phase === 'intro' || b.phase === 'legendIntro')) {
          setBattle(beginSelect(b));
        }
      });
      return () => {
        cancelled = true;
        clearTimeout(cryTimer);
      };
    }

    if (phase === 'attack') {
      const a = battle.lastAttack!;
      if (a.typeMult >= 2) {
        sfx.superHit();
        haptic.superHit();
      } else if (a.typeMult <= 0.5) sfx.weakHit();
      else {
        sfx.hit();
        haptic.hit();
      }
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
      else if (a.typeMult >= 2) {
        sfx.superHit();
        haptic.superHit();
      } else {
        sfx.hit();
        haptic.hit();
      }
      if (battle.player.some((p) => p.hp <= 0)) setTimeout(() => sfx.faint(), 600);
      const t = setTimeout(() => {
        const b = current();
        if (b?.phase === 'enemyAttack') setBattle(continueAfterEnemyAttack(b));
      }, ATTACK_ANIM_MS);
      return () => clearTimeout(t);
    }

    if (phase === 'stageClear') {
      sfx.fanfare();
      const t = setTimeout(() => {
        const b = current();
        if (b?.phase !== 'stageClear') return;
        const next = advanceStage(b);
        setBattle(next);
        markSeen(next.wild.map((w) => w.speciesId));
      }, 2200);
      return () => clearTimeout(t);
    }

    if (phase === 'megaAnim') {
      sfx.zCharge();
      haptic.mega();
      const t = setTimeout(() => {
        const b = current();
        if (b?.phase === 'megaAnim') setBattle(afterMegaAnim(b));
      }, 2400);
      return () => clearTimeout(t);
    }

    if (phase === 'battleEvolution') {
      sfx.evolve();
      haptic.evolve();
      const t = setTimeout(() => {
        const b = current();
        if (b?.phase !== 'battleEvolution' || !b.battleEvo) return;
        const { monIdx, fromId, toId } = b.battleEvo;
        // 소유 디스크면 컬렉션에도 진화 반영 (렌탈은 배틀 한정)
        const mon = b.player[monIdx];
        if (!mon.rental) {
          applyEvolution({ fromId, toId, grade: mon.grade });
        }
        setBattle(applyBattleEvolution(b));
      }, 3000);
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

  // 공격/피격 연출은 메시지를 탭해 즉시 넘길 수 있다 (대기 타이머는 phase가 바뀌면 무효)
  const skippable = battle.phase === 'attack' || battle.phase === 'enemyAttack';
  const skip = () => {
    const b = useGame.getState().battle;
    if (b?.phase === 'attack') setBattle(continueAfterAttack(b));
    else if (b?.phase === 'enemyAttack') setBattle(continueAfterEnemyAttack(b));
  };
  const superFlash =
    (battle.phase === 'attack' || battle.phase === 'enemyAttack') &&
    attack &&
    !attack.dodged &&
    attack.typeMult >= 2;

  return (
    <div
      className={`screen battle battle--${battle.courseId}${
        battle.phase === 'legendIntro' ? ' battle--dark' : ''
      }`}
      style={{ background: course.bg }}
    >
      <div className="battle__scenery" />

      {/* 상단: 포기 + Z게이지 + 스테이지 */}
      <div className="battle__zbar">
        {battle.phase === 'selectMove' && (
          <button
            type="button"
            className="battle__quit"
            onClick={() => {
              sfx.click();
              setShowForfeit(true);
            }}
          >
            ✕
          </button>
        )}
        <span className={`battle__zlabel${zReady ? ' battle__zlabel--ready' : ''}`}>Z</span>
        <div className="battle__ztrack">
          <div
            className={`battle__zfill${zReady ? ' battle__zfill--ready' : ''}`}
            style={{ width: `${battle.zGauge}%` }}
          />
        </div>
        <span className="battle__round">
          {battle.stage === STAGE_COUNT ? '👑보스' : `스테이지 ${battle.stage}/${STAGE_COUNT}`}
        </span>
      </div>
      {battle.gradeBoost && <div className="battle__boost">🎁 등급 UP 찬스 발동 중!</div>}

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
          const targeted = battle.targetOverride === i && w.hp > 0;
          return (
            <div
              key={`${battle.stage}-${i}`}
              className={`battle__slot${targeted ? ' battle__slot--targeted' : ''}`}
              onClick={() => {
                if (battle.phase === 'selectMove' && w.hp > 0) {
                  sfx.click();
                  setBattle(setTarget(battle, i));
                }
              }}
            >
              <HpBar
                hp={w.hp}
                maxHp={w.maxHp}
                label={`${w.shiny ? '✨' : ''}${sp.ko}${w.intruder ? ' ⚠️' : ''}`}
              />
              {targeted && <div className="battle__target-mark">🎯 조준!</div>}
              <div
                className={`battle__sprite-box${hitNow ? ' battle__sprite-box--hit' : ''}${
                  w.shiny ? ' battle__sprite-box--shiny' : ''
                }`}
              >
                {w.caught ? (
                  <div className="battle__caught">🔴 GET!</div>
                ) : w.hp <= 0 && w.catchResolved ? (
                  <div className="battle__escaped" />
                ) : (
                  <img
                    className={`battle__sprite battle__sprite--front${
                      w.hp <= 0 ? ' battle__sprite--fainted' : ''
                    }`}
                    src={w.shiny ? shinyBattleSpriteUrl(w.speciesId, 'front') : battleSpriteUrl(w.speciesId, 'front')}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = w.shiny
                        ? shinyArtworkUrl(w.speciesId)
                        : artworkUrl(w.speciesId);
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
            battle.phase === 'enemyAttack' &&
            !attack?.dodged &&
            !attack?.blocked &&
            attack?.targetIdx === i;
          const blockedNow =
            battle.phase === 'enemyAttack' && attack?.blocked && attack?.targetIdx === i;
          const attacking =
            (battle.phase === 'attack' && attack?.side === 'player' && attack.attackerIdx === i) ||
            (battle.phase === 'rush' && battle.pending?.monIdx === i);
          const megaNow = battle.phase === 'megaAnim' && battle.pending?.monIdx === i;
          const evolvingNow = battle.phase === 'battleEvolution' && battle.battleEvo?.monIdx === i;
          const sprite = playerSpriteUrl(p);
          return (
            <div key={i} className="battle__slot">
              <div
                className={`battle__sprite-box${hitNow ? ' battle__sprite-box--hit' : ''}${
                  attacking ? ' battle__sprite-box--attacking' : ''
                }${megaNow ? ' battle__sprite-box--mega' : ''}${
                  evolvingNow ? ' battle__sprite-box--evolving' : ''
                }`}
              >
                <img
                  className={`battle__sprite battle__sprite--back${
                    p.hp <= 0 ? ' battle__sprite--fainted' : ''
                  }${p.mega ? ' battle__sprite--megaform' : ''}`}
                  style={sprite.mirror ? { transform: 'scaleX(-1)' } : undefined}
                  src={sprite.src}
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
                {blockedNow && (
                  <div key={`b-${battle.round}-${i}`} className="dmg-popup dmg-popup--block">
                    🛡️ 방어!
                  </div>
                )}
              </div>
              <HpBar hp={p.hp} maxHp={p.maxHp} label={`${p.mega ? '메가' : ''}${sp.ko}`} />
            </div>
          );
        })}
      </div>

      {/* 메시지 (공격 연출 중 탭하면 빨리 넘기기) */}
      {message && (
        <div
          className={`message-box${skippable ? ' message-box--skippable' : ''}`}
          onClick={skip}
        >
          {message}
          {skippable && <span className="message-box__skip">▶</span>}
        </div>
      )}

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
                {canMega(battle, i) && (
                  <button
                    type="button"
                    className="move-btn move-btn--mega"
                    onClick={() => {
                      sfx.click();
                      setBattle(chooseMega(battle, i));
                    }}
                  >
                    🔥 메가진화!
                  </button>
                )}
                {sp.moves.map((m, mi) => {
                  const hint = dead ? 1 : moveHint(battle, m.type);
                  return (
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
                      <span className="move-btn__name">
                        {m.ko}
                        {hint >= 2 && <span className="move-btn__hint move-btn__hint--good">💥 효과 굉장!</span>}
                        {hint <= 0.5 && <span className="move-btn__hint move-btn__hint--bad">효과 별로…</span>}
                      </span>
                      <span className="move-btn__power">{m.power}</span>
                    </button>
                  );
                })}
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
            if (b?.phase === 'rush') setBattle(afterRush(b, fill));
          }}
        />
      )}

      {/* 공격 배율 룰렛 */}
      {battle.phase === 'atkRoulette' && (
        <MultiplierRoulette
          mode="attack"
          segments={ATK_ROULETTE}
          onStop={(mult) => {
            const b = useGame.getState().battle;
            if (b?.phase === 'atkRoulette') setBattle(resolveRush(b, b.pendingFill ?? 0, mult));
          }}
        />
      )}

      {/* 방어 배율 룰렛 */}
      {battle.phase === 'defRoulette' && (
        <MultiplierRoulette
          mode="defense"
          segments={DEF_ROULETTE}
          onStop={(mult) => {
            const b = useGame.getState().battle;
            if (b?.phase === 'defRoulette') setBattle(resolveDefense(b, mult));
          }}
        />
      )}

      {/* 겟 찬스 */}
      {battle.phase === 'getChance' && battle.getChanceQueue.length > 0 && (
        <GetChanceOverlay
          key={`${battle.stage}-${battle.getChanceQueue[0]}`}
          speciesId={battle.wild[battle.getChanceQueue[0]].speciesId}
          intruder={battle.wild[battle.getChanceQueue[0]].intruder}
          shiny={battle.wild[battle.getChanceQueue[0]].shiny}
          gradeBoost={battle.gradeBoost}
          recordCatch={recordCatchAttempt}
          onDone={(outcome) => {
            const b = useGame.getState().battle;
            if (b?.phase === 'getChance') setBattle(finishCatch(b, outcome));
          }}
        />
      )}

      {/* 효과 굉장 화면 플래시 */}
      {superFlash && <div className="flash-overlay" />}

      {/* 포기 확인 */}
      {showForfeit && (
        <div className="modal" onClick={() => setShowForfeit(false)}>
          <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal__title">코스를 포기할까요?</div>
            <p className="modal__desc">
              포기하면 패배로 기록돼요.
              <br />
              지금까지 잡은 포켓몬은 그대로 가질 수 있어요!
            </p>
            <button
              type="button"
              className="big-btn modal__btn"
              onClick={() => {
                setShowForfeit(false);
                const b = useGame.getState().battle;
                if (b) setBattle({ ...b, phase: 'defeat' });
              }}
            >
              포기하고 나가기
            </button>
            <button type="button" className="modal__close" onClick={() => setShowForfeit(false)}>
              계속 싸우기!
            </button>
          </div>
        </div>
      )}

      {/* 스테이지 클리어 / 승리 / 패배 배너 */}
      {battle.phase === 'stageClear' && (
        <div className="battle__banner battle__banner--stage">STAGE CLEAR!</div>
      )}
      {(battle.phase === 'victory' || battle.phase === 'defeat') && (
        <div className={`battle__banner battle__banner--${battle.phase}`}>
          {battle.phase === 'victory' ? 'WIN!!' : 'LOSE…'}
        </div>
      )}
    </div>
  );
}
