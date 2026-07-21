/* =========================================================
   Hypoxia Guard 서비스 워커
   - 앱 셸(index.html, manifest, 아이콘)을 캐시하여
     오프라인 상태에서도 앱이 실행되도록 지원한다.
   - 캐시 이름에 버전을 명시해두면, 파일 내용을 수정한 뒤
     버전 문자열만 바꿔서 새 캐시로 손쉽게 교체할 수 있다.
========================================================= */
const CACHE_VERSION = 'hypoxia-guard-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// 설치 시: 앱 셸 파일들을 미리 캐시에 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// 활성화 시: 이전 버전의 캐시는 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 요청 처리: 캐시 우선(cache-first), 없으면 네트워크 요청 후 캐시에 저장
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // 정상 응답이면 캐시에도 저장해두어 다음 오프라인 접속에 대비
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // 네트워크도 실패하고 캐시도 없는 경우, 기본 페이지라도 반환 시도
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
