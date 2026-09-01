// Petrofuel PWA Service Worker
// Automatically versioned by deploy_web.py on every release
const CACHE_NAME = 'petrofuel-v1.0.25-b62';

// Core application shell files to pre-cache (using universal relative paths)
const CORE_ASSETS = [
    './',
    './index.html',
    './flutter_bootstrap.js',
    './flutter.js',
    './main.dart.js',
    './manifest.json',
    './version.json',
    './favicon.png',
    './icons/Icon-192.png'
];

// INSTALL EVENT: Pre-cache core shell & immediately skip waiting
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-caching core assets for:', CACHE_NAME);
            return cache.addAll(CORE_ASSETS).catch((err) => {
                console.warn('[Service Worker] Non-fatal pre-cache warning:', err);
            });
        })
    );
});

// ACTIVATE EVENT: Claim clients and purge stale caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Purging old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

// Helper: Determine if request is a core code script or dynamic entry
function isCodeOrDocument(url) {
    const path = url.pathname;
    return (
        path === '/' ||
        path.endsWith('/index.html') ||
        path.endsWith('/flutter_bootstrap.js') ||
        path.endsWith('/main.dart.js') ||
        path.endsWith('/flutter.js') ||
        path.endsWith('.wasm') ||
        path.endsWith('/version.json') ||
        path.endsWith('/manifest.json')
    );
}

// FETCH EVENT:
// - Network-First for core executable scripts & version metadata (prevents stale code execution)
// - Cache-First for static assets (images, fonts, icons)
// - Always fallback to cache when offline
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Only intercept same-origin requests (let external API calls pass through)
    if (url.origin !== self.location.origin) return;

    if (isCodeOrDocument(url)) {
        // NETWORK-FIRST: Try fresh network fetch, update cache, fall back to cache when offline
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Offline fallback: Serve from cache
                    return caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html').then((idx) => {
                                if (idx) return idx;
                                return caches.match('/index.html').then((idx2) => idx2 || caches.match('./'));
                            });
                        }
                    });
                })
        );
    } else {
        // CACHE-FIRST: Fast response for static media/assets with network fallback
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    // Offline fallback for assets
                    return caches.match(event.request);
                });
            })
        );
    }
});

// MESSAGE EVENT: Support manual skipWaiting action
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});