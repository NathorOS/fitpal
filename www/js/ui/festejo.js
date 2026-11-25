import { sonar } from './sonido.js';
// Animaciones chicas que se usan en toda la app: confeti, números que cuentan y el salto al tocar.
// Si el teléfono pide "reducir movimiento", no se anima nada y se ve el resultado final.

const quieto = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORES = ['#22B07D', '#FFC93C', '#FF7A1A', '#3B8FE0', '#7B6CF6', '#FF4D8A'];

/** Una lluvia de papelitos que sale desde un elemento (o desde arriba al medio de la pantalla). */
export function confeti(desde = null, { cantidad = 22, alcance = 1, sonido = 'festejo' } = {}) {
  if (sonido) sonar(sonido);
  if (quieto()) return;
  const r = desde?.getBoundingClientRect?.();
  const x = r ? r.left + r.width / 2 : innerWidth / 2;
  const y = r ? r.top + r.height / 2 : innerHeight * 0.3;
  const capa = document.createElement('div');
  capa.className = 'confeti';
  capa.setAttribute('aria-hidden', 'true');
  capa.style.left = `${x}px`;
  capa.style.top = `${y}px`;
  for (let i = 0; i < cantidad; i++) {
    const ang = (i / cantidad) * Math.PI * 2 + Math.random() * 0.4;
    const dist = (70 + Math.random() * 80) * alcance;
    const s = document.createElement('i');
    s.style.cssText = `--dx:${Math.round(Math.cos(ang) * dist)}px;--dy:${Math.round(Math.sin(ang) * dist * 0.8 + 60 * alcance)}px;`
      + `--rot:${Math.round(Math.random() * 720 - 360)}deg;background:${COLORES[i % COLORES.length]};animation-delay:${(i % 5) * 25}ms`;
    capa.append(s);
  }
  document.body.append(capa);
  setTimeout(() => capa.remove(), 1500);
}

/** Los números con data-contar suben desde 0 hasta su valor (el texto final ya está escrito: si no hay JS, se ve igual). */
export function contar(raiz) {
  if (quieto()) return;
  raiz.querySelectorAll('[data-contar]').forEach(el => {
    const fin = Number(el.dataset.contar);
    if (!(fin > 0)) return;
    const final = el.textContent;
    const t0 = performance.now(), dur = 650;
    const paso = t => {
      if (!el.isConnected) return;
      const p = Math.max(0, Math.min(1, (t - t0) / dur));   // el primer cuadro puede venir con hora anterior a t0
      el.textContent = p < 1 ? Math.round(fin * (1 - (1 - p) ** 3)).toLocaleString('es-AR') : final;
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

/** Rebote corto en un elemento (al sumar un vaso, al tildar una misión). */
export function rebote(el) {
  if (!el || quieto()) return;
  el.classList.remove('rebota');
  void el.offsetWidth;   // reinicia la animación
  el.classList.add('rebota');
}
