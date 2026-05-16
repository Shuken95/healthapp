// ══════════════════════════════════════════════════════════════
//  HealthAPP — Service Worker
//  Estrategia: Cache-first para recursos estáticos + actualización
//  manual controlada por el usuario (banner)
// ══════════════════════════════════════════════════════════════

const APP_VERSION   = 'healthapp-v18';
const CACHE_STATIC  = `${APP_VERSION}-static`;
const CACHE_DYNAMIC = `${APP_VERSION}-dynamic`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
];

// ── INSTALL ──────────────────────────────────────────────────
// ⚠️  NO llamamos a self.skipWaiting() aquí.
//     Si lo hiciéramos, el SW nuevo se activaría solo sin que el
//     usuario lo pida, dejando la página cargada con recursos
//     del SW anterior → pantalla rota + banner fantasma en cada carga.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache =>
      Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] No se pudo cachear:', url, err)
          )
        )
      )
    )
    // Sin self.skipWaiting() → el SW queda en "waiting" hasta que
    // el usuario pulse "Actualizar" en el banner.
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_STATIC && key !== CACHE_DYNAMIC)
          .map(key => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    request.method !== 'GET'
  ) {
    return;
  }

  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.endsWith('/')
  ) {
    event.respondWith(networkFirst(request, CACHE_STATIC));
    return;
  }

  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, CACHE_DYNAMIC));
    return;
  }

  event.respondWith(networkFirst(request, CACHE_DYNAMIC));
});

// ── ESTRATEGIAS DE CACHÉ ──────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Sin conexión', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Sin conexión', { status: 503 });
  }
}

// ── MENSAJES DESDE LA APP ─────────────────────────────────────
// El único sitio donde se llama skipWaiting es aquí,
// cuando el usuario pulsa "Actualizar" en el banner.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
