// ═══════════════════════════════════════════════
// NURA — Service Worker v3
// Offline completo + Push Notifications
// ═══════════════════════════════════════════════

const CACHE_NAME = 'nura-v1.0';
const OFFLINE_URL = './index.html';

// Recursos críticos que se cachean en el install
const PRECACHE = [
  './index.html',
  './manifest.json',
];

// ── INSTALL ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH — Estrategia: Network first, Cache fallback ──
self.addEventListener('fetch', event => {
  const req = event.request;

  // Solo interceptar GET del mismo origen o CDNs conocidas
  if (req.method !== 'GET') return;

  // No interceptar llamadas a APIs externas (Google Fit, Supabase, Anthropic, Groq)
  const url = new URL(req.url);
  const externalAPIs = [
    'googleapis.com', 'supabase.co', 'anthropic.com',
    'groq.com', 'openai.com', 'accounts.google.com'
  ];
  if (externalAPIs.some(api => url.hostname.includes(api))) return;

  event.respondWith(
    fetch(req)
      .then(response => {
        // Guardar en caché si es respuesta válida
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin red → devolver desde caché
        return caches.match(req).then(cached => {
          if (cached) return cached;
          // Si es navegación (HTML), devolver la app principal
          if (req.mode === 'navigate') return caches.match(OFFLINE_URL);
          return new Response('Sin conexión', { status: 503 });
        });
      })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'Nura', body: 'Tienes un recordatorio pendiente.' };
  try { data = event.data?.json() || data; } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'nura-reminder',
      renotify: true,
      data: { url: self.location.origin }
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Si la app ya está abierta, enfocarla
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      // Si no, abrirla
      return clients.openWindow(event.notification.data?.url || self.location.origin);
    })
  );
});

// ── SKIP WAITING (para actualizaciones) ───────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
