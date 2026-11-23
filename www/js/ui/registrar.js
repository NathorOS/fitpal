// Fase 2 — Registrar una comida: buscar, elegir cantidad, armar la comida y anotarla.
// Parámetros del hash: fecha=YYYY-MM-DD · modo=rapido|nuevo · tab=mias · editar=<id de comida>
import { hoy as fechaHoy } from '../db.js';
import { metaVigente } from '../objetivo.js';
import {
  MOMENTOS, momentoPorHora, buscar, calcularItem, itemRapido, sumar, textoCantidad,
  todosLosAlimentos, alimentosPropios, obtenerAlimento, guardarAlimentoPropio,
  favoritos, alternarFavorito, recientes, guardarComida, obtenerComida, borrarComida, comidasDelDia,
} from '../registro.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });
const leerNum = s => Number(String(s ?? '').replace(',', '.'));
const z = n => String(n).padStart(2, '0');

export async function montar(c, params = new URLSearchParams()) {
  const ahora = new Date();
  const estado = {
    id: null,
    fecha: params.get('fecha') || fechaHoy(ahora),
    hora: `${z(ahora.getHours())}:${z(ahora.getMinutes())}`,
    momento: momentoPorHora(ahora.getHours()),
    items: [],
    tab: params.get('tab') === 'mias' ? 'mias' : 'recientes',
    q: params.get('q') ?? '',
  };

  // Editar una comida ya anotada
  if (params.get('editar')) {
    const comida = await obtenerComida(params.get('editar'));
    if (comida) Object.assign(estado, { id: comida.id, fecha: comida.fecha, hora: comida.hora, momento: comida.momento, items: [...comida.items] });
  }

  // Lo que encontró la IA llega como carrito para revisar antes de anotar.
  let desdeIA = false;
  if (params.get('desde') === 'ia') {
    try {
      const items = JSON.parse(sessionStorage.getItem('nathorfit-carrito') ?? '[]');
      sessionStorage.removeItem('nathorfit-carrito');
      if (Array.isArray(items) && items.length) { estado.items = items; desdeIA = true; }
    } catch { /* nada */ }
  }

  let catalogo = await todosLosAlimentos();
  let favs = new Set(await favoritos());

  c.innerHTML = `
    <section class="reg">
      <header class="reg__top">
        <a class="icono-btn" href="${volverHref(estado.fecha)}" aria-label="Cerrar">✕</a>
        <h1 tabindex="-1">${estado.id ? 'Editar comida' : 'Agregar comida'}</h1>
      </header>
      <div class="reg__cuando">
        <div class="reg__momentos" role="radiogroup" aria-label="Momento del día"></div>
        <button class="chip" id="btn-cuando" aria-expanded="false"></button>
        <div class="reg__cuando-campos" hidden>
          <label>Día <input type="date" id="in-fecha" class="campo-texto" max="${fechaHoy()}"></label>
          <label>Hora <input type="time" id="in-hora" class="campo-texto"></label>
        </div>
      </div>
      ${desdeIA ? '<p class="aviso-ia">✨ Revisá lo que encontró la IA: tocá cada alimento para corregir la cantidad o las calorías, o sacalo con ✕.</p>' : ''}
      <div class="reg__buscar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <label class="visualmente-oculto" for="q">Buscar un alimento</label>
        <input id="q" type="search" placeholder="Buscá: milanesa, mate, empanada…" autocomplete="off" enterkeyhint="search">
      </div>
      <div class="seg" role="group" id="tabs-reg">
        <button data-tab="recientes">Recientes</button>
        <button data-tab="mias">Mis comidas</button>
      </div>
      <div id="lista" class="reg__lista" aria-live="polite"></div>
      <div class="reg__extras">
        <button class="btn btn--secundario" data-abrir="rapido">⚡ Registro rápido (solo calorías)</button>
        <button class="btn btn--secundario" data-abrir="nuevo">✏️ Crear un alimento</button>
      </div>
    </section>
    <div class="carrito" id="carrito" hidden></div>
    <dialog class="hoja-dialogo" id="hoja" aria-labelledby="hoja-titulo"></dialog>`;

  const $ = s => c.querySelector(s);
  const lista = $('#lista');

  // --- Cuándo ---
  function pintarCuando() {
    $('.reg__momentos').innerHTML = MOMENTOS.map(m =>
      `<button class="chip chip--opcion" role="radio" aria-checked="${m.id === estado.momento}" data-momento="${m.id}">${m.emoji} ${m.nombre}</button>`).join('');
    const etiquetaDia = estado.fecha === fechaHoy() ? 'Hoy'
      : new Date(estado.fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    $('#btn-cuando').innerHTML = `🕒 ${esc(etiquetaDia)} a las ${esc(estado.hora)} <span class="suave">· cambiar</span>`;
    $('#in-fecha').value = estado.fecha;
    $('#in-hora').value = estado.hora;
  }
  $('.reg__momentos').addEventListener('click', e => {
    const b = e.target.closest('[data-momento]');
    if (b) { estado.momento = b.dataset.momento; pintarCuando(); }
  });
  $('#btn-cuando').addEventListener('click', () => {
    const campos = $('.reg__cuando-campos');
    campos.hidden = !campos.hidden;
    $('#btn-cuando').setAttribute('aria-expanded', String(!campos.hidden));
  });
  $('#in-fecha').addEventListener('change', e => { if (e.target.value) { estado.fecha = e.target.value; pintarCuando(); } });
  $('#in-hora').addEventListener('change', e => {
    if (!e.target.value) return;
    estado.hora = e.target.value;
    if (!estado.id) estado.momento = momentoPorHora(Number(estado.hora.slice(0, 2)));
    pintarCuando();
  });

  // --- Lista ---
  async function pintarLista() {
    c.querySelectorAll('#tabs-reg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === estado.tab)));
    $('#tabs-reg').hidden = Boolean(estado.q);
    let filas, vacio;
    if (estado.q) {
      filas = buscar(estado.q, catalogo);
      vacio = `No encontré "${esc(estado.q)}". Podés <button class="enlace" data-abrir="nuevo">crearlo</button> o usar el <button class="enlace" data-abrir="rapido">registro rápido</button>.`;
    } else if (estado.tab === 'mias') {
      const propios = await alimentosPropios();
      const guardados = (await Promise.all([...favs].map(obtenerAlimento))).filter(Boolean);
      const vistos = new Set();
      filas = [...propios, ...guardados].filter(a => !vistos.has(a.id) && vistos.add(a.id));
      vacio = 'Acá van tus alimentos creados y los que guardes con 🔖. Todavía no hay ninguno.';
    } else {
      filas = await recientes();
      vacio = 'Lo que anotes va a aparecer acá para repetirlo en un toque. Empezá buscando arriba.';
    }
    lista.innerHTML = filas.length
      ? `<ul class="filas">${filas.map(htmlFila).join('')}</ul>`
      : `<p class="reg__vacio">${vacio}</p>`;
  }
  function htmlFila(a) {
    const it = calcularItem(a, { cantidad: 1 });
    return `<li class="fila">
      <button class="fila__principal" data-ver="${esc(a.id)}">
        <span class="fila__emoji" aria-hidden="true">${a.emoji || '🍽️'}</span>
        <span class="fila__texto"><b>${esc(a.nombre)}${a.propio ? ' <span class="etiqueta etiqueta--suave">tuyo</span>' : ''}</b>
          <small>1 ${esc(it.porcion)} (${num(it.g)} g) · ${num(it.kcal)} kcal</small></span>
      </button>
      <button class="icono-btn" data-sumar="${esc(a.id)}" aria-label="Agregar 1 ${esc(it.porcion)} de ${esc(a.nombre)}">+</button>
    </li>`;
  }
  let temporizador;
  $('#q').addEventListener('input', e => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { estado.q = e.target.value; pintarLista(); }, 120);
  });
  $('#tabs-reg').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (b) { estado.tab = b.dataset.tab; pintarLista(); }
  });
  // Las escuchas van sobre .reg (no sobre el contenedor de la app, que se reusa entre pantallas).
  $('.reg').addEventListener('click', async e => {
    const ver = e.target.closest('[data-ver]');
    const sumarBtn = e.target.closest('[data-sumar]');
    const abrir = e.target.closest('[data-abrir]');
    if (ver) abrirHoja(await obtenerAlimento(ver.dataset.ver));
    else if (sumarBtn) {
      const a = await obtenerAlimento(sumarBtn.dataset.sumar);
      agregar(calcularItem(a, { cantidad: 1 }));
    } else if (abrir) abrir.dataset.abrir === 'rapido' ? abrirRapido() : abrirNuevo();
  });

  // --- Carrito ---
  function agregar(item, reemplazar = null) {
    if (reemplazar != null) estado.items[reemplazar] = item;
    else estado.items.push(item);
    pintarCarrito();
    anunciar(`${item.nombre} agregado`);
  }
  function pintarCarrito() {
    const car = $('#carrito');
    const total = sumar(estado.items);
    car.hidden = !estado.items.length && !estado.id;
    document.body.classList.toggle('con-carrito', !car.hidden);
    car.innerHTML = `
      ${estado.items.length ? `<ul class="carrito__items">${estado.items.map((it, k) => `
        <li><button class="carrito__item" data-editar-item="${k}">
            <span aria-hidden="true">${it.emoji}</span>
            <span class="carrito__nombre">${esc(it.nombre)} <small>${esc(textoCantidad(it))}</small></span>
            <b>${num(it.kcal)}</b></button>
          <button class="icono-btn icono-btn--chico" data-quitar="${k}" aria-label="Quitar ${esc(it.nombre)}">✕</button></li>`).join('')}
      </ul>` : '<p class="suave" style="text-align:center">La comida quedó vacía.</p>'}
      <div class="carrito__acciones">
        ${estado.id ? '<button class="btn btn--fantasma btn--peligro" data-accion="borrar">Borrar comida</button>' : ''}
        <button class="btn" data-accion="guardar" ${estado.items.length ? '' : 'disabled'}>
          ${estado.id ? 'Guardar cambios' : `Anotar ${num(total.kcal)} kcal`}</button>
      </div>`;
  }
  $('#carrito').addEventListener('click', async e => {
    const quitar = e.target.closest('[data-quitar]');
    const editar = e.target.closest('[data-editar-item]');
    const accion = e.target.closest('[data-accion]')?.dataset.accion;
    if (quitar) { estado.items.splice(Number(quitar.dataset.quitar), 1); pintarCarrito(); return; }
    if (editar) {
      const k = Number(editar.dataset.editarItem);
      const it = estado.items[k];
      if (it.unidad === 'rapido') return abrirRapido(it, k);
      const a = await obtenerAlimento(it.alimentoId);
      if (a) abrirHoja(a, it, k);
      return;
    }
    if (accion === 'guardar') guardarTodo(e.target.closest('button'));
    if (accion === 'borrar' && confirm('¿Borrar esta comida? No se puede deshacer.')) {
      await borrarComida(estado.id);
      location.hash = volverHref(estado.fecha);
    }
  });

  async function guardarTodo(boton) {
    boton.disabled = true; boton.setAttribute('aria-busy', 'true');
    try {
      const id = await guardarComida(estado);
      // Comida nueva: pantalla de resultado (puntaje, comentario del gatito y racha).
      if (!estado.id) {
        document.body.classList.remove('con-carrito');
        location.hash = `#/resultado?id=${id}`;
        return;
      }
      // El "te quedan" solo tiene sentido para hoy.
      const meta = estado.fecha === fechaHoy() ? await metaVigente() : null;
      const consumido = sumar(await comidasDelDia(estado.fecha)).kcal;
      const quedan = meta ? meta.kcal_objetivo - consumido : null;
      aviso(estado.id ? 'Cambios guardados.'
        : quedan == null ? '¡Anotado!'
        : quedan >= 0 ? `¡Anotado! Te quedan ${num(quedan)} kcal.`
        : '¡Anotado! Hoy te pasaste un poco; lo que cuenta es la semana.');
      document.body.classList.remove('con-carrito');
      location.hash = volverHref(estado.fecha);
    } catch (err) {
      console.error(err);
      boton.disabled = false; boton.removeAttribute('aria-busy');
      anunciar('Algo no salió bien y no se guardó. Probá de nuevo.');
    }
  }

  // --- Hoja del alimento ---
  const hoja = $('#hoja');
  hoja.addEventListener('click', e => { if (e.target === hoja) hoja.close(); });

  function abrirHoja(a, itemPrevio = null, indice = null) {
    if (!a) return;
    const s = {
      unidad: itemPrevio?.unidad === 'g' ? 'g' : 'porcion',
      porcionIdx: itemPrevio?.porcionIdx ?? 0,
      cantidad: itemPrevio?.cantidad ?? 1,
    };
    const pasos = () => (s.unidad === 'g' ? 10 : 0.5);
    function pintar() {
      const it = calcularItem(a, s);
      const fav = favs.has(a.id);
      hoja.innerHTML = `
        <div class="hoja">
          <div class="hoja__barra">
            <button class="icono-btn" data-h="fav" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de Mis comidas' : 'Guardar en Mis comidas'}">${fav ? '🔖' : '📑'}</button>
            <button class="icono-btn" data-h="cerrar" aria-label="Cerrar">✕</button>
          </div>
          <div class="hoja__emoji" aria-hidden="true">${a.emoji || '🍽️'}</div>
          <h2 id="hoja-titulo" class="hoja__titulo">${esc(a.nombre)}</h2>
          <div class="hoja__chips">
            <span class="chip">🔥 ${num(it.kcal)} kcal</span>
            <span class="chip"><i class="punto" style="background:var(--macro-carb)"></i>C ${num(it.carb, 1)} g</span>
            <span class="chip"><i class="punto" style="background:var(--macro-grasa)"></i>G ${num(it.grasa, 1)} g</span>
            <span class="chip"><i class="punto" style="background:var(--macro-prot)"></i>P ${num(it.prot, 1)} g</span>
          </div>
          <div class="seg" role="group" aria-label="Unidad">
            ${a.porciones.map((p, k) => `<button data-h="porcion" data-k="${k}" aria-pressed="${s.unidad === 'porcion' && s.porcionIdx === k}">${esc(p.nombre)}</button>`).join('')}
            <button data-h="gramos" aria-pressed="${s.unidad === 'g'}">Gramos</button>
          </div>
          <div class="contador">
            <button class="icono-btn" data-h="menos" aria-label="Menos">–</button>
            <div class="contador__centro">
              <label class="visualmente-oculto" for="cant">Cantidad</label>
              <input id="cant" type="text" inputmode="decimal" value="${String(s.cantidad).replace('.', ',')}">
              <span class="contador__unidad">${s.unidad === 'g' ? 'gramos' : `${esc(a.porciones[s.porcionIdx].nombre)} · ≈ ${num(it.g)} g`}</span>
            </div>
            <button class="icono-btn" data-h="mas" aria-label="Más">+</button>
          </div>
          <button class="btn" data-h="agregar" ${it.g > 0 ? '' : 'disabled'}>
            ${indice != null ? 'Guardar' : `Agregar ${num(it.kcal)} kcal`}</button>
          ${a.base ? '<p class="hoja__nota">Valores aproximados. Si tu paquete dice otra cosa, creá el alimento con esos datos.</p>' : ''}
        </div>`;
    }
    hoja.onclick = async e => {
      if (e.target === hoja) return hoja.close();
      const b = e.target.closest('[data-h]');
      if (!b) return;
      const h = b.dataset.h;
      if (h === 'cerrar') return hoja.close();
      if (h === 'fav') {
        const ahora = await alternarFavorito(a.id);
        ahora ? favs.add(a.id) : favs.delete(a.id);
        if (estado.tab === 'mias' && !estado.q) pintarLista();
      }
      if (h === 'porcion') {
        if (s.unidad === 'g') s.cantidad = 1;
        s.unidad = 'porcion'; s.porcionIdx = Number(b.dataset.k);
      }
      if (h === 'gramos' && s.unidad !== 'g') { s.cantidad = Math.round(calcularItem(a, s).g); s.unidad = 'g'; }
      if (h === 'menos') s.cantidad = Math.max(pasos(), redondear(s.cantidad - pasos()));
      if (h === 'mas') s.cantidad = redondear(s.cantidad + pasos());
      if (h === 'agregar') {
        agregar(calcularItem(a, s), indice);
        return hoja.close();
      }
      pintar();
    };
    hoja.oninput = e => {
      if (e.target.id !== 'cant') return;
      const n = leerNum(e.target.value);
      if (Number.isFinite(n) && n > 0) {
        s.cantidad = n;
        // Actualiza solo los números, sin repintar el campo (para no perder el cursor).
        const it = calcularItem(a, s);
        const chips = hoja.querySelectorAll('.hoja__chips .chip');
        chips[0].textContent = `🔥 ${num(it.kcal)} kcal`;
        [['carb', 'C'], ['grasa', 'G'], ['prot', 'P']].forEach(([k, l], j) => {
          chips[j + 1].lastChild.textContent = `${l} ${num(it[k], 1)} g`;
        });
        hoja.querySelector('[data-h="agregar"]').textContent = indice != null ? 'Guardar' : `Agregar ${num(it.kcal)} kcal`;
      }
    };
    pintar();
    hoja.showModal();
  }

  // --- Registro rápido ---
  function abrirRapido(itemPrevio = null, indice = null) {
    hoja.onclick = null; hoja.oninput = null;
    hoja.innerHTML = `
      <form class="hoja" method="dialog" id="f-rapido">
        <div class="hoja__barra"><span></span><button type="button" class="icono-btn" data-cerrar aria-label="Cerrar">✕</button></div>
        <h2 id="hoja-titulo" class="hoja__titulo">Registro rápido</h2>
        <p class="hoja__nota">Para cuando sabés las calorías (de un paquete o de un menú) y no querés buscar.</p>
        <label class="campo">Qué comiste <span class="suave">(opcional)</span>
          <input class="campo-texto" name="nombre" maxlength="40" placeholder="Ej.: Postre del cumple" value="${esc(itemPrevio?.nombre === 'Registro rápido' ? '' : itemPrevio?.nombre ?? '')}"></label>
        <label class="campo">Calorías
          <input class="campo-texto" name="kcal" inputmode="numeric" required placeholder="kcal" value="${itemPrevio?.kcal ?? ''}"></label>
        <div class="campos-3">
          <label class="campo">Carbos (g)<input class="campo-texto" name="carb" inputmode="decimal" value="${itemPrevio?.carb || ''}"></label>
          <label class="campo">Grasas (g)<input class="campo-texto" name="grasa" inputmode="decimal" value="${itemPrevio?.grasa || ''}"></label>
          <label class="campo">Proteínas (g)<input class="campo-texto" name="prot" inputmode="decimal" value="${itemPrevio?.prot || ''}"></label>
        </div>
        <p class="error" role="alert"></p>
        <button class="btn" type="submit">${indice != null ? 'Guardar' : 'Agregar'}</button>
      </form>`;
    const f = hoja.querySelector('form');
    hoja.querySelector('[data-cerrar]').onclick = () => hoja.close();
    f.onsubmit = e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const kcal = leerNum(d.kcal);
      if (!(kcal > 0 && kcal < 5000)) { f.querySelector('.error').textContent = 'Poné las calorías (un número mayor a 0).'; f.kcal.focus(); return; }
      agregar(itemRapido({ nombre: d.nombre, kcal, carb: leerNum(d.carb), grasa: leerNum(d.grasa), prot: leerNum(d.prot) }), indice);
      hoja.close();
    };
    hoja.showModal();
    f.kcal.focus();
  }

  // --- Crear alimento ---
  function abrirNuevo() {
    hoja.onclick = null; hoja.oninput = null;
    hoja.innerHTML = `
      <form class="hoja" id="f-nuevo">
        <div class="hoja__barra"><span></span><button type="button" class="icono-btn" data-cerrar aria-label="Cerrar">✕</button></div>
        <h2 id="hoja-titulo" class="hoja__titulo">Crear un alimento</h2>
        <p class="hoja__nota">Copiá los datos del paquete o de tu receta. Queda guardado en Mis comidas.</p>
        <label class="campo">Nombre<input class="campo-texto" name="nombre" maxlength="50" required placeholder="Ej.: Tarta de la abuela"></label>
        <div class="campos-2">
          <label class="campo">Porción<input class="campo-texto" name="porcion" maxlength="30" value="porción"></label>
          <label class="campo">Gramos <span class="suave">(si sabés)</span><input class="campo-texto" name="g" inputmode="decimal" placeholder="100"></label>
        </div>
        <label class="campo">Calorías por porción<input class="campo-texto" name="kcal" inputmode="numeric" required></label>
        <div class="campos-3">
          <label class="campo">Carbos (g)<input class="campo-texto" name="carb" inputmode="decimal"></label>
          <label class="campo">Grasas (g)<input class="campo-texto" name="grasa" inputmode="decimal"></label>
          <label class="campo">Proteínas (g)<input class="campo-texto" name="prot" inputmode="decimal"></label>
        </div>
        <p class="error" role="alert"></p>
        <button class="btn" type="submit">Guardar y elegir cantidad</button>
      </form>`;
    const f = hoja.querySelector('form');
    hoja.querySelector('[data-cerrar]').onclick = () => hoja.close();
    f.onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const kcal = leerNum(d.kcal);
      if (!d.nombre.trim()) { f.querySelector('.error').textContent = 'Ponele un nombre.'; return; }
      if (!(kcal >= 0 && kcal < 5000) || d.kcal === '') { f.querySelector('.error').textContent = 'Poné las calorías por porción.'; return; }
      const id = await guardarAlimentoPropio({
        nombre: d.nombre, porcion: d.porcion, g: leerNum(d.g) || 100, kcal,
        carb: leerNum(d.carb) || 0, grasa: leerNum(d.grasa) || 0, prot: leerNum(d.prot) || 0,
      });
      catalogo = await todosLosAlimentos();
      hoja.close();
      pintarLista();
      abrirHoja(await obtenerAlimento(id));
    };
    hoja.showModal();
    f.nombre.focus();
  }

  // --- Avisos para lectores de pantalla ---
  const vivo = document.createElement('p');
  vivo.className = 'visualmente-oculto'; vivo.setAttribute('aria-live', 'polite');
  c.append(vivo);
  function anunciar(t) { vivo.textContent = t; }

  pintarCuando();
  if (estado.q) $('#q').value = estado.q;
  await pintarLista();
  pintarCarrito();
  if (params.get('ver')) abrirHoja(await obtenerAlimento(params.get('ver')));
  else if (params.get('modo') === 'rapido') abrirRapido();
  else if (params.get('modo') === 'nuevo') abrirNuevo();
  else if (!estado.id && !desdeIA) $('#q').focus({ preventScroll: true });
}

function volverHref(fecha) {
  return fecha === fechaHoy() ? '#/hoy' : `#/hoy?fecha=${fecha}`;
}

function redondear(n) { return Math.round(n * 10) / 10; }

/** Mensaje corto que muestra Hoy al volver (si hay almacenamiento). */
export function aviso(texto) {
  try { sessionStorage.setItem('nathorfit-aviso', texto); } catch { /* sin almacenamiento: no pasa nada */ }
}
