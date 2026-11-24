// Fase 2 — Hoy: el gatito, las calorías del día con su anillo, las macros y las comidas anotadas.
// Parámetro: fecha=YYYY-MM-DD para ver (y editar) otro día.
import { obtener, todos, hoy as fechaHoy } from '../db.js';
import { metaVigente, pesoActual } from '../objetivo.js';
import { aguaDelDia, sumarAgua, quitarAgua, metaAgua, actividadesDelDia, pasosDelDia, kcalExtraDelDia, kcalPasos } from '../actividad.js';
import { gatoSVG } from '../gato.js';
import { escenaSVG, momentoDelDia } from '../escena.js';
import { MOMENTOS, comidasDelDia, sumar } from '../registro.js';
import { ayunoEnCurso, progresoAyuno, reloj, metaAyunoPreferida } from '../ayuno.js';
import { puntajeDelDia, etiquetaPuntaje } from '../puntaje.js';
import { racha } from '../estadisticas.js';
import { revisarMeta, aplicarAjuste, posponerAjuste } from '../adaptativo.js';
import { sugerencias } from '../sugerencias.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });

// Frases del gatito según su personalidad y cómo viene el día. Nunca retan.
const FRASES = {
  carinoso: {
    vacio: n => `¡Hola, ${n}! Te estaba esperando. ¿Qué comiste?`,
    siesta: () => 'Me quedé dormido esperándote… ¿me contás qué comiste hoy?',
    bien: () => '¡Qué lindo día vamos armando juntos!',
    cerca: () => '¡Ya casi llegás a tu meta de hoy! 🧡',
    pasado: () => 'Hoy comiste un poco más. No pasa nada: mañana seguimos.',
  },
  directo: {
    vacio: n => `${n}, arrancamos: anotá lo primero que comiste.`,
    siesta: () => 'Hoy todavía no anotaste nada. Dale, que suma.',
    bien: () => 'Vas bien. Seguí anotando todo.',
    cerca: () => 'Estás cerca de la meta. Elegí bien lo que falta.',
    pasado: () => 'Te pasaste de la meta. Lo importante es el promedio de la semana.',
  },
  divertido: {
    vacio: n => `${n}, mi panza de gato dice que hoy no anotaste nada 😹`,
    siesta: () => 'Zzz… me dormí una siesta de 3 horas. ¿Comiste algo rico?',
    bien: () => 'Vamos como piña. Bueno, como piña con poco azúcar.',
    cerca: () => 'Casi meta. Como yo cuando casi agarro al puntero láser.',
    pasado: () => 'Hoy se nos fue la mano. A mí también con el atún. Mañana seguimos.',
  },
  tranqui: {
    vacio: () => 'Cuando quieras, anotá lo que comiste.',
    siesta: () => 'Todo tranqui. Anotá cuando puedas.',
    bien: () => 'Vas a tu ritmo. Muy bien.',
    cerca: () => 'Cerca de la meta de hoy.',
    pasado: () => 'Un día más alto no cambia nada. Seguimos.',
  },
};

