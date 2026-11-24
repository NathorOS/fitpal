// Fase 8 — Editar tus datos y rehacer el plan. Muestra cómo cambia la meta antes de guardar.
// El peso no se edita acá (se anota en "Tu peso"): se usa el último registrado.
import { EQUIPOS, EQUIPOS_AZAR } from '../personaje.js';
import { fijarPersonaje } from './pj.js';
import { obtener, hoy as fechaHoy } from '../db.js';
import {
  validarPerfil, calcularPlan, guardarPerfil, pesoActual, metaVigente, metaPasos, PASOS_POR_NIVEL,
  EDAD_MINIMA, RITMOS,
} from '../objetivo.js';
import { aviso } from './registrar.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });
const leerNum = s => Number(String(s ?? '').replace(',', '.'));

const ACTIVIDAD = [['sedentario', 'Poco: trabajo sentado, casi sin ejercicio'], ['ligero', 'Algo: ejercicio 1 a 3 veces por semana'],
  ['moderado', 'Bastante: ejercicio 3 a 5 veces por semana'], ['alto', 'Mucho: casi todos los días o trabajo físico']];
const EQUIPO = [['ninguno', 'Nada, entreno en casa'], ['mancuernas', 'Mancuernas o bandas'], ['gimnasio', 'Voy al gimnasio']];
const PERSONALIDAD = [['carinoso', 'Cariñoso'], ['directo', 'Directo'], ['divertido', 'Divertido'], ['tranqui', 'Tranqui']];
const CUADROS = [...EQUIPOS_AZAR.map(id => [id, EQUIPOS[id].nombre]), ['verde', 'Ninguno']];

const opciones = (lista, valor) => lista.map(([v, t]) => `<option value="${v}" ${String(v) === String(valor) ? 'selected' : ''}>${esc(t)}</option>`).join('');
const seg = (campo, lista, valor) => `<div class="seg" role="group" data-seg="${campo}">${lista.map(([v, t]) =>
  `<button type="button" data-v="${v}" aria-pressed="${v === valor}">${t}</button>`).join('')}</div>`;

