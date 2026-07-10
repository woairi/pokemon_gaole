// 포켓몬 가오레 서비스 워커
// - 스프라이트: 영구 캐시 (id 기반 불변 — 배포해도 재다운로드 없음)
// - 앱 셸/번들: 배포 버전별 캐시 (새 배포 시 이전 버전 정리)
// 20260710000938는 빌드 시 타임스탬프로 치환된다 (scripts/stamp-sw.mjs)
const BUILD = '20260710000938';
const SPRITES_CACHE = 'gaole-sprites';
const APP_CACHE = `gaole-app-${BUILD}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(APP_CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SPRITES_CACHE && k !== APP_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isSprite = url.pathname.includes('/sprites/');
  const isHashedAsset = url.pathname.includes('/assets/');

  event.respondWith(
    (async () => {
      const cache = await caches.open(isSprite ? SPRITES_CACHE : APP_CACHE);
      if (isSprite || isHashedAsset) {
        // 불변 리소스: 캐시 우선
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      }
      // 그 외(index.html 등): 네트워크 우선, 실패 시 캐시 (오프라인 지원)
      try {
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      } catch {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        throw new Error('offline');
      }
    })()
  );
});
