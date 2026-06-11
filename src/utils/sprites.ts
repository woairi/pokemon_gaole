const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

export const artworkUrl = (id: number) => `${SPRITES}/other/official-artwork/${id}.png`;

export const battleSpriteUrl = (id: number, side: 'front' | 'back') =>
  side === 'front'
    ? `${SPRITES}/other/showdown/${id}.gif`
    : `${SPRITES}/other/showdown/back/${id}.gif`;

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
