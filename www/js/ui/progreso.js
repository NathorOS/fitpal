// Fase 3 — Progreso: estadísticas GRATIS desde el primer día. Parámetro: rango=7|30|90
import { todos, obtener } from '../db.js';
import { pesos as leerPesos, metaAgua } from '../actividad.js';
import {
  ultimosDias, sumarPorDia, promedioDiasConDato, racha, seriePeso, escala, limites,
} from '../estadisticas.js';
import { sumar } from '../registro.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });
const diaCorto = f => new Date(f + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
const diaSemana = f => new Date(f + 'T12:00').toLocaleDateString('es-AR', { weekday: 'narrow' });
const diaLargo = f => new Date(f + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });

const RANGOS = [[7, '7 días'], [30, '30 días'], [90, '3 meses']];

export async function montar(c, params = new URLSearchParams()) {
  const n = [7, 30, 90].includes(Number(params.get('rango'))) ? Number(params.get('rango')) : 7;
  const dias = ultimosDias(n);
  const desde = dias[0];

  const [perfil, comidas, agua, metas, pesos] = await Promise.all([
    obtener('perfil', 'main'), todos('registro'), todos('agua'), todos('metas'), leerPesos(),
  ]);
  const sesiones = (await todos('sesiones')).filter(s => s.tipo === 'actividad' || s.tipo === 'entrenamiento');
  const metaDe = f => [...metas].sort((a, b) => a.fecha.localeCompare(b.fecha)).filter(m => m.fecha <= f).at(-1) ?? metas[0];
  const metaHoy = metaDe(dias.at(-1));

  // Por día
  const kcalDia = sumarPorDia(comidas, 'kcal');
  const aguaDia = sumarPorDia(agua, 'ml');
  const actMin = sumarPorDia(sesiones, 'minutos');
  const actKcal = sumarPorDia(sesiones, 'kcal');
  const enRango = comidas.filter(x => x.fecha >= desde);
  // El promedio usa días terminados: hoy todavía puede sumar comidas (salvo que sea el único día con datos).
  const promCerrados = promedioDiasConDato(dias.slice(0, -1), kcalDia);
  const prom = promCerrados.dias ? promCerrados : promedioDiasConDato(dias, kcalDia);
  const diasAnotados = promedioDiasConDato(dias, kcalDia).dias;
  const kgActual = pesos.at(-1)?.kg ?? 70;
  const aguaObj = metaAgua(kgActual);
  const aguaProm = promedioDiasConDato(dias, aguaDia);
  const diasAgua = dias.filter(d => (aguaDia[d] ?? 0) >= aguaObj).length;
  const minTot = dias.reduce((a, d) => a + (actMin[d] ?? 0), 0);
  const kcalTot = dias.reduce((a, d) => a + (actKcal[d] ?? 0), 0);
  const diasActivos = dias.filter(d => actMin[d] > 0).length;
  const laRacha = racha(Object.keys(kcalDia));

  // Promedio de macros solo de los días anotados
  const porDiaMacros = {};
  for (const x of enRango) {
    const t = sumar([x]);
    const d = (porDiaMacros[x.fecha] ??= { prot: 0, carb: 0, grasa: 0 });
    d.prot += t.prot; d.carb += t.carb; d.grasa += t.grasa;
  }
  const diasM = Object.keys(porDiaMacros);
  const promMacro = k => (diasM.length ? diasM.reduce((a, d) => a + porDiaMacros[d][k], 0) / diasM.length : 0);

  const peso = seriePeso(pesos, desde);

  c.innerHTML = `
    <div class="pila prog">
      <header class="prog__top">
        <h1 tabindex="-1">Progreso</h1>
        <div class="seg" role="group" aria-label="Período">
          ${RANGOS.map(([v, t]) => `<a href="#/progreso?rango=${v}" role="button" aria-pressed="${v === n}">${t}</a>`).join('')}
        </div>
      </header>

      <div class="fichas">
        <div class="ficha"><span class="ficha__num">🔥 ${laRacha}</span><span class="ficha__txt">${laRacha === 1 ? 'día seguido' : 'días seguidos'} anotando</span></div>
        <div class="ficha"><span class="ficha__num">${diasAnotados}/${n}</span><span class="ficha__txt">días con comidas anotadas</span></div>
      </div>

      <section class="tarjeta" aria-labelledby="g-peso">
        <div class="metrica__fila">
          <div>
            <h2 class="metrica__titulo" id="g-peso">Peso</h2>
            <p class="prog__dato"><b>${num(kgActual, 1)} kg</b>${peso.cambio != null
              ? ` · ${peso.cambio <= 0 ? '−' : '+'}${num(Math.abs(peso.cambio), 1)} kg en el período` : ''}</p>
          </div>
          <a class="icono-btn" href="#/peso?volver=progreso" aria-label="Anotar peso">+</a>
        </div>
        ${peso.puntos.length >= 2 ? graficoPeso(peso.puntos, dias, perfil?.peso_meta) + `
          <p class="grafico__detalle" aria-live="polite">Tocá un punto para ver el detalle.</p>
          <p class="prog__nota">La tendencia suaviza las subidas y bajadas de cada día (agua, sal, hormonas). Mirá esa línea, no un número suelto.</p>`
        : `<p class="prog__vacio">${peso.puntos.length ? 'Ya tenés un registro.' : 'Todavía no hay registros en este período.'} Anotá tu peso unos días más para ver la tendencia.</p>`}
      </section>

      <section class="tarjeta" aria-labelledby="g-kcal">
        <h2 class="metrica__titulo" id="g-kcal">Calorías por día</h2>
        <p class="prog__dato">${prom.promedio != null ? `Promedio <b>${num(prom.promedio)} kcal</b> por día anotado${promCerrados.dias ? ' (sin contar hoy)' : ''}` : 'Todavía no hay comidas en este período.'}
          ${metaHoy ? ` · meta ${num(metaHoy.kcal_objetivo)}` : ''}</p>
        ${diasAnotados ? graficoKcal(dias, kcalDia, metaHoy?.kcal_objetivo, n) + '<p class="grafico__detalle" aria-live="polite">Tocá una barra para ver el detalle.</p>' : ''}
        ${diasAnotados && prom.promedio != null && metaHoy ? `<p class="prog__nota">${mensajeKcal(prom.promedio, metaHoy.kcal_objetivo)}</p>` : ''}
      </section>

      <section class="tarjeta" aria-labelledby="g-macros">
        <h2 class="metrica__titulo" id="g-macros">Macros (promedio por día)</h2>
        ${diasM.length && metaHoy ? `<div class="macros-h">
          ${barraMacro('Proteínas', promMacro('prot'), metaHoy.prot, '--macro-prot')}
          ${barraMacro('Carbos', promMacro('carb'), metaHoy.carb, '--macro-carb')}
          ${barraMacro('Grasas', promMacro('grasa'), metaHoy.grasa, '--macro-grasa')}
        </div>` : '<p class="prog__vacio">Cuando anotes comidas, acá ves cuánta proteína, carbos y grasas comés en promedio.</p>'}
      </section>

      <div class="fichas">
        <div class="ficha"><span class="ficha__num">💧 ${aguaProm.promedio != null ? num(aguaProm.promedio) : '–'}</span>
          <span class="ficha__txt">ml de agua por día · ${diasAgua} ${diasAgua === 1 ? 'día' : 'días'} en la meta</span></div>
        <div class="ficha"><span class="ficha__num">🏃 ${num(minTot)}</span>
          <span class="ficha__txt">minutos de actividad · ${num(kcalTot)} kcal · ${diasActivos} ${diasActivos === 1 ? 'día' : 'días'}</span></div>
      </div>

      <details class="tarjeta tabla-datos">
        <summary>Ver los datos como tabla</summary>
        <table>
          <thead><tr><th scope="col">Día</th><th scope="col">kcal</th><th scope="col">Peso</th><th scope="col">Agua</th><th scope="col">Activ.</th></tr></thead>
          <tbody>${[...dias].reverse().map(d => {
            const p = pesos.find(x => x.fecha === d);
            return `<tr><th scope="row">${esc(diaCorto(d))}</th><td>${kcalDia[d] ? num(kcalDia[d]) : '–'}</td>
              <td>${p ? num(p.kg, 1) : '–'}</td><td>${aguaDia[d] ? num(aguaDia[d]) : '–'}</td><td>${actMin[d] ? `${actMin[d]}′` : '–'}</td></tr>`;
          }).join('')}</tbody>
        </table>
      </details>
    </div>`;

  // Detalle al tocar o pasar por encima de un punto o una barra
  c.querySelectorAll('svg.grafico').forEach(svg => {
    const detalle = svg.closest('section').querySelector('.grafico__detalle');
    const mostrar = e => {
      const m = e.target.closest('[data-detalle]');
      if (!m) return;
      svg.querySelectorAll('.activo').forEach(x => x.classList.remove('activo'));
      m.classList.add('activo');
      detalle.textContent = m.dataset.detalle;
    };
    svg.addEventListener('click', mostrar);
    svg.addEventListener('pointerover', mostrar);
    svg.addEventListener('focusin', mostrar);
  });
}

