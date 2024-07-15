// Define the cache name
const CACHE_NAME = 'deePlan-v1';

const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/scripts.js',
  './images/dmj.jpg',
  './images/apple-touch-icon.png',
  './images/favicon-32x32.png',
  './images/favicon-16x16.png',
  './images/safari-pinned-tab.svg',
  './images/favicon.ico',
  './images/android-chrome-192x192.png',
  './images/android-chrome-384x384.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('Opened cache');
          return Promise.all(
            urlsToCache.map(url => {
              return fetch(url).then(response => {
                if (!response.ok) {
                  throw new TypeError(`Failed to fetch ${url}`);
                }
                return cache.put(url, response);
              }).catch(error => {
                console.error(`Failed to cache ${url}: ${error.message}`);
              });
            })
          );
        })
    );
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
  });