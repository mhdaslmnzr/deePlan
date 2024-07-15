const CACHE_NAME = 'deeplan-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/scripts.js',
  '/images/apple-touch-icon.png',
  '/images/dmj.jpg',
  '/images/favicon.ico',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
          .catch((error) => {
            console.error('Failed to cache some or all URLs:', error);
          });
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request)
          .catch((error) => {
            console.error('Fetch failed for:', event.request.url, error);
          });
      })
  );
});
