// Fase 1 — Onboarding conversacional: el gatito pregunta, vos respondés.
// 3 bloques (tu gatito · vos · tu plan), una pregunta por pantalla, y al final "Tu plan está listo".
import { gatoSVG } from '../gato.js';
import {
  validarPerfil, calcularPlan, guardarPerfil, pesoMetaMinimo, imc, metaPasos,
  EDAD_MINIMA, ALTURA, PESO, RITMOS,
} from '../objetivo.js';
import { MINIMO_KCAL } from '../calculos.js';
import { metaAgua } from '../actividad.js';
import { montarRuedaEntera, montarRuedasDecimal } from './rueda.js';
import { htmlBarraImc } from './imc.js';
import { logoHTML } from '../marca.js';

const CLAVE_BORRADOR = 'nathorfit-onboarding';

// ---------------------------------------------------------------------------
// Pasos. Puros (sin DOM) para poder probarlos en Node.
// tipo: bienvenida | texto | opciones | numero | fecha | salud
// ---------------------------------------------------------------------------
export const PASOS = [
  { id: 'bienvenida', bloque: 0, tipo: 'bienvenida' },

  { id: 'gato_nombre', bloque: 1, tipo: 'texto', campo: 'gato_nombre', gato: 'saluda',
    pregunta: () => '¡Hola! Voy a ser tu compañero. ¿Cómo me vas a llamar?',
    placeholder: 'Ej.: Tito, Luna, Pancho', max: 20,
    sugerencias: ['Tito', 'Luna', 'Pancho', 'Mandarina', 'Toto'] },

  { id: 'gato_personalidad', bloque: 1, tipo: 'opciones', campo: 'gato_personalidad', gato: 'feliz',
    pregunta: d => `¡${d.gato_nombre}, me encanta! ¿Cómo querés que te hable?`,
    opciones: [
      { valor: 'carinoso', emoji: '🧡', titulo: 'Cariñoso', sub: 'Te festejo cada paso' },
      { valor: 'directo', emoji: '🎯', titulo: 'Directo', sub: 'Te digo las cosas claras, sin vueltas' },
      { valor: 'divertido', emoji: '😹', titulo: 'Divertido', sub: 'Con humor, para que no sea un embole' },
      { valor: 'tranqui', emoji: '🌿', titulo: 'Tranqui', sub: 'Pocos avisos y cero presión' },
    ] },

  { id: 'nombre', bloque: 1, tipo: 'texto', campo: 'nombre', gato: 'normal',
    pregunta: () => '¿Y vos cómo te llamás?', placeholder: 'Tu nombre o apodo', max: 30 },

  { id: 'objetivo', bloque: 2, tipo: 'opciones', campo: 'objetivo', gato: 'feliz',
    pregunta: d => `Un gusto, ${d.nombre}. ¿Qué querés lograr?`,
    opciones: [
      { valor: 'bajar', emoji: '📉', titulo: 'Bajar de peso' },
      { valor: 'mantener', emoji: '⚖️', titulo: 'Mantener mi peso', sub: 'y comer mejor' },
    ] },

  { id: 'sexo', bloque: 2, tipo: 'opciones', campo: 'sexo', gato: 'normal',
    pregunta: () => '¿Cuál es tu sexo biológico?',
    ayuda: 'Lo uso solo para calcular cuánta energía gasta tu cuerpo.',
    opciones: [
      { valor: 'f', emoji: '👩', titulo: 'Mujer' },
      { valor: 'm', emoji: '👨', titulo: 'Hombre' },
    ] },

  { id: 'nacimiento', bloque: 2, tipo: 'fecha', campo: 'nacimiento', gato: 'normal',
    pregunta: () => '¿Cuándo naciste?',
    ayuda: `Nathor Fit es para mayores de ${EDAD_MINIMA} años.` },

  { id: 'altura', bloque: 2, tipo: 'numero', campo: 'altura_cm', gato: 'normal', unidad: 'cm',
    paso: 1, min: ALTURA.min, max: ALTURA.max, decimales: 0, rueda: 'entera',
    inicial: d => (d.sexo === 'm' ? 175 : 162),
    pregunta: () => '¿Cuánto medís?' },

  { id: 'peso', bloque: 2, tipo: 'numero', campo: 'peso_kg', gato: 'normal', unidad: 'kg',
    paso: 0.1, min: PESO.min, max: PESO.max, decimales: 1, rueda: 'decimas',
    inicial: d => (d.sexo === 'm' ? 85 : 70),
    pregunta: () => '¿Cuánto pesás hoy?',
    ayuda: 'Si no sabés exacto, poné uno aproximado. Después lo vas actualizando.' },

  { id: 'peso_meta', bloque: 2, tipo: 'numero', campo: 'peso_meta', gato: 'feliz', unidad: 'kg',
    paso: 0.5, min: PESO.min, max: PESO.max, decimales: 1, rueda: 'medios',
    si: d => d.objetivo === 'bajar',
    inicial: d => Math.max(pesoMetaMinimo(d.altura_cm), Math.round(d.peso_kg * 0.92 * 2) / 2),
    pregunta: () => '¿A qué peso querés llegar?',
    ayuda: d => `Para tu altura, lo mínimo saludable es ${formatoNum(pesoMetaMinimo(d.altura_cm))} kg.` },

  { id: 'actividad', bloque: 3, tipo: 'opciones', campo: 'actividad', gato: 'saluda',
    pregunta: () => '¿Cuánto te movés en un día normal?',
    opciones: [
      { valor: 'sedentario', emoji: '🛋️', titulo: 'Poco', sub: 'Trabajo sentado, casi sin ejercicio' },
      { valor: 'ligero', emoji: '🚶', titulo: 'Algo', sub: 'Caminatas o ejercicio 1 a 3 veces por semana' },
      { valor: 'moderado', emoji: '🏃', titulo: 'Bastante', sub: 'Ejercicio 3 a 5 veces por semana' },
      { valor: 'alto', emoji: '🔥', titulo: 'Mucho', sub: 'Entreno fuerte casi todos los días o trabajo físico' },
    ] },

  { id: 'ritmo', bloque: 3, tipo: 'opciones', campo: 'ritmo_kg_sem', gato: 'normal', numerico: true,
    si: d => d.objetivo === 'bajar',
    pregunta: () => '¿A qué ritmo querés bajar?',
    ayuda: 'Más lento es más fácil de sostener. Lo podés cambiar cuando quieras.',
    opciones: [
      { valor: 0.25, emoji: '🐢', titulo: 'Tranqui', sub: '0,25 kg por semana' },
      { valor: 0.5, emoji: '🚲', titulo: 'Constante', sub: '0,5 kg por semana', recomendado: true },
      { valor: 0.75, emoji: '🏃', titulo: 'Firme', sub: '0,75 kg por semana' },
      { valor: 1, emoji: '🚀', titulo: 'Rápido', sub: '1 kg por semana' },
    ] },

  { id: 'equipo', bloque: 3, tipo: 'opciones', campo: 'equipo', gato: 'feliz',
    pregunta: () => 'Para entrenar, ¿con qué contás?',
    opciones: [
      { valor: 'ninguno', emoji: '🏠', titulo: 'Nada, entreno en casa' },
      { valor: 'mancuernas', emoji: '🏋️', titulo: 'Mancuernas o bandas' },
      { valor: 'gimnasio', emoji: '🏟️', titulo: 'Voy al gimnasio' },
    ] },

  { id: 'salud', bloque: 3, tipo: 'salud', campo: 'acepto_aviso', gato: 'normal',
    pregunta: () => 'Antes de armar tu plan, algo importante' },
];

