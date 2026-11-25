// Fase 2 — Hoy: el personaje en su cuarto, las calorías del día con su anillo, las macros y las comidas anotadas.
// Parámetro: fecha=YYYY-MM-DD para ver (y editar) otro día.
import { obtener, todos, hoy as fechaHoy } from '../db.js';
import { metaVigente, pesoActual } from '../objetivo.js';
import { aguaDelDia, sumarAgua, quitarAgua, metaAgua, actividadesDelDia, pasosDelDia, kcalExtraDelDia, kcalPasos } from '../actividad.js';
import { momentoDelDia } from '../escena.js';
import { pjHTML, fijarPersonaje, hidratar, urlFondo } from './pj.js';
import { leerDatos, estadoDeHoy, sincronizarLogros, marcarUso, abrirCofre } from '../juego.js';
import { archivoCuarto, objetosDelCuarto, nivelLimpieza, insigniaRacha, archivoPersonaje } from '../personaje-estado.js';
import { elegirFrase } from '../frases.js';
import { LOGROS } from './logro.js';
import { MOMENTOS, comidasDelDia, sumar } from '../registro.js';
import { ayunoEnCurso, progresoAyuno, reloj, metaAyunoPreferida, faseAyuno } from '../ayuno.js';
import { puntajeDelDia, etiquetaPuntaje, misionesDelDia } from '../puntaje.js';
import { confeti, contar } from './festejo.js';
import { liquido, necesitaPermiso, pedirPermiso, inclinacion } from './liquido.js';
import { racha } from '../estadisticas.js';
import { revisarMeta, aplicarAjuste, posponerAjuste } from '../adaptativo.js';
import { sugerencias } from '../sugerencias.js';
import { obtenerClave } from '../ia.js';
import { consejoGuardado, consejoDelDia } from '../entrenador.js';
import { ayudanteHTML } from './ayudante.js';
import { situacionEntrenador, situacionChef } from '../ayudantes.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });

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
  const misiones = misionesDelDia({
    kcal: total.kcal, kcalMeta: objetivo, prot: total.prot, protMeta: meta?.prot,
    aguaMl: agua, aguaMeta, minutosActividad: minutosAct, pasos, fibra: total.fibra,
  });
  const hechas = misiones.filter(m => m.hecha).length;
  // Entrenador con IA: el consejo del día (se pide una vez por día; mientras tanto, un texto fijo)
  const conClave = esHoy && Boolean(await obtenerClave());
  const consejo = conClave ? await consejoGuardado() : null;

  // El personaje: etapa, limpieza, pose y lo que dice (docs/personaje/ENCARGO-PERSONAJE.md y FRASES.md)
  const datos = await leerDatos();
  if (esHoy) await sincronizarLogros(datos);
  const est = estadoDeHoy(datos, esHoy ? new Date() : new Date(fecha + 'T21:00'));
  if (esHoy) await marcarUso();
  fijarPersonaje({ etapa: est.etapa, limpieza: est.limpieza, equipo: est.equipo });
  const nombrePj = perfil?.gato?.nombre || 'Tu personaje';
  // Pose de un momento (por ejemplo, tomando agua después de sumar un vaso): dura 3 segundos
  let poseMomento = null;
  try { poseMomento = sessionStorage.getItem('nathorfit-pose'); sessionStorage.removeItem('nathorfit-pose'); } catch { /* nada */ }
  const personalidad = perfil?.gato?.personalidad ?? 'directo';
  const frase = esHoy ? fraseDelDia(est, perfil, personalidad, hoyStr) : `Así fue tu ${etiquetaDia(fecha, hoyStr).toLowerCase()}.`;

  // La escena sigue la hora real si es hoy; los días pasados se ven de día.
  const momento = esHoy ? momentoDelDia() : 'manana';
  const noche = momento === 'noche';
  const nivel = nivelLimpieza(est.limpieza);
  const semilla = Number(hoyStr.replaceAll('-', '')) % 97;
  const objetos = objetosDelCuarto(est.limpieza, semilla);
  const llama = insigniaRacha(est.racha);
  // Logro sin ver: se avisa con una tarjeta que lleva a su festejo (no corta lo que estás haciendo).
  // Si hay varios, el más grande; los demás quedan en Mis logros.
  const peso = id => (/^hito-llegada/.test(id) ? 1000 : /^hito-(\d+)kg/.test(id) ? 100 + Number(id.match(/\d+/)[0]) : /^racha-/.test(id) ? 50 + Number(id.slice(6)) : /^logro-/.test(id) ? 10 : 0);
  const sinVer = esHoy ? datos.logros.filter(l => !l.visto && peso(l.id) > 0).sort((a, b) => peso(b.id) - peso(a.id))[0] : null;

  // Navegación de días
  const dia = d => { const f = new Date(fecha + 'T12:00'); f.setDate(f.getDate() + d); return fechaHoy(f); };
  const hrefDia = f => (f === hoyStr ? '#/hoy' : `#/hoy?fecha=${f}`);
  const sumarHref = `#/registrar${esHoy ? '' : `?fecha=${fecha}`}`;

  const R = 27, CIRC = 2 * Math.PI * R;
  const vasos = Math.floor(agua / 250);
  // Lo que sube o baja desde la última vez que se vio esta pantalla (para animar solo el cambio)
  const recordar = (clave, valor) => {
    let antes = valor;
    try { const v = sessionStorage.getItem(clave); if (v != null) antes = Number(v); sessionStorage.setItem(clave, valor); } catch { /* nada */ }
    return antes;
  };
  const nivelKcal = objetivo ? total.kcal / objetivo : 0;
  const nivelKcalAntes = recordar(`nathorfit-tanque-${fecha}`, nivelKcal);
  const nivelAgua = Math.min(1, agua / aguaMeta);
  const nivelAguaAntes = recordar(`nathorfit-botella-${fecha}`, nivelAgua);
  // El plato: todo lo que comiste en el día, en el orden en que lo anotaste
  const bocados = comidas.flatMap(com => com.items.map(i => ({ emoji: i.emoji || '🍽️', nombre: i.nombre })));
  const bocadosAntes = recordar(`nathorfit-plato-${fecha}`, bocados.length);
  // La pista de actividad: misión de moverse (30 min u 8000 pasos)
  const mov = misiones.find(m => m.id === 'mov');
  let abiertas = false;   // las misiones arrancan cerradas; si las abriste, quedan abiertas mientras uses la app
  try { abiertas = sessionStorage.getItem('nathorfit-misiones-abiertas') === 'si'; } catch { /* nada */ }
  // Ayuno: en qué etapa va (o cómo sería uno con tu meta)
  const horasAyuno = curso ? progresoAyuno(curso).horas : 0;
  const metaH = curso?.meta_h ?? metaAyuno;
  const etapa = faseAyuno(horasAyuno, metaH);
  const metaPasos = perfil?.meta_pasos || 8000;
  const macro = (nombre, g, obj, color) => `
    <div><div class="macro__nombre"><i class="macro__color" style="background:var(${color})"></i>${nombre}</div>
      <div class="macro__pista"><i style="width:${obj ? Math.min(100, (g / obj) * 100) : 0}%;background:var(${color})"></i></div>
      <div class="macro__valor">${num(g)} / ${num(obj)} g</div></div>`;

  c.innerHTML = `
    <div class="pila hoy">
      <div class="hoy__escena hoy__escena--${momento} hoy__escena--${nivel}">
        <div class="escena-pj" aria-hidden="true">
          <img class="escena-pj__cuarto" data-fondo="img/cuarto/${archivoCuarto(est.limpieza, noche)}.webp" alt="">
          ${est.premios.map(p => `<img class="escena-pj__obj escena-pj__premio" src="img/escena/${p.id}.webp" alt="" style="left:${p.x}%;top:${p.y}%;width:${p.w}%">`).join('')}
          ${objetos.map((o, i) => `<img class="escena-pj__obj escena-pj__suelto" src="img/escena/${o}.webp" alt="" style="${i % 2 ? 'right' : 'left'}:${6 + (i >> 1) * 13}%">`).join('')}
          ${nivel === 'desastre' ? '<img class="efecto efecto--moscas" src="img/escena/mugre-moscas.webp" alt="">' : ''}
          ${est.limpieza < 20 ? '<img class="efecto efecto--olor" src="img/escena/mugre-olor.webp" alt="">' : ''}
          ${nivel === 'ordenado' ? '<img class="efecto efecto--brillos" src="img/efectos/brillos.webp" alt="">' : ''}
        </div>
        <p class="hoy__frase burbuja-pj" aria-live="polite">${esc(frase)}</p>
        <div class="escena-pj__personaje">
          ${pjHTML(poseMomento ?? est.pose, { titulo: `${nombrePj}, ${TEXTO_POSE[est.pose] ?? 'contento'}` })}
          ${est.pose === 'entrenando' ? '<img class="efecto efecto--sudor" src="img/efectos/gotas-sudor.webp" alt="">' : ''}
          ${est.pose === 'durmiendo' ? '<span class="efecto efecto--zzz" aria-hidden="true"><i>Z</i><i>z</i><i>z</i></span>' : ''}
          ${nivel === 'desastre' && !['fiaca', 'durmiendo'].includes(est.pose) ? `
            <img class="mancha" src="img/escena/mugre-salsa.webp" alt="" style="left:36%;top:50%">
            <img class="mancha" src="img/escena/mugre-grasa.webp" alt="" style="left:52%;top:40%">
            ${est.limpieza < 20 ? '<img class="mancha" src="img/escena/mugre-cafe.webp" alt="" style="left:44%;top:62%">' : ''}` : ''}
        </div>
        ${est.pose === 'festejando' ? '<img class="efecto efecto--confeti" src="img/efectos/confeti.webp" alt="">' : ''}
        ${esHoy && est.cofre ? '<button class="cofre" data-cofre aria-label="Abrir el cofre de la semana"><img src="img/insignias/cofre-cerrado.webp" alt=""></button>' : ''}
        <nav class="hoy__dias" aria-label="Cambiar de día">
          <a class="icono-btn" href="${hrefDia(dia(-1))}" aria-label="Día anterior">‹</a>
          <span class="hoy__dia">${esc(etiquetaDia(fecha, hoyStr))}</span>
          ${esHoy ? `<a class="chip chip--racha" href="#/racha" aria-label="Racha: ${laRacha} ${laRacha === 1 ? 'día' : 'días'}">${llama ? `<img src="img/insignias/racha-${llama}.webp" alt="" width="22" height="22">` : '<span class="llama">🔥</span>'} ${laRacha}</a>`
            : `<a class="icono-btn" href="${hrefDia(dia(1))}" aria-label="Día siguiente">›</a>`}
        </nav>
      </div>

      ${sinVer ? `<a class="tarjeta tarjeta--logro" href="#/logro?id=${esc(sinVer.id)}">
        <img src="img/insignias/${esc(sinVer.id)}.webp" alt="" width="56" height="56">
        <span><small>¡Logro nuevo!</small><b>${esc(LOGROS[sinVer.id]?.[0] ?? 'Mirá lo que ganaste')}</b></span>
        <span class="tarjeta--logro__ver" aria-hidden="true">Ver ›</span>
      </a>` : ''}

      <section class="tarjeta" aria-labelledby="t-kcal">
        <div class="metrica__fila">
          <h2 class="metrica__titulo" id="t-kcal">Calorías ${esHoy ? 'de hoy' : 'del día'}</h2>
          <button class="chip chip--sensor" data-sensor hidden>📱 Mover con el teléfono</button>
        </div>
        <div class="tanque${quedan < 0 ? ' tanque--pasado' : ''}">
          <canvas class="tanque__lienzo" data-tanque aria-hidden="true"></canvas>
          <div class="tanque__dato"><b data-contar="${Math.round(total.kcal)}">${num(total.kcal)}</b><small>${objetivo ? `de ${num(objetivo)} kcal` : 'kcal'}</small></div>
          ${!total.kcal ? '<p class="tanque__vacio">Vacío. Cada comida que anotes lo va llenando.</p>' : ''}
        </div>
        <div class="tanque__pie">
          <p class="resumen__quedan">${!objetivo ? 'Anotá lo que comés y te muestro cómo venís.'
            : quedan >= 0 ? `Te quedan <b>${num(quedan)}</b>`
            : `<b class="pasado">${num(-quedan)}</b> por encima`}</p>
          <a class="btn btn--acento btn--chico" href="${sumarHref}">+ Anotar comida</a>
        </div>
        ${extra.suma ? `<p class="hoy__extra">🏃 Meta ${num(metaBase)} + ${num(extra.suma)} por actividad</p>` : ''}
        ${meta ? `<div class="macros">
          ${macro('Carbos', total.carb, meta.carb, '--macro-carb')}
          ${macro('Grasas', total.grasa, meta.grasa, '--macro-grasa')}
          ${macro('Proteínas', total.prot, meta.prot, '--macro-prot')}
        </div>` : ''}
        ${quedan < 0 ? '<p class="hoy__nota">Un día por encima no cambia nada: lo que cuenta es el promedio de la semana.</p>' : ''}
      </section>

      ${meta ? `<section class="tarjeta tarjeta--misiones" aria-labelledby="t-puntaje">
        <details class="plegable" data-plegable="misiones"${abiertas ? ' open' : ''}>
        <summary class="metrica__fila plegable__cabeza">
          <div>
            <h2 class="metrica__titulo" id="t-puntaje">Misiones de hoy</h2>
            <p class="hoy__agua">${hechas} de ${misiones.length} cumplidas${puntajeDia != null ? ` · ${esc(etiquetaPuntaje(puntajeDia))}` : ''}</p>
            <span class="plegable__pista" aria-hidden="true">${misiones.map(m => `<i class="${m.hecha ? 'si' : ''}"></i>`).join('')}</span>
          </div>
          <div class="puntaje-anillo" role="img" aria-label="${puntajeDia != null ? `Puntaje ${puntajeDia} de 100` : 'Sin puntaje todavía'}">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="6"/>
              <circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--amarillo)" stroke-width="6" stroke-linecap="round"
                stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC * (1 - (puntajeDia ?? 0) / 100)}" style="--desde:${CIRC}" class="anillo__progreso" transform="rotate(-90 32 32)"/>
            </svg>
            <span>${puntajeDia ?? '–'}</span>
          </div>
          <span class="plegable__flecha" aria-hidden="true"></span>
        </summary>
        <ul class="misiones">${misiones.map(m => `<li class="mision${m.hecha ? ' mision--hecha' : ''}">
          <span class="mision__tilde" aria-hidden="true">${m.hecha ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>' : ''}</span>
          <span class="mision__texto"><span>${esc(m.nombre)}${m.hecha ? '<span class="visualmente-oculto"> (cumplida)</span>' : ''}</span>
            ${m.hecha ? '' : `<span class="mision__pista"><i style="width:${Math.round(m.avance * 100)}%"></i></span>`}</span>
          <span class="mision__pts">+${m.peso}</span>
        </li>`).join('')}</ul>
        </details>
      </section>` : ''}

      ${esHoy ? `<section class="ayudantes" aria-label="Tu equipo">
        ${ayudanteHTML('entrenador', situacionEntrenador({ minutosActividad: minutosAct, hora: new Date().getHours() }), {
          href: '#/entrenador', id: 'consejo-coach',
          texto: conClave ? (consejo ?? 'Pensando qué decirte hoy…') : 'Te armo la rutina, te digo qué cocinar y cómo venís. Tocá para activarlo.',
        })}
        ${ayudanteHTML('chef', situacionChef({ kcal: total.kcal, kcalMeta: objetivo, comidasHoy: comidas.length, hora: new Date().getHours() }), {
          href: '#/entrenador?tab=cocinar', clase: 'ayu--derecha',
        })}
      </section>` : ''}

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
        <h2 class="metrica__titulo" id="t-comidas"><img class="ico" src="img/iconos/anotar-comida.webp" alt=""> Comidas</h2>
        ${platoHTML(bocados, bocadosAntes, total.kcal)}
        ${comidas.length ? `<ul class="comidas">${comidas.map(htmlComida).join('')}</ul>`
          : `<p class="hoy__vacio plato__vacio">${esHoy ? 'El plato está vacío: anotá lo que comas y va cayendo acá.' : 'Ese día no anotaste nada. Todavía podés hacerlo.'}</p>`}
        <a class="btn btn--secundario" href="${sumarHref}">+ Anotar comida</a>
      </section>

      <section class="tarjeta" aria-labelledby="t-act">
        <div class="metrica__fila">
          <div>
            <h2 class="metrica__titulo" id="t-act"><img class="ico" src="img/iconos/actividad.webp" alt=""> Actividad</h2>
            <p class="hoy__agua">${extra.quemadas ? `<b>${num(extra.quemadas)}</b> kcal quemadas` : 'Todavía nada'}</p>
          </div>
          <a class="icono-btn" href="#/actividad${esHoy ? '' : `?fecha=${fecha}`}" aria-label="Anotar actividad">+</a>
        </div>
        ${pistaHTML(mov.avance, { minutos: minutosAct, pasos, metaPasos, quemadas: extra.quemadas })}
        ${actividades.length || pasos ? `<ul class="lista-simple">
          ${actividades.map(a => `<li><span>${a.emoji} ${esc(a.nombre)} · ${a.minutos} min</span><b>${num(a.kcal)} kcal</b></li>`).join('')}
          ${pasos ? `<li><span>👣 ${num(pasos)}${perfil?.meta_pasos ? ` de ${num(perfil.meta_pasos)}` : ''} pasos${perfil?.meta_pasos && pasos >= perfil.meta_pasos ? ' ✅' : ''}</span><b>${num(kcalPasos(pasos, kg))} kcal</b></li>` : ''}
        </ul>` : ''}
        ${esHoy ? '<a class="btn btn--secundario" href="#/entrenar" style="margin-top:8px">🏋️ Entrenar con una rutina</a>' : ''}
      </section>

      <section class="tarjeta" aria-labelledby="t-agua">
        <div class="agua">
          <div class="agua__botella"><canvas data-botella aria-hidden="true"></canvas></div>
          <div class="agua__lado">
            <h2 class="metrica__titulo" id="t-agua"><img class="ico" src="img/iconos/agua.webp" alt=""> Agua</h2>
            <p class="agua__ml"><b data-contar="${Math.round(agua)}">${num(agua)}</b> / ${num(aguaMeta)} ml</p>
            <p class="hoy__agua">${agua >= aguaMeta ? '¡Botella llena! 💧' : `${vasos} de ${aguaMeta / 250} vasos · faltan ${num(aguaMeta - agua)} ml`}</p>
            <div class="agua__botones">
              <button class="icono-btn" data-agua="-" aria-label="Sacar un vaso" ${agua ? '' : 'disabled'}>–</button>
              <button class="btn btn--chico agua__sumar" data-agua="+" aria-label="Sumar un vaso de 250 ml">+ Vaso</button>
            </div>
          </div>
        </div>
      </section>



      <section class="tarjeta" aria-labelledby="t-ayuno">
        <div class="metrica__fila">
          <div>
            <h2 class="metrica__titulo" id="t-ayuno"><img class="ico" src="img/iconos/ayuno.webp" alt=""> Ayuno</h2>
            <p class="hoy__agua">${curso ? `Meta: ${curso.meta_h} h` : 'Opcional · desde tu última comida'}</p>
          </div>
          <a class="${curso ? 'chip' : 'btn btn--chico'}" href="#/ayuno">${curso ? 'Ver' : 'Empezar'}</a>
        </div>
        ${ayunoHTML(etapa, horasAyuno, metaH, Boolean(curso))}
      </section>
    </div>
    <p class="aviso-flotante" role="status" hidden></p>`;

  hidratar(c);
  contar(c);
  // Confeti cuando se cumple una misión nueva (se recuerda cuántas había en este teléfono)
  if (esHoy && meta) {
    let antes = hechas;
    try { antes = Number(localStorage.getItem(`nathorfit-misiones-${fecha}`) ?? hechas); localStorage.setItem(`nathorfit-misiones-${fecha}`, hechas); } catch { /* nada */ }
    if (hechas > antes) setTimeout(() => confeti(c.querySelector('.plegable[open] .mision--hecha .mision__tilde') ?? c.querySelector('.puntaje-anillo'), { cantidad: 26 }), 450);
  }
  // Los líquidos: el tanque de calorías (capas por macro: la grasa flota arriba) y la botella de agua
  const capasKcal = [
    { color: '--macro-prot', valor: total.prot * 4 },
    { color: '--macro-carb', valor: total.carb * 4 },
    { color: '--macro-grasa', valor: total.grasa * 9 },
  ];
  const tanque = c.querySelector('[data-tanque]');
  if (tanque) liquido(tanque, {
    forma: 'tanque', meta: Boolean(objetivo), marcas: 4,
    nivel: objetivo ? nivelKcal : (total.kcal ? 0.5 : 0), desde: objetivo ? nivelKcalAntes : 0, gota: nivelKcal > nivelKcalAntes,
    capas: capasKcal.some(x => x.valor > 0) ? capasKcal : [{ color: '--accent', valor: 1 }],
  });
  const botella = c.querySelector('[data-botella]');
  if (botella) liquido(botella, {
    forma: 'botella', nivel: nivelAgua, desde: nivelAguaAntes, gota: nivelAgua > nivelAguaAntes,
    marcas: Math.max(2, Math.round(aguaMeta / 500)), capas: [{ color: '#4FA8F5', valor: 1 }], colorTapa: '#3B8FE0',
  });
  if (nivelAgua >= 1 && nivelAguaAntes < 1) setTimeout(() => confeti(botella, { cantidad: 18, alcance: 0.7 }), 1300);
  // iPhone: hay que pedir permiso para que el líquido siga al teléfono
  const btnSensor = c.querySelector('[data-sensor]');
  if (btnSensor && necesitaPermiso()) {
    btnSensor.hidden = false;
    btnSensor.addEventListener('click', async () => { if (await pedirPermiso()) btnSensor.hidden = true; });
  }
  // Misiones: se abren y se cierran tocando; queda como la dejaste
  c.querySelector('[data-plegable]')?.addEventListener('toggle', e => {
    try { sessionStorage.setItem('nathorfit-misiones-abiertas', e.target.open ? 'si' : 'no'); } catch { /* nada */ }
  });
  // El plato: lo que está arriba se desliza un poco para el lado al que inclinás el teléfono
  const plato = c.querySelector('.plato');
  if (plato && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const mover = () => {
      if (!plato.isConnected) return;
      plato.style.setProperty('--incl', inclinacion().toFixed(2));
      requestAnimationFrame(mover);
    };
    requestAnimationFrame(mover);
  }
  if (poseMomento) setTimeout(() => {
    const lugar = c.querySelector('.escena-pj__personaje .pj');
    if (!lugar?.isConnected) return;
    lugar.dataset.pj = archivoPersonaje({ etapa: est.etapa, pose: est.pose, limpieza: est.limpieza });
    hidratar(c);
  }, 3000);
  // El cuarto con la bandera del equipo (mientras se pinta, se ve el original)
  const cuarto = c.querySelector('[data-fondo]');
  cuarto.src = cuarto.dataset.fondo;
  urlFondo(cuarto.dataset.fondo).then(u => { if (cuarto.isConnected) cuarto.src = u; });
  c.querySelector('[data-cofre]')?.addEventListener('click', async () => {
    await abrirCofre();
    location.hash = '#/logro?id=cofre';
  });
  if (conClave && !consejo) {
    consejoDelDia().then(t => {
      const el = c.querySelector('#consejo-coach');
      if (el?.isConnected) el.textContent = t ?? 'Tocá para entrenar, cocinar o ver cómo venís.';
    }).catch(err => {
      console.warn('Consejo del día', err);
      const el = c.querySelector('#consejo-coach');
      if (el?.isConnected) el.textContent = 'Tocá para entrenar, cocinar o ver cómo venís.';
    });
  }
  // Reloj del ayuno en curso: el número, el arco y la luna que da la vuelta
  if (curso) {
    // Se guarda el elemento: si la pantalla se vuelve a pintar, este reloj se apaga solo.
    const el = c.querySelector('#reloj-ayuno'), dial = c.querySelector('.dial');
    const t = setInterval(() => {
      if (!el?.isConnected) return clearInterval(t);
      const p = progresoAyuno(curso);
      el.textContent = reloj(p.horas);
      dial.style.setProperty('--p', p.pct.toFixed(4));
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
    if (b.dataset.agua === '+') {
      await sumarAgua(fecha, 250);
      try { sessionStorage.setItem('nathorfit-pose', 'tomando-agua'); } catch { /* nada */ }
    } else await quitarAgua(fecha);
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

const TEXTO_POSE = {
  contento: 'contento', fiaca: 'tirado de fiaca', empachado: 'empachado', entrenando: 'entrenando', festejando: 'festejando',
  durmiendo: 'durmiendo', triste: 'triste',
};

/** Frase del personaje para hoy: no repite en el día (se recuerdan las dichas en este teléfono). */
function fraseDelDia(est, perfil, personalidad, hoyStr) {
  if (!est.situacion) return 'Hoy comiste poco. Comer por debajo del mínimo no ayuda: sumá algo con proteína.';
  const clave = `nathorfit-frases-${hoyStr}`;
  let dichas = [];
  try { dichas = JSON.parse(localStorage.getItem(clave) || '[]'); } catch { /* nada */ }
  // La misma situación en la misma visita conserva su frase (no cambia en cada repintado)
  let ult = null;
  try { ult = JSON.parse(sessionStorage.getItem('nathorfit-frase') || 'null'); } catch { /* nada */ }
  if (ult?.fecha === hoyStr && ult.situacion === est.situacion) return ult.texto;
  const r = elegirFrase(est.situacion, {
    personalidad, yaDichas: dichas,
    vars: { n: perfil?.nombre ?? '', hora: String(new Date().getHours()), dias: est.racha || est.diasSinEntrar, vasos: Math.floor(est.aguaMl / 250) },
  });
  if (!r) return '';
  try {
    localStorage.setItem(clave, JSON.stringify([...dichas, r.original]));
    sessionStorage.setItem('nathorfit-frase', JSON.stringify({ fecha: hoyStr, situacion: est.situacion, texto: r.texto }));
  } catch { /* nada */ }
  return r.texto;
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

/** El plato del día: cada cosa que comiste cae encima (las nuevas desde la última vez, con un golpecito). */
function platoHTML(bocados, antes, kcal) {
  const MAX = 14;
  const vis = bocados.slice(-MAX), corrido = bocados.length - vis.length, n = vis.length;
  let ultimo = 0;
  const items = vis.map((b, j) => {
    const r = n === 1 ? 0 : (n <= 3 ? 20 : n <= 6 ? 26 : 31) * Math.sqrt((j + 0.5) / n);
    const ang = j * 2.39996 - 1.2;
    const nuevo = corrido + j >= antes;
    const d = nuevo ? (corrido + j - antes) * 160 : 0;
    if (nuevo) ultimo = d;
    return `<span class="plato__bocado${nuevo ? ' plato__bocado--cae' : ''}" style="left:${(50 + r * Math.cos(ang)).toFixed(1)}%;top:${(50 + r * Math.sin(ang)).toFixed(1)}%;--k:${(0.5 + ((j * 37) % 10) / 12).toFixed(2)};--d:${d}ms"><i>${esc(b.emoji)}</i></span>`;
  }).join('');
  const hayNuevo = bocados.length > antes;
  return `<div class="plato${hayNuevo ? ' plato--golpe' : ''}${n ? '' : ' plato--vacio'}" style="--golpe:${ultimo + 480}ms;--tam:${n <= 3 ? 58 : n <= 6 ? 46 : 36}px" aria-hidden="true">
    <div class="plato__loza">${items}</div>
    ${bocados.length > MAX ? `<span class="plato__mas">+${bocados.length - MAX}</span>` : ''}
    ${kcal ? `<span class="plato__total">${num(kcal)} kcal</span>` : ''}
  </div>`;
}

/** La pista de actividad: el corredor avanza hasta la bandera (misión: 30 min u 8000 pasos). */
function pistaHTML(avance, { minutos, pasos }) {
  const hecho = avance >= 1, parado = avance <= 0;
  const faltaMin = Math.max(0, 30 - minutos), faltaPasos = Math.max(0, 8000 - pasos);
  const texto = hecho ? '¡Misión cumplida! Hoy te moviste lo que había que moverse.'
    : parado ? '¡Dale, movete! 30 minutos u 8.000 pasos cumplen la misión.'
    : `Vas ${Math.round(avance * 100)} %: te faltan ${faltaMin} min${pasos ? ` o ${num(faltaPasos)} pasos` : ''}.`;
  return `<div class="pista pista--${hecho ? 'meta' : parado ? 'parada' : 'corre'}" style="--p:${Math.min(1, avance).toFixed(3)}" aria-hidden="true">
    <span class="pista__nube"></span><span class="pista__nube pista__nube--2"></span>
    <span class="pista__suelo"><i></i></span>
    <span class="pista__llegada">🏁</span>
    <span class="pista__corredor"><i>${hecho ? '🏆' : parado ? '🧍' : '🏃'}</i></span>
    ${parado ? '<span class="pista__globo">¿Salimos?</span>' : ''}
  </div>
  <p class="hoy__agua pista__texto">${texto}</p>`;
}

/** El reloj del ayuno: un aro con las etapas de colores y una marca que da la vuelta. */
function ayunoHTML(etapa, horas, meta, enCurso) {
  const COLORES = ['#FFC93C', '#4FA8F5', '#FF7A1A'];
  const { fases, actual } = etapa;
  const stops = fases.map((f, i) => `${COLORES[i]} ${((f.desde / meta) * 360).toFixed(1)}deg ${(((fases[i + 1]?.desde ?? meta) / meta) * 360).toFixed(1)}deg`).join(', ');
  const p = enCurso ? Math.min(1, horas / meta) : 0;
  const dur = h => (h >= 1 ? `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min` : `${Math.max(1, Math.round(h * 60))} min`);
  return `<div class="ayuno-vivo">
    <div class="dial${enCurso ? ' dial--activo' : ''}" style="--p:${p.toFixed(4)}">
      <div class="dial__aro" style="background:conic-gradient(${stops})"></div>
      <div class="dial__falta"></div>
      ${enCurso ? `<div class="dial__marca"><i>${etapa.fase.emoji}</i></div>` : ''}
      <div class="dial__centro"><b ${enCurso ? 'id="reloj-ayuno"' : ''}>${enCurso ? reloj(horas) : `${meta} h`}</b><small>${enCurso ? `de ${meta} h` : 'tu meta'}</small></div>
    </div>
    <div class="ayuno-vivo__lado">
      ${enCurso ? `<p class="ayuno-vivo__fase">${etapa.fase.emoji} ${esc(etapa.fase.nombre)}</p>
        <p class="hoy__agua">${esc(etapa.fase.texto)}</p>
        ${etapa.siguiente ? `<p class="ayuno-vivo__prox">Después: ${esc(etapa.siguiente.nombre)} en ${dur(etapa.siguiente.enH)}</p>` : ''}`
        : '<p class="hoy__agua">Así es un ayuno con tu meta. Arranca cuando terminás de comer.</p>'}
    </div>
  </div>
  <ol class="etapas">${fases.map((f, i) => `<li class="${enCurso && i < actual ? 'etapas--pasada' : ''}${enCurso && i === actual ? 'etapas--ahora' : ''}" style="--c:${COLORES[i]}">
    <span aria-hidden="true">${f.emoji}</span><b>${esc(f.nombre)}</b><small>desde ${f.desde} h</small></li>`).join('')}</ol>
  <p class="nota-chica">Orientativo: cada cuerpo es distinto.</p>`;
}
