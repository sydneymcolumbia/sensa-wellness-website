const CACHE_NAME = 'sensa-v2';
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/blog.html',
    '/pay-now.html',
    '/styles.css',
    '/logo.jpg',
    '/favicon.png',
    '/sensa-og.jpg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Only same-origin, unauthenticated, non-JSON, non-API, non-admin GETs are
// ever handled by this worker. Everything else is left to the browser so no
// user data (API JSON, admin pages, Google/Firebase responses) can land in
// Cache Storage.
function shouldHandle(request) {
    if (request.method !== 'GET') return false;

    let url;
    try {
        url = new URL(request.url);
    } catch (e) {
        return false;
    }
    if (url.origin !== self.location.origin) return false;
    if (url.pathname.startsWith('/api/')) return false;
    if (url.pathname.startsWith('/admin')) return false;

    if (request.headers.has('Authorization')) return false;

    const accept = (request.headers.get('Accept') || '').toLowerCase();
    if (accept.includes('application/json') && !accept.includes('text/html')) return false;

    return true;
}

// Cache only plain same-origin 200 responses that the server has not
// marked no-store.
function isCacheable(response) {
    if (!response || response.status !== 200 || response.type !== 'basic') return false;
    const cacheControl = (response.headers.get('Cache-Control') || '').toLowerCase();
    if (cacheControl.includes('no-store')) return false;
    return true;
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (!shouldHandle(request)) return;

    event.respondWith(
        fetch(request)
            .then(response => {
                if (isCacheable(response)) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
