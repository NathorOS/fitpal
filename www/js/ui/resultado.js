// Fase 5 — Resultado de una comida recién anotada: comentario del personaje, cómo va el día,
// la comida con sus macros (gratis), el puntaje nutricional y consejos. Parámetro: id=<comida>
import { obtener, hoy as fechaHoy } from '../db.js';
import { metaVigente, pesoActual } from '../objetivo.js';
import { pjHTML } from './pj.js';
import { confeti } from './festejo.js';
import { ayudanteHTML } from './ayudante.js';
import { elegirFrase, esPesado } from '../frases.js';
import { obtenerComida, comidasDelDia, sumar, textoCantidad, MOMENTOS } from '../registro.js';
import { actividadesDelDia, pasosDelDia, kcalExtraDelDia } from '../actividad.js';
import { puntajeComida, etiquetaPuntaje, consejosComida } from '../puntaje.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });

const COMENTARIOS = {
  carinoso: {
    alto: '¡Esto sí que es comer bien! Así me gusta.',
    medio: 'Bien ahí. Con un poco más de proteína o verdura queda redonda.',
    bajo: 'Anotada, que es lo más importante. La próxima, más completa.',
  },
  directo: {
    alto: 'Muy buena comida. Así se hace.',
    medio: 'Zafa. Le faltó proteína o verdura.',
    bajo: 'Anotada. La próxima: más proteína, más verdura, menos fritura.',
  },
  divertido: {
    alto: 'Esto es nivel chef. ¿Quién sos y qué hiciste con vos?',
    medio: 'Zafa. Le pondría algo verde, y no hablo de la camiseta.',
    bajo: 'Anotada. Mañana te pido un plato con algo de color, eh.',
  },
  tranqui: {
    alto: 'Muy buena elección.',
    medio: 'Bien. Sumá verdura cuando puedas.',
    bajo: 'Anotada. Todo suma.',
  },
};

