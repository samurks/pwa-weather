const CACHE_NAME = 'weather-app-v2';
const API_CACHE_NAME = 'weather-api-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/src/main.js',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.url.includes('api.openweathermap.org')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return fetch(request).then((response) => {
          cache.put(request, response.clone());
          return response;
        }).catch(() => {
          return cache.match(request);
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});