/** Pasos que aplican según lo respondido (p. ej. "mantener" saltea peso meta y ritmo). */
export function pasosVisibles(d) {
  return PASOS.filter(p => !p.si || p.si(d));
}

/** Error del paso actual, o null. Reusa validarPerfil para los campos del perfil. */
export function errorDelPaso(paso, d, hoy = new Date()) {
  const v = d[paso.campo];
  if (paso.tipo === 'bienvenida') return null;
  if (paso.tipo === 'texto') return String(v ?? '').trim() ? null : 'Escribí un nombre para seguir.';
  if (paso.id === 'gato_personalidad') return v ? null : 'Elegí una opción.';
  if (paso.tipo === 'salud') return v ? null : 'Marcá la casilla para seguir.';
  const { errores } = validarPerfil(d, hoy);
  return errores[paso.campo] ?? null;
}

/** Datos del borrador listos para guardarPerfil. */
export function datosFinales(d) {
  const base = {
    nombre: String(d.nombre).trim(),
    gato: { nombre: String(d.gato_nombre).trim(), personalidad: d.gato_personalidad },
    objetivo: d.objetivo, sexo: d.sexo, nacimiento: d.nacimiento,
    altura_cm: Number(d.altura_cm), peso_kg: Number(d.peso_kg),
    actividad: d.actividad, equipo: d.equipo,
    meta_pasos: metaPasos(d.actividad),
    aviso_aceptado: d.acepto_aviso ? new Date().toISOString() : null,
  };
  if (d.objetivo === 'bajar') {
    base.peso_meta = Number(d.peso_meta);
    base.ritmo_kg_sem = Number(d.ritmo_kg_sem);
  }
  return base;
}

