// Service worker mínimo: deixa o painel "instalável" e abre a casca do site
// mesmo com internet ruim. Os dados (API, outra origem) nunca são guardados:
// sempre vêm da rede. Página: rede primeiro, cache só se a rede falhar.
const CACHE = 'ag-painel-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Notificações (2026-11-24): a API manda { title, body, open? } por Web Push.
// Tocar abre o painel no pedido/cotação (open = { kind, id }).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'AG Painel', {
      body: data.body || '',
      icon: '/icon-256.png',
      badge: '/icon-256.png',
      data: { open: data.open || null },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const open = event.notification.data && event.notification.data.open;
  const valid = open && (open.kind === 'sale' || open.kind === 'quote') && Number.isInteger(open.id);
  const url = valid ? `/?abrir=${open.kind}-${open.id}` : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const win = list.find((c) => new URL(c.url).origin === self.location.origin);
      if (win) {
        if (valid) win.postMessage({ type: 'ag-abrir', open });
        return win.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
  );
});
