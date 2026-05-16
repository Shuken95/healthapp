// ══════════════════════════════════════════════════════════════
//  HealthAPP — Service Worker
//  Estrategia: Cache-first para recursos estáticos + actualización
//  automática en background (stale-while-revalidate para index.html)
// ══════════════════════════════════════════════════════════════

const APP_VERSION   = 'healthapp-v17';
const CACHE_STATIC  = `${APP_VERSION}-static`;
const CACHE_DYNAMIC = `${APP_VERSION}-dynamic`;

// Recursos que se cachean en el install (shell de la app)
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
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      // Cacheamos recursos uno a uno para que un fallo no rompa todo
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] No se pudo cachear:', url, err)
          )
        )
      );
    }).then(() => self.skipWaiting()) // Activa el nuevo SW sin esperar
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
    ).then(() => self.clients.claim()) // Toma control de todas las tabs abiertas
  );
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptamos llamadas a la API de Anthropic ni a Supabase
  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // index.html → Stale-While-Revalidate: sirve caché rápido pero actualiza en background
  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.endsWith('/')
  ) {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }

  // Iconos y manifest → Cache-first (no cambian sin cambiar nombre)
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Fuentes de Google → Cache-first con caché dinámica
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, CACHE_DYNAMIC));
    return;
  }

  // Resto → Network-first con fallback a caché
  event.respondWith(networkFirst(request, CACHE_DYNAMIC));
});

// ── ESTRATEGIAS DE CACHÉ ──────────────────────────────────────

// Cache-first: devuelve caché si existe, si no descarga y cachea
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

// Network-first: intenta red, si falla devuelve caché
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

// Stale-While-Revalidate: sirve caché al instante y actualiza en background
// Si no hay caché, descarga de red. Al terminar, notifica a las tabs abiertas
// para que muestren el banner "Nueva versión disponible".
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(async response => {
      if (!response.ok) return response;
      const cachedResponse = await cache.match(request);
      const newEtag  = response.headers.get('ETag') || response.headers.get('Last-Modified') || '';
      const oldBytes = cachedResponse ? await cachedResponse.clone().text().catch(() => '') : '';
      const newBytes = await response.clone().text().catch(() => '');

      await cache.put(request, response.clone());

      // Notificar a los clientes que hay actualización disponible
      if (cached && oldBytes && newBytes && oldBytes !== newBytes) {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATE_AVAILABLE' }));
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response('Sin conexión', { status: 503 });
}

// ── MENSAJES DESDE LA APP ─────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