// ---------------------------------------------------------------------------
// Utilidades de formato
// ---------------------------------------------------------------------------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const formatoNum = (n, dec = 1) =>
  Number(n).toLocaleString('es-AR', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
const z = n => String(n).padStart(2, '0');
const fechaISO = f => `${f.getFullYear()}-${z(f.getMonth() + 1)}-${z(f.getDate())}`;

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
export async function montar(c) {
  let d = leerBorrador();
  let i = Math.min(d._paso ?? 0, pasosVisibles(d).length - 1);
  let error = null;
  let rueda = null;   // la rueda de números del paso actual, si tiene

  const guardarBorrador = () => {
    try { sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ ...d, _paso: i })); } catch { /* sin almacenamiento: no pasa nada */ }
  };

  function ir(n) {
    i = Math.max(0, Math.min(n, pasosVisibles(d).length));
    error = null;
    guardarBorrador();
    if (i === pasosVisibles(d).length) return calcular();
    pintar();
  }

  function seguir() {
    const paso = pasosVisibles(d)[i];
    if (paso.tipo === 'numero') d[paso.campo] = redondear(rueda.valor(), paso.decimales);
    if (paso.tipo === 'texto') d[paso.campo] = c.querySelector('#valor').value.trim();
    if (paso.tipo === 'fecha') d[paso.campo] = c.querySelector('#valor').value;
    error = errorDelPaso(paso, d);
    if (error) return pintar(true);
    ir(i + 1);
  }

  function pintar(conservarFoco = false) {
    const pasos = pasosVisibles(d);
    const paso = pasos[i];
    c.replaceChildren();
    const raiz = document.createElement('section');
    raiz.className = 'ob';
    raiz.innerHTML = paso.tipo === 'bienvenida' ? htmlBienvenida() : htmlPaso(paso, pasos, d, error);
    c.append(raiz);
    conectar(raiz, paso);
    const foco = raiz.querySelector(error ? '#valor, .rueda, .opcion, .casilla input' : 'h1');
    if (foco && !(conservarFoco && foco.tagName === 'H1')) foco.focus({ preventScroll: !error });
    if (error) raiz.querySelector('#err')?.scrollIntoView({ block: 'center' });
  }

  function conectar(raiz, paso) {
    raiz.querySelector('[data-accion="seguir"]')?.addEventListener('click', seguir);
    raiz.querySelector('[data-accion="atras"]')?.addEventListener('click', () => ir(i - 1));
    raiz.querySelectorAll('.opcion').forEach(op => op.addEventListener('click', () => {
      d[paso.campo] = paso.numerico ? Number(op.dataset.valor) : op.dataset.valor;
      raiz.querySelectorAll('.opcion').forEach(o => o.setAttribute('aria-checked', String(o === op)));
      error = null;
      raiz.querySelector('.error').textContent = '';
      guardarBorrador();
    }));
    // Flechas dentro del grupo de opciones
    raiz.querySelector('[role="radiogroup"]')?.addEventListener('keydown', e => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const ops = [...raiz.querySelectorAll('.opcion')];
      const j = ops.indexOf(document.activeElement);
      const k = (j + (e.key === 'ArrowDown' ? 1 : -1) + ops.length) % ops.length;
      ops[k].focus(); ops[k].click(); e.preventDefault();
    });
    raiz.querySelectorAll('[data-sugerencia]').forEach(b => b.addEventListener('click', () => {
      raiz.querySelector('#valor').value = b.dataset.sugerencia;
    }));
    rueda = null;
    if (paso.tipo === 'numero') {
      const lugar = raiz.querySelector('[data-rueda]');
      const opciones = {
        min: paso.min, max: paso.max, valor: d[paso.campo] ?? paso.inicial(d),
        etiqueta: paso.pregunta(d), unidad: paso.unidad,
        alCambiar: v => actualizarAyudaMeta(raiz, paso, v),
      };
      rueda = paso.rueda === 'entera' ? montarRuedaEntera(lugar, opciones)
        : montarRuedasDecimal(lugar, { ...opciones, dec: paso.rueda });
      lugar.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); seguir(); } });
    }
    raiz.querySelector('#valor')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); seguir(); } });
    raiz.querySelector('#acepto')?.addEventListener('change', e => { d.acepto_aviso = e.target.checked; guardarBorrador(); });
  }

  // Mientras se mueve la rueda: cuánto es menos que hoy (meta) o el IMC (peso).
  function actualizarAyudaMeta(raiz, paso, v) {
    if (paso.id === 'peso_meta') {
      const diff = redondear(d.peso_kg - v, 1);
      raiz.querySelector('#diferencia').textContent = diff > 0 ? `Son ${formatoNum(diff)} kg menos que hoy.` : '';
    }
    if (paso.id === 'peso' && d.altura_cm) raiz.querySelector('#imc').innerHTML = htmlBarraImc(imc(v, d.altura_cm));
  }

  async function calcular() {
    c.replaceChildren();
    const raiz = document.createElement('section');
    raiz.className = 'ob';
    raiz.innerHTML = `
      <div class="calculando" role="status">
        <div class="gato-grande">${gatoSVG('normal', { titulo: d.gato_nombre })}</div>
        <h1 class="burbuja" tabindex="-1">Armando tu plan…</h1>
        <div class="barra" aria-hidden="true"><i></i></div>
        <p class="suave" id="paso-calculo">Calculando cuánto gasta tu cuerpo</p>
      </div>`;
    c.append(raiz);
    const textos = ['Calculando cuánto gasta tu cuerpo', 'Repartiendo proteínas, grasas y carbos', 'Chequeando que sea seguro'];
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const t of textos) {
      raiz.querySelector('#paso-calculo').textContent = t;
      await new Promise(r => setTimeout(r, quieto ? 150 : 650));
    }
    pintarPlan();
  }

  function pintarPlan() {
    const plan = calcularPlan(d, new Date());
    c.replaceChildren();
    const raiz = document.createElement('section');
    raiz.className = 'plan';
    raiz.innerHTML = htmlPlan(d, plan);
    c.append(raiz);
    raiz.querySelector('h1').focus({ preventScroll: true });
    raiz.querySelector('[data-accion="cambiar"]').addEventListener('click', () => ir(pasosVisibles(d).length - 1));
    const boton = raiz.querySelector('[data-accion="arrancar"]');
    boton.addEventListener('click', async () => {
      boton.disabled = true; boton.setAttribute('aria-busy', 'true');
      try {
        await guardarPerfil(datosFinales(d));
        try { sessionStorage.removeItem(CLAVE_BORRADOR); } catch { /* nada */ }
        location.hash = '#/hoy';
      } catch (err) {
        console.error(err);
        boton.disabled = false; boton.removeAttribute('aria-busy');
        const primero = err.errores && pasosVisibles(d).findIndex(p => err.errores[p.campo]);
        if (primero >= 0) { error = err.errores[pasosVisibles(d)[primero].campo]; i = primero; pintar(true); return; }
        raiz.querySelector('#error-guardar').textContent = 'Algo no salió bien y no se guardó. Probá de nuevo.';
      }
    });
  }

  if (i >= pasosVisibles(d).length) calcular(); else pintar();
}

