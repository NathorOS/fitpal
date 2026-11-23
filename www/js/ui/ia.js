// Fase 6 — Anotar con IA: sacar una foto o describir la comida (escribiendo o hablando).
// El resultado no se guarda solo: pasa al carrito de "Agregar comida" para revisarlo y corregirlo.
// Parámetros: modo=foto|texto · fecha=YYYY-MM-DD
import { obtener } from '../db.js';
import { gatoSVG } from '../gato.js';
import { analizar, obtenerClave, prepararFoto } from '../ia.js';
import { sumar } from '../registro.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });

export async function montar(contenedor, params = new URLSearchParams()) {
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const modo = params.get('modo') === 'texto' ? 'texto' : 'foto';
  const fecha = params.get('fecha');
  const perfil = await obtener('perfil', 'main');
  const gato = perfil?.gato?.nombre || 'Tu gatito';
  const volver = fecha ? `#/hoy?fecha=${fecha}` : '#/hoy';
  const st = { foto: null, texto: '' };

  const cabecera = titulo => `<header class="reg__top">
    <a class="icono-btn" href="${volver}" aria-label="Cerrar">✕</a><h1 tabindex="-1">${titulo}</h1></header>`;

  if (!(await obtenerClave())) {
    c.innerHTML = `<section class="reg">${cabecera(modo === 'foto' ? 'Foto con IA' : 'Describir')}
      <div class="pregunta"><div>${gatoSVG('saluda', { titulo: gato })}</div>
        <p class="burbuja">Para usar la IA necesito tu clave de Gemini. Es gratis y se carga una sola vez.</p></div>
      <a class="btn" href="#/perfil">Cargar mi clave en Perfil</a>
      <a class="btn btn--secundario" href="#/registrar${fecha ? `?fecha=${fecha}` : ''}">Mientras tanto, buscar a mano</a>
    </section>`;
    return;
  }

  function pintarInicio(error = '') {
    const hayVoz = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    c.innerHTML = `<section class="reg">
      ${cabecera(modo === 'foto' ? 'Foto con IA' : 'Describir tu comida')}
      ${modo === 'foto' ? `
        ${st.foto ? `<img class="ia__foto" src="${st.foto.url}" alt="La foto que elegiste">` : `
          <div class="pregunta"><div>${gatoSVG('feliz', { titulo: gato })}</div>
            <p class="burbuja">Sacale una foto a tu plato y te digo qué tiene.</p></div>`}
        <div class="campos-2">
          <label class="btn ${st.foto ? 'btn--secundario' : ''}">📷 ${st.foto ? 'Otra foto' : 'Sacar foto'}
            <input type="file" accept="image/*" capture="environment" data-foto hidden></label>
          <label class="btn btn--secundario">🖼️ Galería<input type="file" accept="image/*" data-foto hidden></label>
        </div>
        <label class="campo">¿Algo que la foto no muestra? <span class="suave">(opcional)</span>
          <input id="aclaracion" class="campo-texto" maxlength="120" placeholder="Ej.: frito, con 2 cucharadas de aceite" value="${esc(st.texto)}"></label>`
      : `
        <div class="pregunta"><div>${gatoSVG('feliz', { titulo: gato })}</div>
          <p class="burbuja">Contame qué comiste, como se lo dirías a alguien.</p></div>
        <label class="campo">Qué comiste
          <textarea id="aclaracion" class="campo-texto campo-texto--area" maxlength="300" placeholder="Ej.: 2 empanadas de carne, una de humita y una coca chica">${esc(st.texto)}</textarea></label>
        ${hayVoz ? '<button class="btn btn--secundario" data-a="voz">🎤 Dictar</button>' : ''}`}
      <p class="error" role="alert">${esc(error)}</p>
      <button class="btn" data-a="analizar" ${modo === 'foto' && !st.foto ? 'disabled' : ''}>✨ Analizar</button>
      <p class="hoja__nota">La IA estima. Primero busco cada cosa en la base de Nathor Fit, y antes de anotar vas a poder corregir todo.</p>
    </section>`;
    c.querySelector('h1').focus({ preventScroll: true });
  }

  function pintarAnalizando() {
    c.innerHTML = `<section class="reg ia__cargando" role="status">
      ${st.foto ? `<div class="ia__escaneo"><img src="${st.foto.url}" alt=""><span></span></div>` : ''}
      <div class="pregunta"><div>${gatoSVG('normal', { titulo: gato })}</div>
        <p class="burbuja">${modo === 'foto' ? 'Mirando tu comida…' : 'Leyendo lo que comiste…'}</p></div>
      <p class="ayuda" style="text-align:center">Revisando la base de alimentos…</p>
    </section>`;
  }

  function pintarResultado(res) {
    if (!res.esComida || !res.items.length) {
      return pintarInicio(modo === 'foto' ? 'No encontré comida en la foto. Probá con otra, más de cerca y con buena luz.'
        : 'No entendí qué comiste. Probá contarlo con cantidades, por ejemplo "un plato de fideos con tuco".');
    }
    const total = sumar(res.items);
    const dudosos = res.items.some(i => i.confianza === 'baja');
    c.innerHTML = `<section class="reg">
      ${cabecera('Esto encontré')}
      ${st.foto ? `<img class="ia__foto ia__foto--chica" src="${st.foto.url}" alt="Tu foto">` : ''}
      ${res.comentario ? `<div class="pregunta"><div>${gatoSVG('feliz', { titulo: gato })}</div><p class="burbuja">${esc(res.comentario)}</p></div>` : ''}
      <ul class="filas">${res.items.map(it => `<li class="fila"><span class="fila__principal" style="cursor:default">
        <span class="fila__emoji" aria-hidden="true">${it.emoji}</span>
        <span class="fila__texto"><b>${esc(it.nombre)}</b>
          <small>${num(it.g)} g · ${num(it.kcal)} kcal · ${it.fuente === 'base' ? '✓ de la base' : '✨ estimado'}${it.confianza === 'baja' ? ' · dudoso' : ''}</small></span></span></li>`).join('')}</ul>
      <p class="resumen-kcal">Total ≈ <b>${num(total.kcal)} kcal</b> · P ${num(total.prot)} · C ${num(total.carb)} · G ${num(total.grasa)} g</p>
      ${dudosos ? '<p class="ayuda">Hay cosas marcadas como dudosas: revisalas en el paso siguiente.</p>' : ''}
      <button class="btn" data-a="revisar">Revisar y anotar</button>
      <button class="btn btn--fantasma" data-a="otra">${modo === 'foto' ? 'Probar con otra foto' : 'Escribirlo de nuevo'}</button>
    </section>`;
    st.items = res.items;
    c.querySelector('h1').focus({ preventScroll: true });
  }

  c.addEventListener('change', async e => {
    if (!e.target.matches('[data-foto]') || !e.target.files?.[0]) return;
    try {
      st.texto = c.querySelector('#aclaracion')?.value ?? st.texto;
      st.foto = await prepararFoto(e.target.files[0]);
      pintarInicio();
    } catch {
      pintarInicio('No pude abrir esa imagen. Probá con otra.');
    }
  });

  c.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    if (b.dataset.a === 'analizar') {
      st.texto = c.querySelector('#aclaracion')?.value.trim() ?? '';
      if (modo === 'texto' && st.texto.length < 3) return pintarInicio('Contame qué comiste.');
      pintarAnalizando();
      try {
        pintarResultado(await analizar({ texto: st.texto, imagenBase64: st.foto?.base64, mime: 'image/jpeg' }));
      } catch (err) {
        console.error(err);
        pintarInicio(err.message);
      }
    }
    if (b.dataset.a === 'voz') dictar(b);
    if (b.dataset.a === 'otra') { st.foto = null; pintarInicio(); }
    if (b.dataset.a === 'revisar') {
      try { sessionStorage.setItem('nathorfit-carrito', JSON.stringify(st.items)); } catch { /* sin almacenamiento */ }
      const p = new URLSearchParams({ desde: 'ia' });
      if (fecha) p.set('fecha', fecha);
      location.hash = `#/registrar?${p}`;
    }
  });

  function dictar(boton) {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new R();
    rec.lang = 'es-AR'; rec.interimResults = false; rec.maxAlternatives = 1;
    boton.textContent = '🎤 Escuchando…'; boton.disabled = true;
    rec.onresult = ev => {
      const area = c.querySelector('#aclaracion');
      area.value = `${area.value ? `${area.value} ` : ''}${ev.results[0][0].transcript}`;
    };
    rec.onend = () => { boton.textContent = '🎤 Dictar'; boton.disabled = false; };
    rec.onerror = () => { c.querySelector('.error').textContent = 'No pude escucharte. Probá escribirlo.'; };
    rec.start();
  }

  pintarInicio();
}
