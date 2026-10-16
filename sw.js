
const CACHE_NAME = 'profix-v2';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// Cài đặt và lưu các file cốt lõi
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const file of APP_FILES) {
          try {
            await cache.add(file);
          } catch (error) {
            console.warn('Không thể lưu cache:', file, error);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Kích hoạt và xóa cache phiên bản cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Xử lý yêu cầu GET cùng nguồn
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Không can thiệp yêu cầu tới CDN hoặc máy chủ khác
  if (url.origin !== self.location.origin) return;

  // Tải trang từ mạng trước; mất mạng thì dùng bản cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match('./index.html') ||
            Response.error()
          );
        })
    );
    return;
  }

  // Các file cùng nguồn: ưu tiên cache, sau đó tải mạng
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
