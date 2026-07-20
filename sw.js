const CACHE_NAME = 'petrofuel-core-v1';

// Add all core application shell files here
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/flutter_bootstrap.js',
    '/flutter.js',
    '/main.dart.js',
    '/manifest.json',
    '/favicon.png',
    '/icons/Icon-192.png'
];

// INSTALL EVENT: Cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching core assets');
            return cache.addAll(CORE_ASSETS);
        })
    );
});

// ACTIVATE EVENT: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// FETCH EVENT: Cache falling back to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. Return cached response if found (enables 100% offline support for core shell)
            if (cachedResponse) {
                return cachedResponse;
            }
            // 2. Fall back to network
            return fetch(event.request);
        }).catch(() => {
            // Optional: Add a custom offline page fallback here if needed
            console.error('[Service Worker] Fetch failed and no cache found for:', event.request.url);
        })
    );
});

// MESSAGE EVENT: Force activation when update is found
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});