function leerBorrador() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE_BORRADOR)) ?? {}; } catch { return {}; }
}

function redondear(n, dec = 0) {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** dec;
  return Math.round(n * f) / f;
}

// ---------------------------------------------------------------------------
// HTML de cada pantalla
// ---------------------------------------------------------------------------
function htmlBienvenida() {
  return `
    <div class="ob__bienvenida">
      <div>
        ${logoHTML()}
        <div class="gato-grande">${gatoSVG('saluda', { titulo: 'Gatito saludando' })}</div>
        <h1 tabindex="-1">Comé mejor, sin culpa</h1>
        <p style="margin-top:8px">Un gatito que te acompaña a llegar a tu peso. Todo gratis y guardado en tu teléfono.</p>
      </div>
    </div>
    <div class="ob__pie">
      <button class="btn" data-accion="seguir">Empezamos</button>
      <p class="ayuda" style="text-align:center">Nathor Fit te orienta, pero no reemplaza a tu médico ni a tu nutricionista.</p>
    </div>`;
}

function htmlTramos(pasos, i) {
  const bloque = pasos[i].bloque;
  return [1, 2, 3].map(b => {
    const delBloque = pasos.filter(p => p.bloque === b);
    let lleno = 0;
    if (b < bloque) lleno = 100;
    else if (b === bloque) lleno = Math.round(((delBloque.indexOf(pasos[i]) + 1) / delBloque.length) * 100);
    return `<span><i style="width:${lleno}%"></i></span>`;
  }).join('');
}

