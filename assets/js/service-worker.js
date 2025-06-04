// service-worker.js
const CACHE_NAME = "bhy-cache-v1";
const urlsToCache = [
  "/",
  "/info.html",
  "/bondCalculator.html",
  "/rankingManager.html",
  "/soulCalculator.html",
  "/chak.html",
  "/version.json",
  "/assets/css/main.css",
  "/assets/js/version-checker.js",
];

// 서비스 워커 설치 및 리소스 캐싱
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("캐시 열림");
      return cache.addAll(urlsToCache);
    })
  );
});

// 네트워크 요청 가로채기 및 캐시된 응답 반환
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 캐시에 있으면 캐시 응답 반환
      if (response) {
        return response;
      }

      // 캐시에 없으면 네트워크 요청
      return fetch(event.request).then((response) => {
        // 유효한 응답이 아니면 바로 반환
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // 응답 복제 (stream은 한 번만 사용 가능)
        const responseToCache = response.clone();

        // 응답을 캐시에 저장
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// 이전 캐시 삭제
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // 이전 캐시 삭제
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 서비스 워커 메시지 처리
self.addEventListener("message", (event) => {
  if (event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
