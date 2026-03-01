// A basic service worker to enable PWA installation and offline caching

const CACHE_NAME = 'myquant-portfolio-cache-v1';
const urlsToCache = [
    '/',
    '/trade',
    '/profile',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(() => {
                    // You could return an offline fallback page here if caching fails
                });
            }
            )
    );
});