export async function montar(contenedor) {
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const perfil = await obtener('perfil', 'main');
  const kg = await pesoActual();
  const metaHoy = await metaVigente();
  const d = {
    nombre: perfil.nombre, gato_nombre: perfil.gato?.nombre, gato_personalidad: perfil.gato?.personalidad, equipo_futbol: perfil.equipo_futbol ?? 'verde',
    objetivo: perfil.objetivo, sexo: perfil.sexo, nacimiento: perfil.nacimiento, altura_cm: perfil.altura_cm,
    peso_meta: perfil.peso_meta ?? Math.round(kg * 0.95), ritmo_kg_sem: perfil.ritmo_kg_sem || 0.5,
    actividad: perfil.actividad, equipo: perfil.equipo ?? 'ninguno', meta_pasos: perfil.meta_pasos ?? metaPasos(perfil.actividad),
  };
  const hoy = new Date();
  const maxNac = fechaHoy(new Date(hoy.getFullYear() - EDAD_MINIMA, hoy.getMonth(), hoy.getDate()));

  c.innerHTML = `
    <section class="reg datos">
      <header class="reg__top">
        <a class="icono-btn" href="#/perfil" aria-label="Cerrar">✕</a>
        <h1 tabindex="-1">Tus datos</h1>
      </header>

      <fieldset class="tarjeta tarjeta--plana"><legend class="metrica__titulo">Vos</legend>
        <label class="campo">Nombre<input class="campo-texto" data-c="nombre" maxlength="30" value="${esc(d.nombre)}"></label>
        <div class="campo"><span id="l-sexo">Sexo biológico</span>${seg('sexo', [['f', 'Mujer'], ['m', 'Hombre']], d.sexo)}</div>
        <label class="campo">Fecha de nacimiento<input class="campo-texto" type="date" data-c="nacimiento" min="1920-01-01" max="${maxNac}" value="${esc(d.nacimiento)}"></label>
        <label class="campo">Altura (cm)<input class="campo-texto" inputmode="numeric" data-c="altura_cm" data-num value="${esc(d.altura_cm)}"></label>
        <p class="ayuda">Peso de hoy para el cálculo: <b>${num(kg, 1)} kg</b>. <a class="enlace" href="#/peso">Anotar otro peso</a></p>
      </fieldset>

      <fieldset class="tarjeta tarjeta--plana"><legend class="metrica__titulo">Tu objetivo</legend>
        ${seg('objetivo', [['bajar', 'Bajar de peso'], ['mantener', 'Mantener']], d.objetivo)}
        <div data-solo-bajar class="datos__bajar">
          <label class="campo">Peso meta (kg)<input class="campo-texto" inputmode="decimal" data-c="peso_meta" data-num value="${String(d.peso_meta).replace('.', ',')}"></label>
          <label class="campo">Ritmo
            <select class="campo-texto" data-c="ritmo_kg_sem" data-num>${opciones(RITMOS.map(r => [r, `${num(r, 2)} kg por semana`]), d.ritmo_kg_sem)}</select></label>
        </div>
        <label class="campo">Cuánto te movés
          <select class="campo-texto" data-c="actividad">${opciones(ACTIVIDAD, d.actividad)}</select></label>
        <label class="campo">Para entrenar contás con
          <select class="campo-texto" data-c="equipo">${opciones(EQUIPO, d.equipo)}</select></label>
        <label class="campo">Meta de pasos por día
          <input class="campo-texto" inputmode="numeric" data-c="meta_pasos" data-num value="${d.meta_pasos}"></label>
      </fieldset>

      <fieldset class="tarjeta tarjeta--plana"><legend class="metrica__titulo">Tu personaje</legend>
        <label class="campo">Nombre<input class="campo-texto" data-c="gato_nombre" maxlength="20" value="${esc(d.gato_nombre)}"></label>
        <label class="campo">Cómo te habla
          <select class="campo-texto" data-c="gato_personalidad">${opciones(PERSONALIDAD, d.gato_personalidad)}</select></label>
        <label class="campo">De qué cuadro es
          <select class="campo-texto" data-c="equipo_futbol">${opciones(CUADROS, d.equipo_futbol)}</select></label>
      </fieldset>

      <div class="tarjeta datos__vista" aria-live="polite" id="vista-plan"></div>
      <p class="error" role="alert" id="err"></p>
      <button class="btn" id="guardar">Guardar y recalcular</button>
      <a class="btn btn--fantasma" href="#/perfil">Cancelar</a>
    </section>`;

  const vistaPlan = c.querySelector('#vista-plan');
  const err = c.querySelector('#err');

  function leer() {
    c.querySelectorAll('[data-c]').forEach(el => {
      d[el.dataset.c] = el.hasAttribute('data-num') ? leerNum(el.value) : el.value.trim();
    });
    c.querySelector('[data-solo-bajar]').hidden = d.objetivo !== 'bajar';
  }

  function errores() {
    const datos = { ...d, peso_kg: kg };
    const { errores } = validarPerfil(datos, hoy);
    if (!d.nombre) errores.nombre = 'Escribí tu nombre.';
    if (!d.gato_nombre) errores.gato_nombre = 'Tu personaje necesita un nombre.';
    if (!(d.meta_pasos >= 1000 && d.meta_pasos <= 40000)) errores.meta_pasos = 'La meta de pasos tiene que estar entre 1.000 y 40.000.';
    return errores;
  }

  function actualizar() {
    leer();
    const e = errores();
    c.querySelectorAll('[data-c]').forEach(el => el.toggleAttribute('aria-invalid', Boolean(e[el.dataset.c])));
    const primero = Object.values(e)[0];
    err.textContent = primero ?? '';
    if (primero) { vistaPlan.innerHTML = '<p class="suave">Corregí los datos para ver tu nueva meta.</p>'; return; }
    const plan = calcularPlan({ ...d, peso_kg: kg }, hoy);
    const antes = metaHoy?.kcal_objetivo;
    const cambia = antes && Math.round(plan.kcal) !== antes;
    vistaPlan.innerHTML = `<div class="metrica__titulo">Tu meta por día</div>
      <p class="ajuste__cifras">${cambia ? `<s>${num(antes)}</s> → ` : ''}<b>${num(plan.kcal)} kcal</b></p>
      <p class="hoy__nota">Proteínas ${plan.macros.prot} g · Carbos ${plan.macros.carb} g · Grasas ${plan.macros.grasa} g
        ${plan.limitadoPorPiso ? '<br>Para cuidarte, nunca bajamos del mínimo seguro.' : ''}
        ${metaHoy?.adaptativa && cambia ? '<br>Tu meta actual estaba ajustada con tus datos reales: al guardar se vuelve a calcular desde cero y se sigue ajustando con las semanas.' : ''}</p>`;
  }

  c.addEventListener('input', actualizar);
  c.addEventListener('change', actualizar);
  c.addEventListener('click', e => {
    const b = e.target.closest('[data-seg] button');
    if (!b) return;
    const grupo = b.closest('[data-seg]');
    d[grupo.dataset.seg] = b.dataset.v;
    grupo.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    actualizar();
  });
  // Al cambiar el nivel de actividad, si la meta de pasos era la sugerida, se sugiere la del nivel nuevo.
  c.querySelector('[data-c="actividad"]').addEventListener('change', e => {
    const pasos = c.querySelector('[data-c="meta_pasos"]');
    if (Object.values(PASOS_POR_NIVEL).includes(leerNum(pasos.value))) pasos.value = metaPasos(e.target.value);
    actualizar();
  });

  c.querySelector('#guardar').addEventListener('click', async e => {
    actualizar();
    if (err.textContent) { c.querySelector('[aria-invalid]')?.focus(); return; }
    const b = e.currentTarget;
    b.disabled = true; b.setAttribute('aria-busy', 'true');
    try {
      const datos = {
        nombre: d.nombre, gato: { nombre: d.gato_nombre, personalidad: d.gato_personalidad }, equipo_futbol: d.equipo_futbol,
        objetivo: d.objetivo, sexo: d.sexo, nacimiento: d.nacimiento, altura_cm: d.altura_cm, peso_kg: kg,
        actividad: d.actividad, equipo: d.equipo, meta_pasos: Math.round(d.meta_pasos),
        peso_meta: d.peso_meta, ritmo_kg_sem: d.ritmo_kg_sem,
      };
      await guardarPerfil(datos, hoy, { registrarPeso: false });
      fijarPersonaje({ equipo: d.equipo_futbol });
      aviso('Listo: tus datos y tu plan quedaron actualizados.');
      location.hash = '#/perfil';
    } catch (error) {
      console.error(error);
      b.disabled = false; b.removeAttribute('aria-busy');
      err.textContent = error.errores ? Object.values(error.errores)[0] : 'Algo no salió bien y no se guardó. Probá de nuevo.';
    }
  });

  actualizar();
  c.querySelector('h1').focus({ preventScroll: true });
}
