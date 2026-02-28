// Simple vanilla service worker for offline caching
const CACHE_NAME = 'smart-college-v1';
const OFFLINE_URLS = [
    '/',
    '/login',
    '/timetable',
    '/exams',
    '/invigilator',
    '/notifications',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(OFFLINE_URLS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);

    // Cache API responses for offline viewing
    if (url.pathname.startsWith('/api/timetable') ||
        url.pathname.startsWith('/api/exams') ||
        url.pathname.startsWith('/api/invigilator') ||
        url.pathname.startsWith('/api/notifications')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                try {
                    const response = await fetch(event.request);
                    cache.put(event.request, response.clone());
                    return response;
                } catch {
                    return cache.match(event.request) || new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } });
                }
            })
        );
        return;
    }

    // Network first, fallback to cache
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});

self.addEventListener('push', (event) => {
    const data = event.data?.json() || { title: 'SmartCollege', body: 'You have a new notification' };
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            data: data.data,
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
