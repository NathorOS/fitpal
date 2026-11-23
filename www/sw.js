// Subí este número cada vez que cambies archivos (fitpal-v2, v3, ...)
const CACHE = 'fitpal-v1';

// "Cascarón" de la app. Las vistas de js/ui/ se cargan con import() dinámico,
// así que TIENEN que estar acá o la app no abre en modo avión.
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest', './css/estilos.css',
  './js/app.js', './js/db.js', './js/calculos.js',
  './js/ui/hoy.js', './js/ui/registrar.js', './js/ui/entrenar.js',
  './js/ui/progreso.js', './js/ui/perfil.js', './js/ui/onboarding.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first para archivos propios; lo que no esté en caché se baja y se guarda
// (así un archivo que te olvidaste de sumar a ARCHIVOS igual queda offline
// después de la primera visita). Pedidos a otros dominios (IA, Open Food Facts)
// van siempre a la red.
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then(r => r || fetch(request).then(res => {
      if (res.ok) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(request, copia));
      }
      return res;
    }))
  );
});
