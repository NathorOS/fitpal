import { abrirDB, obtener } from './db.js';

const vistas = {
  '/hoy':        () => import('./ui/hoy.js'),
  '/registrar':  () => import('./ui/registrar.js'),
  '/entrenar':   () => import('./ui/entrenar.js'),
  '/progreso':   () => import('./ui/progreso.js'),
  '/perfil':     () => import('./ui/perfil.js'),
  '/onboarding': () => import('./ui/onboarding.js'),
};

const cont = document.getElementById('vista');
const tabs = document.getElementById('tabs');
let turno = 0; // evita que una navegación vieja pise a una más nueva

async function navegar() {
  const mio = ++turno;
  let ruta = location.hash.slice(1) || '/hoy';
  if (!vistas[ruta]) ruta = '/hoy';

  const perfil = await obtener('perfil', 'main');
  if (!perfil && ruta !== '/onboarding') { location.hash = '#/onboarding'; return; }
  if (perfil && ruta === '/onboarding') { location.hash = '#/hoy'; return; }

  const modulo = await vistas[ruta]();
  if (mio !== turno) return;

  cont.innerHTML = '';
  try {
    await modulo.montar(cont);
  } catch (err) {
    console.error(err);
    cont.innerHTML = '<div class="tarjeta"><h2>Algo salió mal</h2><p>Probá recargar la app.</p></div>';
  }
  tabs.querySelectorAll('a').forEach(a =>
    a.classList.toggle('activa', a.getAttribute('href') === '#' + ruta));
  tabs.hidden = ruta === '/onboarding';
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', navegar);
await abrirDB();
navegar();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
