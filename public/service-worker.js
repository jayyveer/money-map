// Basic service worker for PWA functionality
const CACHE_NAME = 'moneymap-cache-v1';

// Simple cache for static assets
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache basic files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Simple network-first strategy for fetch events
self.addEventListener('fetch', (event) => {
  // Skip Supabase API requests and other non-GET requests
  if (event.request.method !== 'GET' ||
      event.request.url.includes('supabase.co') ||
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // If network request fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});