function mensajeKcal(promedio, meta) {
  const d = promedio - meta;
  if (Math.abs(d) <= meta * 0.05) return 'Estás comiendo muy cerca de tu meta. ¡Así se hace!';
  if (d < 0) return `En promedio comés ${num(-d)} kcal menos que tu meta. Si te cuesta sostenerlo, está bien acercarte un poco más.`;
  return `En promedio comés ${num(d)} kcal más que tu meta. Pequeños cambios alcanzan: no hace falta compensar de golpe.`;
}

// --- Gráficos SVG (marcas finas, ejes discretos, sin colores en el texto) ---
const W = 320, H = 170, M = { t: 12, r: 12, b: 26, l: 36 };

function graficoPeso(puntos, dias, meta) {
  const idx = Object.fromEntries(dias.map((d, i) => [d, i]));
  const x = escala([0, dias.length - 1], [M.l, W - M.r]);
  // La meta entra en la escala solo si está cerca; si no, aplastaría la línea y se muestra como texto.
  const valores = puntos.flatMap(p => [p.kg, p.suavizado]);
  const cerca = meta && meta >= Math.min(...valores) - 2;
  const [y0, y1] = limites(cerca ? valores.concat(meta) : valores, 1, 0.3);
  const y = escala([y0, y1], [H - M.b, M.t]);
  const ticks = [y0, (y0 + y1) / 2, y1];
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(idx[p.fecha]).toFixed(1)},${y(p.suavizado).toFixed(1)}`).join('');
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Peso del período, con su tendencia">
    ${ticks.map(t => `<line class="grilla" x1="${M.l}" x2="${W - M.r}" y1="${y(t)}" y2="${y(t)}"/>
      <text class="eje" x="${M.l - 6}" y="${y(t) + 4}" text-anchor="end">${num(t, 1)}</text>`).join('')}
    ${meta && meta >= y0 && meta <= y1 ? `<line class="meta" x1="${M.l}" x2="${W - M.r}" y1="${y(meta)}" y2="${y(meta)}"/>
      <text class="eje" x="${W - M.r}" y="${y(meta) - 5}" text-anchor="end">Meta ${num(meta, 1)}</text>` : ''}
    <path class="tendencia" d="${linea}"/>
    ${puntos.map(p => `<circle class="punto" tabindex="0" cx="${x(idx[p.fecha])}" cy="${y(p.kg)}" r="4.5"
      data-detalle="${esc(diaLargo(p.fecha))}: ${num(p.kg, 1)} kg (tendencia ${num(p.suavizado, 1)})"/>`).join('')}
    <text class="eje" x="${M.l}" y="${H - 6}">${esc(diaCorto(dias[0]))}</text>
    <text class="eje" x="${W - M.r}" y="${H - 6}" text-anchor="end">${esc(diaCorto(dias.at(-1)))}</text>
  </svg>
  <ul class="leyenda" aria-label="Referencias">
    <li><i class="leyenda__punto"></i>Peso del día</li>
    <li><i class="leyenda__linea"></i>Tendencia</li>
    ${cerca ? '<li><i class="leyenda__meta"></i>Meta</li>' : meta ? `<li>Meta: ${num(meta, 1)} kg</li>` : ''}
  </ul>`;
}

