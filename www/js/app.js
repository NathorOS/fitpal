import { abrirDB, obtener } from './db.js';

const vistas = {
  '/hoy':        () => import('./ui/hoy.js'),
  '/registrar':  () => import('./ui/registrar.js'),
  '/peso':       () => import('./ui/peso.js'),
  '/actividad':  () => import('./ui/actividad.js'),
  '/ayuno':      () => import('./ui/ayuno.js'),
  '/sesion':     () => import('./ui/sesion.js'),
  '/ia':         () => import('./ui/ia.js'),
  '/codigo':     () => import('./ui/codigo.js'),
  '/resultado':  () => import('./ui/resultado.js'),
  '/racha':      () => import('./ui/racha.js'),
  '/retos':      () => import('./ui/retos.js'),
  '/entrenar':   () => import('./ui/entrenar.js'),
  '/entrenador': () => import('./ui/entrenador.js'),
  '/progreso':   () => import('./ui/progreso.js'),
  '/perfil':     () => import('./ui/perfil.js'),
  '/datos':      () => import('./ui/datos.js'),
  '/onboarding': () => import('./ui/onboarding.js'),
  '/logro':      () => import('./ui/logro.js'),
};
// Pantallas de pantalla completa: sin barra inferior y con fondo blanco.
const COMPLETAS = { '/onboarding': 'modo-onboarding', '/registrar': 'modo-registrar', '/peso': 'modo-registrar', '/actividad': 'modo-registrar',
  '/ayuno': 'modo-registrar', '/sesion': 'modo-registrar', '/ia': 'modo-registrar', '/codigo': 'modo-registrar', '/datos': 'modo-registrar', '/resultado': 'modo-resultado', '/racha': 'modo-resultado', '/logro': 'modo-resultado' };

const cont = document.getElementById('vista');
const tabs = document.getElementById('tabs');
let turno = 0; // evita que una navegación vieja pise a una más nueva

/** "#/hoy?fecha=2026-11-20" → { ruta: '/hoy', params: URLSearchParams } */
export function leerHash(hash = location.hash) {
  const [r, q = ''] = hash.slice(1).split('?');
  return { ruta: vistas[r] ? r : '/hoy', params: new URLSearchParams(q) };
}

async function navegar() {
  const mio = ++turno;
  const { ruta, params } = leerHash();
  cerrarMenu();

  // Un perfil "provisional" (del esqueleto de la Fase 0) o incompleto vuelve a pedir los datos.
  const perfil = await obtener('perfil', 'main');
  const completo = perfil && !perfil.provisional && perfil.sexo && perfil.nacimiento;
  if (!completo && ruta !== '/onboarding') { location.hash = '#/onboarding'; return; }
  if (completo && ruta === '/onboarding') { location.hash = '#/hoy'; return; }

  const modulo = await vistas[ruta]();
  if (mio !== turno) return;

  // Cada pantalla se dibuja en su propio contenedor: si el usuario cambia de pantalla mientras esta
  // todavía carga, lo que termine de dibujar tarde queda en un contenedor que ya no está a la vista
  // y no puede tapar a la pantalla nueva.
  const lugar = document.createElement('div');
  lugar.className = 'pantalla';
  cont.replaceChildren(lugar);
  for (const clase of new Set(Object.values(COMPLETAS))) document.body.classList.toggle(clase, COMPLETAS[ruta] === clase);
  tabs.hidden = Boolean(COMPLETAS[ruta]);
  try {
    await modulo.montar(lugar, params);
  } catch (err) {
    console.error(err);
    lugar.innerHTML = '<div class="tarjeta"><h2>Algo no salió bien</h2><p class="suave">Probá recargar la app. Tus datos están guardados en el teléfono.</p></div>';
  }
  if (mio !== turno) return;
  tabs.querySelectorAll('.nav a').forEach(a => {
    if (a.getAttribute('href') === '#' + ruta) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

// --- Menú del "+" ---
const menu = document.getElementById('menu-mas');
const fab = document.getElementById('abrir-mas');

function abrirMenu() {
  // Si estás mirando otro día en Hoy, lo que agregues va a ese día.
  const { ruta, params } = leerHash();
  const fecha = ruta === '/hoy' ? params.get('fecha') : null;
  menu.querySelectorAll('a[data-destino]').forEach(a => {
    const p = new URLSearchParams(a.dataset.destino);
    if (fecha) p.set('fecha', fecha);
    const qs = p.toString();
    a.href = `#${a.dataset.ruta || '/registrar'}${qs ? '?' + qs : ''}`;
  });
  menu.dataset.fecha = fecha ?? '';
  menu.showModal();
  fab.setAttribute('aria-expanded', 'true');
}
function cerrarMenu() {
  if (menu.open) menu.close();
}
menu.addEventListener('close', () => fab.setAttribute('aria-expanded', 'false'));
fab.addEventListener('click', () => (menu.open ? cerrarMenu() : abrirMenu()));
// Tocar afuera del panel cierra.
menu.addEventListener('click', async e => {
  if (e.target === menu) return cerrarMenu();
  // Agua: un toque suma un vaso, sin salir de donde estás.
  if (e.target.closest('[data-agua]')) {
    const { sumarAgua } = await import('./actividad.js');
    const { hoy } = await import('./db.js');
    await sumarAgua(menu.dataset.fecha || hoy(), 250);
    try { sessionStorage.setItem('nathorfit-aviso', '💧 +250 ml de agua'); sessionStorage.setItem('nathorfit-pose', 'tomando-agua'); } catch { /* nada */ }
    cerrarMenu();
    navegar();
  }
});

window.addEventListener('hashchange', navegar);
await abrirDB();
// El personaje: etapa, limpieza y equipo se calculan al abrir, y cualquier pantalla que lo dibuje se llena sola.
try {
  const [{ leerDatos, personajeDe }, { fijarPersonaje }] = await Promise.all([import('./juego.js'), import('./ui/pj.js')]);
  const datos = await leerDatos();
  if (datos.perfil) fijarPersonaje(personajeDe(datos));
} catch (err) { console.error(err); }
import('./ui/pj.js').then(({ hidratar }) => {
  let pendiente = false;
  new MutationObserver(() => {
    if (pendiente) return;
    pendiente = true;
    queueMicrotask(() => { pendiente = false; hidratar(document); });
  }).observe(document.body, { childList: true, subtree: true });
});
navegar();
// En desarrollo (localhost) no se usa el service worker, para ver siempre los archivos nuevos.
// Para probar el modo sin conexión en local: agregar ?sw=1 a la dirección.
const enDesarrollo = ['localhost', '127.0.0.1'].includes(location.hostname) && !new URLSearchParams(location.search).has('sw');
if ('serviceWorker' in navigator && !enDesarrollo) {
  // Si había una versión anterior y se instala una nueva, recargamos una vez para mostrarla
  // (si no, la persona ve la versión vieja hasta abrir la app por segunda vez).
  const habiaVersion = Boolean(navigator.serviceWorker.controller);
  let recargado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaVersion && !recargado) { recargado = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js');
}
