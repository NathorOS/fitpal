// Subí este número cada vez que cambies archivos (nathorfit-v5, v6, ...)
const CACHE = 'nathorfit-v12';

// "Cascarón" de la app. Las vistas de js/ui/ se cargan con import() dinámico,
// así que TIENEN que estar acá o la app no abre en modo avión.
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest',
  './css/tokens.css', './css/componentes.css', './css/estilos.css',
  './fonts/fredoka-latin.woff2', './fonts/nunito-sans-latin.woff2',
  './js/app.js', './js/db.js', './js/calculos.js', './js/objetivo.js', './js/gato.js',
  './js/registro.js', './js/datos/alimentos.js', './js/actividad.js', './js/estadisticas.js',
  './js/ui/peso.js', './js/ui/actividad.js',
  './js/ayuno.js', './js/puntaje.js', './js/retos.js',
  './js/ui/ayuno.js', './js/ui/resultado.js', './js/ui/racha.js', './js/ui/retos.js',
  './js/entrenamiento.js', './js/datos/ejercicios.js', './js/ui/sesion.js',
  './js/ia.js', './js/codigo.js', './js/ui/ia.js', './js/ui/codigo.js',
  './js/adaptativo.js', './js/sugerencias.js',
  './js/ui/hoy.js', './js/ui/registrar.js', './js/ui/entrenar.js',
  './js/ui/progreso.js', './js/ui/perfil.js', './js/ui/onboarding.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' saltea la caché HTTP del navegador: si no, una versión nueva podría
  // guardar copias viejas de los archivos y la app quedaría desactualizada.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))));
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
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/dev/')) return;   // páginas de prueba: siempre frescas, nunca en caché
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