function graficoKcal(dias, kcalDia, meta, n) {
  const max = Math.max(meta ?? 0, ...dias.map(d => kcalDia[d] ?? 0));
  const [, y1] = limites([0, max], 500);
  const y = escala([0, y1], [H - M.b, M.t]);
  const banda = (W - M.l - M.r) / dias.length;
  const ancho = Math.max(2, Math.min(24, banda - 2));
  const ticks = [0, y1 / 2, y1];
  const etiqueta = (d, i) => (n === 7 ? diaSemana(d)
    : (i === 0 || i === dias.length - 1 || i === Math.floor(dias.length / 2)) ? diaCorto(d) : '');
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Calorías de cada día del período">
    ${ticks.map(t => `<line class="grilla" x1="${M.l}" x2="${W - M.r}" y1="${y(t)}" y2="${y(t)}"/>
      <text class="eje" x="${M.l - 6}" y="${y(t) + 4}" text-anchor="end">${num(t)}</text>`).join('')}
    ${dias.map((d, i) => {
      const v = kcalDia[d] ?? 0;
      const cx = M.l + banda * i + banda / 2;
      const alto = Math.max(0, y(0) - y(v));
      const r = Math.min(4, ancho / 2, alto);
      const x0 = cx - ancho / 2, top = y(v);
      // Columna con la punta redondeada y la base recta
      const path = v ? `M${x0},${y(0)}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + ancho - r}Q${x0 + ancho},${top} ${x0 + ancho},${top + r}V${y(0)}Z` : '';
      const lbl = etiqueta(d, i);
      return `<g tabindex="0" data-detalle="${esc(diaLargo(d))}: ${v ? `${num(v)} kcal` : 'sin anotar'}">
        <rect class="golpe" x="${M.l + banda * i}" y="${M.t}" width="${banda}" height="${H - M.t - M.b}"/>
        ${path ? `<path class="barra" d="${path}"/>` : ''}
        ${lbl ? `<text class="eje" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(lbl)}</text>` : ''}
      </g>`;
    }).join('')}
    ${meta ? `<line class="meta" x1="${M.l}" x2="${W - M.r}" y1="${y(meta)}" y2="${y(meta)}"/>
      <text class="eje eje--fondo" x="${W - M.r}" y="${y(meta) - 5}" text-anchor="end">Meta ${num(meta)}</text>` : ''}
  </svg>`;
}

function barraMacro(nombre, prom, obj, color) {
  const pct = obj ? Math.min(100, (prom / obj) * 100) : 0;
  return `<div class="macro-h">
    <div class="macro-h__fila"><span>${nombre}</span><b>${num(prom)} / ${num(obj)} g</b></div>
    <div class="macro__pista"><i style="width:${pct}%;background:var(${color})"></i></div>
  </div>`;
}
