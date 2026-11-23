// Fase 6 — Escanear el código de barras de un producto (o escribirlo a mano).
// Usa la cámara con BarcodeDetector cuando el navegador lo tiene (Chrome en Android).
import { buscarCodigo } from '../codigo.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function montar(contenedor, params = new URLSearchParams()) {
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const fecha = params.get('fecha');
  const volver = fecha ? `#/hoy?fecha=${fecha}` : '#/hoy';
  const conDetector = 'BarcodeDetector' in window;
  let stream = null, buscando = false;

  c.innerHTML = `<section class="reg">
    <header class="reg__top"><a class="icono-btn" href="${volver}" aria-label="Cerrar">✕</a><h1 tabindex="-1">Código de barras</h1></header>
    ${conDetector ? `<div class="visor"><video playsinline muted aria-label="Cámara"></video><span class="visor__marco" aria-hidden="true"></span></div>
      <p class="ayuda" style="text-align:center">Apuntá al código del paquete.</p>`
      : '<p class="ayuda">Tu navegador no lee códigos con la cámara. Escribí los números que están debajo de las barras.</p>'}
    <label class="campo">Número del código
      <input id="num" class="campo-texto" inputmode="numeric" autocomplete="off" placeholder="Ej.: 7790000000000"></label>
    <p class="error" role="alert"></p>
    <p class="ayuda" id="estado" role="status"></p>
    <button class="btn" data-a="buscar">Buscar producto</button>
    <p class="hoja__nota">Los productos vienen de Open Food Facts, una base abierta y colaborativa. Revisá los valores con la etiqueta.</p>
  </section>`;
  c.querySelector('h1').focus({ preventScroll: true });

  const apagar = () => { stream?.getTracks().forEach(t => t.stop()); stream = null; };
  window.addEventListener('hashchange', apagar, { once: true });

  async function buscar(codigo) {
    if (buscando) return;
    buscando = true;
    c.querySelector('.error').textContent = '';
    c.querySelector('#estado').textContent = `Buscando ${codigo}…`;
    try {
      const id = await buscarCodigo(codigo);
      if (id) {
        apagar();
        const p = new URLSearchParams({ ver: id });
        if (fecha) p.set('fecha', fecha);
        location.hash = `#/registrar?${p}`;
        return;
      }
      c.querySelector('#estado').innerHTML = `No encontré el ${esc(codigo)}. Podés <a href="#/registrar?modo=nuevo">crearlo con los datos de la etiqueta</a>.`;
    } catch (err) {
      c.querySelector('.error').textContent = err.message;
      c.querySelector('#estado').textContent = '';
    }
    buscando = false;
  }

  c.querySelector('[data-a="buscar"]').onclick = () => buscar(c.querySelector('#num').value);
  c.querySelector('#num').onkeydown = e => { if (e.key === 'Enter') buscar(e.target.value); };

  if (conDetector) {
    try {
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      const video = c.querySelector('video');
      video.srcObject = stream;
      await video.play();
      const mirar = async () => {
        if (!c.isConnected || !stream) return apagar();
        try {
          const [cod] = await detector.detect(video);
          if (cod?.rawValue) { navigator.vibrate?.(80); c.querySelector('#num').value = cod.rawValue; await buscar(cod.rawValue); }
        } catch { /* cuadro sin código */ }
        if (stream) setTimeout(mirar, 300);
      };
      mirar();
    } catch {
      c.querySelector('.visor')?.remove();
      c.querySelector('#estado').textContent = 'No pude abrir la cámara (¿falta el permiso?). Podés escribir el código.';
    }
  }
}