function htmlPaso(paso, pasos, d, error) {
  const pregunta = esc(paso.pregunta(d));
  const ayuda = typeof paso.ayuda === 'function' ? paso.ayuda(d) : paso.ayuda;
  const valorPct = Math.round((pasos.indexOf(paso) / (pasos.length - 1)) * 100);
  return `
    <div class="ob__top">
      <button class="icono-btn" data-accion="atras" aria-label="Volver">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>
      </button>
      <div class="tramos" role="progressbar" aria-label="Avance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${valorPct}">${htmlTramos(pasos, pasos.indexOf(paso))}</div>
    </div>
    <div class="ob__cuerpo">
      <div class="pregunta">
        <div>${gatoSVG(paso.gato, { titulo: d.gato_nombre || 'Tu gatito' })}</div>
        <h1 class="burbuja" tabindex="-1">${pregunta}</h1>
      </div>
      ${ayuda ? `<p class="ayuda">${esc(ayuda)}</p>` : ''}
      ${htmlControl(paso, d, error)}
      <p class="error" id="err" role="alert">${error ? esc(error) : ''}</p>
    </div>
    <div class="ob__pie">
      <button class="btn" data-accion="seguir">Seguir</button>
    </div>`;
}

function htmlControl(paso, d, error) {
  const inv = error ? 'aria-invalid="true" aria-describedby="err"' : '';
  const valor = d[paso.campo];

  if (paso.tipo === 'texto') {
    const sug = paso.sugerencias
      ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${paso.sugerencias.map(s =>
          `<button type="button" class="chip" data-sugerencia="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
    return `<label class="visualmente-oculto" for="valor">${esc(paso.pregunta(d))}</label>
      <input id="valor" class="campo-texto" type="text" maxlength="${paso.max}" autocomplete="off"
        placeholder="${esc(paso.placeholder)}" value="${esc(valor ?? '')}" ${inv}>${sug}`;
  }

  if (paso.tipo === 'opciones') {
    const extra = paso.id === 'ritmo' ? extrasRitmo(d) : {};
    return `<div class="opciones" role="radiogroup" aria-label="${esc(paso.pregunta(d))}">
      ${paso.opciones.map((o, k) => {
        const elegido = valor === o.valor;
        const tab = elegido || (valor == null && k === 0) ? 0 : -1;
        return `<button type="button" class="opcion" role="radio" aria-checked="${elegido}" tabindex="${tab}" data-valor="${o.valor}">
          <span class="emoji" aria-hidden="true">${o.emoji}</span>
          <span>${esc(o.titulo)}${o.recomendado ? '<span class="etiqueta">Recomendado</span>' : ''}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>
          ${extra[o.valor] ? `<span class="opcion__extra">${extra[o.valor]}</span>` : ''}
        </button>`;
      }).join('')}
    </div>${extra.nota ? `<p class="ayuda">${esc(extra.nota)}</p>` : ''}`;
  }

  if (paso.tipo === 'numero') {
    const v = valor ?? paso.inicial(d);
    let extra = '';
    if (paso.id === 'peso_meta') extra = `<p class="ayuda" id="diferencia" aria-live="polite">${d.peso_kg - v > 0 ? `Son ${formatoNum(redondear(d.peso_kg - v, 1))} kg menos que hoy.` : ''}</p>`;
    if (paso.id === 'peso' && d.altura_cm) extra = `<div id="imc">${htmlBarraImc(imc(v, d.altura_cm))}</div>`;
    return `<div data-rueda ${error ? 'class="rueda--error"' : ''}></div>${extra}`;
  }

  if (paso.tipo === 'fecha') {
    const hoy = new Date();
    const max = fechaISO(new Date(hoy.getFullYear() - EDAD_MINIMA, hoy.getMonth(), hoy.getDate()));
    return `<label class="visualmente-oculto" for="valor">Fecha de nacimiento</label>
      <input id="valor" class="campo-texto" type="date" min="1920-01-01" max="${max}" value="${esc(valor ?? '')}" ${inv}>`;
  }

  if (paso.tipo === 'salud') {
    return `<div class="aviso">
        <p><b>Nathor Fit te orienta, pero no reemplaza a tu médico ni a tu nutricionista.</b></p>
        <p>Consultá con un profesional antes de empezar si:</p>
        <ul>
          <li>estás embarazada o dando la teta,</li>
          <li>tenés diabetes, problemas de tiroides, del corazón o de los riñones,</li>
          <li>tuviste o tenés un trastorno de la conducta alimentaria,</li>
          <li>tomás medicación que afecte tu peso o tu apetito.</li>
        </ul>
        <p>Nunca te vamos a proponer menos de ${formatoNum(MINIMO_KCAL.f, 0)} kcal por día (mujeres) o ${formatoNum(MINIMO_KCAL.m, 0)} (hombres), ni bajar más del 1 % de tu peso por semana.</p>
      </div>
      <label class="casilla"><input type="checkbox" id="acepto" ${valor ? 'checked' : ''}> Entiendo y quiero seguir</label>`;
  }
  return '';
}

/** Para cada ritmo: las kcal por día que resultarían, y una nota si actúa algún límite. */
function extrasRitmo(d) {
  const out = {};
  let nota = '';
  for (const r of RITMOS) {
    const plan = calcularPlan({ ...d, ritmo_kg_sem: r }, new Date());
    out[r] = `${formatoNum(plan.kcal, 0)} <small>kcal/día</small>`;
    if (plan.limitadoPorPiso) nota = `Algunos ritmos quedan en el mínimo de ${formatoNum(MINIMO_KCAL[d.sexo], 0)} kcal por día: para cuidarte, nunca bajamos de ahí.`;
    else if (plan.limitadoPorRitmo && !nota) nota = `Para tu peso, lo más seguro es hasta ${formatoNum(d.peso_kg * 0.01, 2)} kg por semana; si elegís más, lo ajustamos solo.`;
  }
  out.nota = nota;
  return out;
}

function htmlPlan(d, plan) {
  const bajar = d.objetivo === 'bajar';
  const nombre = esc(d.nombre);
  const fecha = plan.fechaEstimada
    ? plan.fechaEstimada.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : null;
  const titulo = bajar
    ? `Llegás a ${formatoNum(d.peso_meta)} kg cerca de ${fecha}`
    : `Para mantener tus ${formatoNum(d.peso_kg)} kg`;
  const m = plan.macros;
  const macro = (nombreM, g, color) => `
    <div><div class="macro__nombre">${nombreM}</div>
      <div class="macro__pista"><i style="width:100%;background:var(${color})"></i></div>
      <div class="macro__valor">${g} g</div></div>`;

  const notas = [];
  if (plan.limitadoPorPiso) notas.push(`Para cuidarte, nunca bajamos de ${formatoNum(MINIMO_KCAL[d.sexo], 0)} kcal por día. Por eso el ritmo real es de unos ${formatoNum(plan.ritmoReal, 2)} kg por semana.`);
  else if (plan.limitadoPorRitmo) notas.push('Ajustamos el ritmo al 1 % de tu peso por semana, que es lo más seguro.');
  notas.push(`Es una estimación. ${esc(d.gato_nombre)} la va ajustando con tu peso real cada semana.`);

  const filas = [
    ['Gasto diario estimado', `${formatoNum(plan.tdee, 0)} kcal`],
    bajar && ['Ritmo', `${formatoNum(plan.ritmoReal, 2)} kg por semana`],
    bajar && plan.semanas && ['Tiempo estimado', `${plan.semanas} semanas`],
  ].filter(Boolean);
  const agua = metaAgua(d.peso_kg);
  const pasos = metaPasos(d.actividad);
  const gato = esc(d.gato_nombre);

  return `
    <div class="plan__hero">
      <h1 tabindex="-1">¡Tu plan está listo, ${nombre}!</h1>
      <p>${esc(titulo)}</p>
      <div class="gato-grande">${gatoSVG('festeja', { titulo: `${d.gato_nombre} festejando` })}</div>
    </div>
    <div class="tarjeta">
      <div class="metrica__titulo">Tu meta por día</div>
      <div class="plan__kcal"><span class="metrica__numero">${formatoNum(plan.kcal, 0)}</span><span>kcal</span></div>
      <div class="macros">
        ${macro('Carbos', m.carb, '--macro-carb')}
        ${macro('Grasas', m.grasa, '--macro-grasa')}
        ${macro('Proteínas', m.prot, '--macro-prot')}
      </div>
    </div>
    <div class="tarjeta">
      <div class="metrica__titulo">Tus metas de cada día</div>
      <ul class="plan__metas">
        <li><span aria-hidden="true">💧</span><b>${formatoNum(agua / 1000, 2)} L</b><small>de agua</small></li>
        <li><span aria-hidden="true">👣</span><b>${formatoNum(pasos, 0)}</b><small>pasos</small></li>
        <li><span aria-hidden="true">🥩</span><b>${m.prot} g</b><small>de proteína</small></li>
      </ul>
    </div>
    <div class="tarjeta">${htmlBarraImc(plan.imcActual, { meta: bajar ? plan.imcMeta : null })}
      <p class="plan__nota" style="margin-top:8px">El IMC es una referencia general: no distingue músculo de grasa.</p></div>
    <div class="tarjeta">
      ${filas.map(([k, v]) => `<div class="plan__fila"><span class="suave">${k}</span><b>${v}</b></div>`).join('')}
    </div>
    ${notas.map(n => `<p class="plan__nota">${n}</p>`).join('')}
    <div class="tarjeta trato">
      <div class="metrica__titulo">Nuestro trato</div>
      <p>${gato} se compromete a acompañarte sin retos. Vos, a intentar:</p>
      <ul>
        <li>Anotar lo que comés, aunque sea aproximado.</li>
        <li>Pesarte una vez por semana, siempre a la misma hora.</li>
        <li>Volver al día siguiente aunque un día no salga como querías.</li>
      </ul>
    </div>
    <p class="error" id="error-guardar" role="alert"></p>
    <div class="ob__pie" style="position:static">
      <button class="btn" data-accion="arrancar">🐾 ¡Trato hecho, arrancamos!</button>
      <button class="btn btn--fantasma" data-accion="cambiar">Cambiar algo</button>
    </div>`;
}
