// 이미지는 빌드 시 다운로드해 함께 배포 (public/sprites/) — 외부 CDN 의존 없음
const BASE = `${import.meta.env.BASE_URL}sprites`;

export const artworkUrl = (id: number) => `${BASE}/artwork/${id}.png`;

/** 그리드용 경량 썸네일 (~10KB) — 도감/컬렉션/팀선택에 사용 */
export const thumbUrl = (id: number) => `${BASE}/thumb/${id}.webp`;

export const battleSpriteUrl = (id: number, side: 'front' | 'back') =>
  `${BASE}/${side}/${id}.gif`;

// 샤이니(색이 다른 포켓몬)는 드물게만 등장 — 빌드에 포함하지 않고 PokeAPI에서 핫링크
const PA = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
export const shinyArtworkUrl = (id: number) => `${PA}/other/official-artwork/shiny/${id}.png`;
export const shinyBattleSpriteUrl = (id: number, side: 'front' | 'back') =>
  // 샤이니 뒷모습 showdown GIF는 없으므로 뒷면은 일반 GIF로 폴백
  side === 'front' ? `${PA}/other/showdown/shiny/${id}.gif` : `${BASE}/back/${id}.gif`;

/** 이미지 프리로드 (실패/타임아웃해도 게임은 진행) */
export function preloadImages(urls: string[], timeoutMs = 6000): Promise<void> {
  const loads = urls.map(
    (url) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      })
  );
  const timeout = new Promise<void>((r) => setTimeout(r, timeoutMs));
  return Promise.race([Promise.all(loads).then(() => undefined), timeout]);
}