export async function montar(c, params = new URLSearchParams()) {
  const hoyStr = fechaHoy();
  const fecha = params.get('fecha') && params.get('fecha') <= hoyStr ? params.get('fecha') : hoyStr;
  const esHoy = fecha === hoyStr;

  const perfil = await obtener('perfil', 'main');
  const meta = (await metaVigente(new Date(fecha + 'T12:00'))) ?? (await todos('metas'))[0] ?? null;
  const comidas = await comidasDelDia(fecha);
  const total = sumar(comidas);
  const kg = (await pesoActual()) ?? 70;
  const [agua, actividades, pasos] = await Promise.all([aguaDelDia(fecha), actividadesDelDia(fecha), pasosDelDia(fecha)]);
  const extra = kcalExtraDelDia({ actividades, pasos, kg, nivel: perfil?.actividad });
  const metaBase = meta?.kcal_objetivo ?? 0;
  const objetivo = metaBase ? metaBase + extra.suma : 0;
  const aguaMeta = metaAgua(kg);
  const quedan = objetivo - total.kcal;
  const [curso, metaAyuno, todasComidas] = await Promise.all([ayunoEnCurso(), metaAyunoPreferida(), todos('registro')]);
  const laRacha = racha([...new Set(todasComidas.map(x => x.fecha))]);
  const ajuste = esHoy ? await revisarMeta() : { listo: false };
  const ideas = esHoy && objetivo ? sugerencias({
    quedan: Math.round(objetivo - total.kcal), protFalta: meta ? Math.round(meta.prot - total.prot) : 0,
    hora: new Date().getHours(), kg, comidasHoy: comidas.length,
  }) : [];
  const minutosAct = actividades.reduce((a, x) => a + (x.minutos || 0), 0);
  const puntajeDia = meta ? puntajeDelDia({
    kcal: total.kcal, kcalMeta: objetivo, prot: total.prot, protMeta: meta.prot,
    aguaMl: agua, aguaMeta, minutosActividad: minutosAct, pasos, fibra: total.fibra,
  }) : null;
  const pct = objetivo ? Math.min(1, total.kcal / objetivo) : 0;

  // Estado del gatito y frase
  const gato = perfil?.gato?.nombre || 'Tu gatito';
  const frases = FRASES[perfil?.gato?.personalidad] ?? FRASES.carinoso;
  let situacion = 'bien';
  if (!comidas.length) situacion = esHoy && new Date().getHours() >= 15 ? 'siesta' : 'vacio';
  else if (quedan < 0) situacion = 'pasado';
  else if (pct >= 0.85) situacion = 'cerca';
  const estadoGato = { vacio: 'saluda', siesta: 'siesta', bien: 'feliz', cerca: 'festeja', pasado: 'normal' }[situacion];
  const frase = esHoy ? frases[situacion](esc(perfil?.nombre ?? '')) : `Así fue tu ${etiquetaDia(fecha, hoyStr).toLowerCase()}.`;

  // La escena sigue la hora real si es hoy; los días pasados se ven de día.
  const momento = esHoy ? momentoDelDia() : 'manana';

  // Navegación de días
  const dia = d => { const f = new Date(fecha + 'T12:00'); f.setDate(f.getDate() + d); return fechaHoy(f); };
  const hrefDia = f => (f === hoyStr ? '#/hoy' : `#/hoy?fecha=${f}`);
  const sumarHref = `#/registrar${esHoy ? '' : `?fecha=${fecha}`}`;

  const R = 27, CIRC = 2 * Math.PI * R;
  const macro = (nombre, g, obj, color) => `
    <div><div class="macro__nombre">${nombre}</div>
      <div class="macro__pista"><i style="width:${obj ? Math.min(100, (g / obj) * 100) : 0}%;background:var(${color})"></i></div>
      <div class="macro__valor">${num(g)} / ${num(obj)} g</div></div>`;

  c.innerHTML = `
    <div class="pila hoy">
      <div class="hoy__escena hoy__escena--${momento}">
        ${escenaSVG(momento)}
        <p class="hoy__frase">${frase}</p>
        <div class="gato-grande">${gatoSVG(estadoGato, { titulo: gato })}</div>
        <nav class="hoy__dias" aria-label="Cambiar de día">
          <a class="icono-btn" href="${hrefDia(dia(-1))}" aria-label="Día anterior">‹</a>
          <span class="hoy__dia">📅 ${esc(etiquetaDia(fecha, hoyStr))}</span>
          ${esHoy ? `<a class="chip chip--racha" href="#/racha" aria-label="Racha: ${laRacha} ${laRacha === 1 ? 'día' : 'días'}">🔥 ${laRacha}</a>`
            : `<a class="icono-btn" href="${hrefDia(dia(1))}" aria-label="Día siguiente">›</a>`}
        </nav>
      </div>

      <section class="tarjeta" aria-labelledby="t-kcal">
        <div class="metrica__fila">
          <div>
            <h2 class="metrica__titulo" id="t-kcal">Calorías ${esHoy ? 'de hoy' : 'del día'}</h2>
            <div class="metrica__numero">${num(total.kcal)}</div>
            <p class="hoy__resto">${!objetivo ? ''
              : quedan >= 0 ? `de ${num(objetivo)} · te quedan <b class="acento-txt">${num(quedan)}</b>`
              : `de ${num(objetivo)} · ${num(-quedan)} por encima`}</p>
            ${extra.suma ? `<p class="hoy__extra">🏃 Meta ${num(metaBase)} + ${num(extra.suma)} por actividad</p>` : ''}
          </div>
          <div class="anillo">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="6"/>
              <circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"
                stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC * (1 - pct)}" class="anillo__progreso"/>
            </svg>
            <a class="icono-btn" href="${sumarHref}" aria-label="Anotar comida">+</a>
          </div>
        </div>
        ${meta ? `<div class="macros">
          ${macro('Carbos', total.carb, meta.carb, '--macro-carb')}
          ${macro('Grasas', total.grasa, meta.grasa, '--macro-grasa')}
          ${macro('Proteínas', total.prot, meta.prot, '--macro-prot')}
        </div>` : ''}
        ${quedan < 0 ? '<p class="hoy__nota">Un día por encima no cambia nada: lo que cuenta es el promedio de la semana.</p>' : ''}
      </section>

      ${ajuste.listo ? `<section class="tarjeta tarjeta--ajuste" aria-labelledby="t-ajuste">
        <h2 class="metrica__titulo" id="t-ajuste">📊 Podemos ajustar tu meta</h2>
        <p class="ajuste__cifras"><s>${num(ajuste.antes)}</s> → <b>${num(ajuste.despues)} kcal</b> por día</p>
        <p class="hoy__nota">${esc(ajuste.motivo)} Lo calculé con tus pesos y tus días anotados completos del último mes${ajuste.limitadoPorPiso ? '. Nunca bajamos del mínimo seguro' : ''}.</p>
        <div class="campos-2">
          <button class="btn" data-ajuste="aplicar">Aplicar</button>
          <button class="btn btn--secundario" data-ajuste="despues">Ahora no</button>
        </div>
      </section>` : ''}

      ${ideas.length ? `<section class="tarjeta" aria-labelledby="t-ideas">
        <h2 class="metrica__titulo" id="t-ideas">Ideas para cerrar el día</h2>
        <ul class="ideas">${ideas.map(i => `<li><span aria-hidden="true">${i.emoji}</span>
          <p>${esc(i.texto)}${i.accion ? ` <a class="enlace" href="${i.accion.href}">${esc(i.accion.texto)}</a>` : ''}</p></li>`).join('')}</ul>
      </section>` : ''}

      <section class="tarjeta" aria-labelledby="t-comidas">
        <h2 class="metrica__titulo" id="t-comidas">Comidas</h2>
        ${comidas.length ? `<ul class="comidas">${comidas.map(htmlComida).join('')}</ul>`
          : `<p class="hoy__vacio">${esHoy ? 'Todavía no anotaste nada hoy.' : 'Ese día no anotaste nada. Todavía podés hacerlo.'}</p>`}
        <a class="btn btn--secundario" href="${sumarHref}">+ Anotar comida</a>
      </section>

      <section class="tarjeta" aria-labelledby="t-act">
        <div class="metrica__fila">
          <div>
            <h2 class="metrica__titulo" id="t-act">Actividad</h2>
            <p class="hoy__agua">${extra.quemadas ? `<b>${num(extra.quemadas)}</b> kcal quemadas` : 'Todavía nada'}</p>
          </div>
          <a class="icono-btn" href="#/actividad${esHoy ? '' : `?fecha=${fecha}`}" aria-label="Anotar actividad">+</a>
        </div>
        ${actividades.length || pasos ? `<ul class="lista-simple">
          ${actividades.map(a => `<li><span>${a.emoji} ${esc(a.nombre)} · ${a.minutos} min</span><b>${num(a.kcal)} kcal</b></li>`).join('')}
          ${pasos ? `<li><span>👣 ${num(pasos)}${perfil?.meta_pasos ? ` de ${num(perfil.meta_pasos)}` : ''} pasos${perfil?.meta_pasos && pasos >= perfil.meta_pasos ? ' ✅' : ''}</span><b>${num(kcalPasos(pasos, kg))} kcal</b></li>` : ''}
        </ul>` : '<p class="hoy__vacio">Caminar, entrenar o los pasos del día suman calorías a tu meta.</p>'}
        ${esHoy ? '<a class="btn btn--secundario" href="#/entrenar" style="margin-top:8px">🏋️ Entrenar con una rutina</a>' : ''}
      </section>

      <section class="tarjeta" aria-labelledby="t-agua">
        <div class="metrica__fila">
          <div>
            <h2 class="metrica__titulo" id="t-agua">Agua</h2>
            <p class="hoy__agua"><b>${num(agua)}</b> / ${num(aguaMeta)} ml</p>
          </div>
          <div class="agua__botones">
            <button class="icono-btn" data-agua="-" aria-label="Sacar un vaso" ${agua ? '' : 'disabled'}>–</button>
            <button class="icono-btn icono-btn--acento" data-agua="+" aria-label="Sumar un vaso de 250 ml">+</button>
          </div>
        </div>
        <div class="vasos" aria-hidden="true">${Array.from({ length: aguaMeta / 250 }, (_, k) =>
          `<span class="vaso${k < Math.floor(agua / 250) ? ' vaso--lleno' : ''}"></span>`).join('')}</div>
      </section>



      <section class="tarjeta" aria-labelledby="t-ayuno">
        <div class="metrica__fila">
          <div>
            <h2 class="metrica__titulo" id="t-ayuno">Ayuno</h2>
            ${curso ? `<p class="hoy__agua"><b id="reloj-ayuno">${reloj(progresoAyuno(curso).horas)}</b> de ${curso.meta_h} h</p>`
              : `<p class="hoy__agua">Meta: ${metaAyuno} h</p>`}
          </div>
          <a class="${curso ? 'chip' : 'btn btn--chico'}" href="#/ayuno">${curso ? 'Ver' : 'Empezar'}</a>
        </div>
        ${curso ? `<div class="macro__pista" style="margin-top:12px"><i id="barra-ayuno" style="width:${progresoAyuno(curso).pct * 100}%;background:var(--accent)"></i></div>`
          : '<p class="hoy__vacio">Opcional. Podés empezarlo desde tu última comida.</p>'}
      </section>

      <section class="tarjeta" aria-labelledby="t-puntaje">
        <div class="metrica__fila">
          <div>
            <h2 class="metrica__titulo" id="t-puntaje">Puntaje del día</h2>
            <p class="hoy__agua">${puntajeDia != null ? esc(etiquetaPuntaje(puntajeDia)) : 'Anotá una comida para verlo'}</p>
          </div>
          <div class="puntaje-anillo" role="img" aria-label="${puntajeDia != null ? `Puntaje ${puntajeDia} de 100` : 'Sin puntaje todavía'}">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="6"/>
              <circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"
                stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC * (1 - (puntajeDia ?? 0) / 100)}" transform="rotate(-90 32 32)"/>
            </svg>
            <span>${puntajeDia ?? '–'}</span>
          </div>
        </div>
        <p class="hoy__vacio">Suma estar cerca de tu meta, la proteína, el agua, moverte y la fibra.</p>
      </section>
    </div>
    <p class="aviso-flotante" role="status" hidden></p>`;

  // Reloj del ayuno en curso
  if (curso) {
    // Se guarda el elemento: si la pantalla se vuelve a pintar, este reloj se apaga solo.
    const el = c.querySelector('#reloj-ayuno'), barra = c.querySelector('#barra-ayuno');
    const t = setInterval(() => {
      if (!el.isConnected) return clearInterval(t);
      const p = progresoAyuno(curso);
      el.textContent = reloj(p.horas);
      barra.style.width = `${p.pct * 100}%`;
    }, 1000);
  }

  c.querySelectorAll('[data-ajuste]').forEach(b => b.addEventListener('click', async () => {
    if (b.dataset.ajuste === 'aplicar') {
      await aplicarAjuste(ajuste);
      try { sessionStorage.setItem('nathorfit-aviso', `Meta actualizada: ${num(ajuste.despues)} kcal por día.`); } catch { /* nada */ }
    } else await posponerAjuste();
    montar(c, params);
  }));

  c.querySelectorAll('[data-agua]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    if (b.dataset.agua === '+') await sumarAgua(fecha, 250); else await quitarAgua(fecha);
    montar(c, params);
  }));

  // Mensaje que deja la pantalla de registrar al guardar
  let texto = null;
  try { texto = sessionStorage.getItem('nathorfit-aviso'); sessionStorage.removeItem('nathorfit-aviso'); } catch { /* nada */ }
  if (texto) {
    const p = c.querySelector('.aviso-flotante');
    p.textContent = texto; p.hidden = false;
    setTimeout(() => { p.hidden = true; }, 3500);
  }
}

