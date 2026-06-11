// 포켓몬 가오레 서비스 워커: 앱 셸은 네트워크 우선, 스프라이트는 캐시 우선
const VERSION = 'gaole-v2';
const RUNTIME = `${VERSION}-runtime`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(RUNTIME));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 해시가 붙은 빌드 산출물 + 스프라이트는 캐시 우선 (불변)
  const cacheFirst = url.pathname.includes('/sprites/') || url.pathname.includes('/assets/');

  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME);
      if (cacheFirst) {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      }
      // 그 외(index.html 등)는 네트워크 우선, 실패 시 캐시 (오프라인 지원)
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
