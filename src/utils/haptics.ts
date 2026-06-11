// 진동 피드백 (안드로이드 지원, iOS는 무시됨)
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export const haptic = {
  tap: () => canVibrate && navigator.vibrate(8),
  hit: () => canVibrate && navigator.vibrate(35),
  superHit: () => canVibrate && navigator.vibrate([40, 30, 60]),
  catch: () => canVibrate && navigator.vibrate([60, 60, 120]),
  evolve: () => canVibrate && navigator.vibrate([40, 40, 40, 40, 150]),
  mega: () => canVibrate && navigator.vibrate([100, 50, 200]),
};