export async function montar(c, params = new URLSearchParams()) {
  const comida = await obtenerComida(params.get('id'));
  if (!comida) { location.hash = '#/hoy'; return; }
  const perfil = await obtener('perfil', 'main');
  const fecha = comida.fecha;
  const esHoy = fecha === fechaHoy();
  const kg = (await pesoActual()) ?? 70;
  const meta = await metaVigente(new Date(fecha + 'T12:00'));
  const [delDia, actividades, pasos] = await Promise.all([comidasDelDia(fecha), actividadesDelDia(fecha), pasosDelDia(fecha)]);
  const extra = kcalExtraDelDia({ actividades, pasos, kg, nivel: perfil?.actividad });
  const objetivo = (meta?.kcal_objetivo ?? 0) + extra.suma;
  const consumido = sumar(delDia).kcal;
  const tot = sumar([comida]);
  const puntaje = puntajeComida(tot, meta?.kcal_objetivo ?? 2000);
  const nivel = puntaje >= 60 ? 'alto' : puntaje >= 40 ? 'medio' : 'bajo';
  const personalidad = perfil?.gato?.personalidad ?? 'directo';
  const textos = COMENTARIOS[personalidad] ?? COMENTARIOS.directo;
  // Si anotó algo pesado, el personaje se lo dice (FRASES.md: "Cuando anotás algo pesado")
  const pesado = comida.items.find(it => esPesado({ nombre: it.nombre, kcal: it.kcal })) ?? (tot.kcal > 900 ? comida.items[0] : null);
  const chicana = pesado ? elegirFrase('pesado', { personalidad, vars: { comida: pesado.nombre.toLowerCase(), n: perfil?.nombre ?? '' } }) : null;
  const consejos = consejosComida(tot, meta?.kcal_objetivo ?? 2000);
  const primeraDelDia = esHoy && delDia.length === 1;
  const siguiente = primeraDelDia ? '#/racha' : (esHoy ? '#/hoy' : `#/hoy?fecha=${fecha}`);
  const m = MOMENTOS.find(x => x.id === comida.momento) ?? MOMENTOS[0];
  const pctDia = objetivo ? Math.min(100, (consumido / objetivo) * 100) : 0;

  c.innerHTML = `
    <section class="resultado">
      <div class="pregunta resultado__gato">
        <div>${pjHTML(chicana ? 'empachado' : nivel === 'alto' ? 'festejando' : 'contento', { titulo: perfil?.gato?.nombre || 'Tu personaje' })}</div>
        <h1 class="burbuja" tabindex="-1">${esc(chicana?.texto ?? textos[nivel])}</h1>
      </div>

      ${ayudanteHTML('chef', chicana ? 'pesado' : nivel === 'alto' ? 'sano' : 'consejo', { clase: 'ayu--derecha' })}

      <div class="tarjeta">
        <h2 class="metrica__titulo">${esHoy ? 'Tu día' : 'Ese día'}</h2>
        <p class="resultado__suma"><b>+${num(tot.kcal)}</b> kcal</p>
        <div class="macro__pista resultado__pista"><i style="width:${pctDia}%;background:var(--accent)"></i></div>
        <p class="hoy__resto">${num(consumido)} de ${num(objetivo)} kcal${objetivo - consumido >= 0
          ? ` · te quedan <b class="acento-txt">${num(objetivo - consumido)}</b>` : ''}</p>
      </div>

      <div class="tarjeta">
        <div class="metrica__fila">
          <h2 class="metrica__titulo"><img class="ico" src="img/iconos/${m.icono}.webp" alt=""> ${esc(m.nombre)} · ${esc(comida.hora)}</h2>
          <a class="chip" href="#/registrar?editar=${comida.id}">✏️ Editar</a>
        </div>
        ${typeof comida.foto === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(comida.foto)
          ? `<img class="resultado__foto" src="${esc(comida.foto)}" alt="Foto de tu comida" width="160" height="160">` : ''}
        <ul class="lista-simple">${comida.items.map(it => `<li><span>${it.emoji} ${esc(it.nombre)} <small class="suave">${esc(textoCantidad(it))}</small></span><b>${num(it.kcal)} kcal</b></li>`).join('')}</ul>
        <div class="hoja__chips" style="justify-content:flex-start;margin-top:8px">
          <span class="chip"><i class="punto" style="background:var(--macro-prot)"></i>Proteínas ${num(tot.prot)} g</span>
          <span class="chip"><i class="punto" style="background:var(--macro-carb)"></i>Carbos ${num(tot.carb)} g</span>
          <span class="chip"><i class="punto" style="background:var(--macro-grasa)"></i>Grasas ${num(tot.grasa)} g</span>
          <span class="chip">🌾 Fibra ${num(tot.fibra)} g</span>
        </div>
      </div>

      ${puntaje != null ? `<div class="tarjeta">
        <div class="metrica__fila">
          <h2 class="metrica__titulo">Puntaje nutricional</h2>
          <span class="puntaje__num">${puntaje}<small>/100</small></span>
        </div>
        <p class="puntaje__etiqueta">${etiquetaPuntaje(puntaje)}</p>
        <div class="puntaje__barra" role="img" aria-label="Puntaje ${puntaje} de 100">
          ${[0, 1, 2, 3, 4].map(k => `<span class="${puntaje >= (k + 1) * 20 ? 'lleno' : puntaje > k * 20 ? 'medio' : ''}"></span>`).join('')}
        </div>
        <ul class="consejos">${consejos.map(t => `<li>💡 ${esc(t)}</li>`).join('')}</ul>
        <p class="hoja__nota" style="text-align:left">Es una guía orientativa: mira proteína, fibra, tamaño de la porción y grasas.</p>
      </div>` : ''}

      <div class="resultado__pie">
        <a class="btn" href="${siguiente}">Listo</a>
      </div>
    </section>`;
  c.querySelector('h1').focus({ preventScroll: true });
  if (!chicana && nivel === 'alto') setTimeout(() => confeti(c.querySelector('.resultado__gato'), { cantidad: 28 }), 350);
}