// Solo se muestran miniaturas que son imágenes en data URL (un respaldo editado a mano no puede meter otra cosa).
const esFoto = f => typeof f === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(f);

function htmlComida(com) {
  const m = MOMENTOS.find(x => x.id === com.momento) ?? MOMENTOS[0];
  const emojis = [...new Set(com.items.map(i => i.emoji))].slice(0, 3).join('');
  const nombres = com.items.map(i => i.nombre).join(', ');
  return `<li><a class="comida" href="#/registrar?editar=${com.id}" aria-label="${esc(m.nombre)} ${esc(com.hora)}, ${num(com.kcal)} kcal. Editar">
    ${esFoto(com.foto) ? `<img class="comida__foto" src="${esc(com.foto)}" alt="" width="52" height="52">`
      : `<span class="comida__emoji" aria-hidden="true">${emojis}</span>`}
    <span class="comida__texto"><b>${esc(m.nombre)} <small>${esc(com.hora)}</small></b><small>${esc(nombres)}</small></span>
    <span class="comida__kcal">${num(com.kcal)}<small> kcal</small></span>
  </a></li>`;
}

function etiquetaDia(fecha, hoyStr) {
  if (fecha === hoyStr) return 'Hoy';
  const ayer = new Date(hoyStr + 'T12:00'); ayer.setDate(ayer.getDate() - 1);
  const z = n => String(n).padStart(2, '0');
  if (fecha === `${ayer.getFullYear()}-${z(ayer.getMonth() + 1)}-${z(ayer.getDate())}`) return 'Ayer';
  const t = new Date(fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
