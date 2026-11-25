// Sonidos cortos tipo arcade (hechos con el sintetizador del navegador: no hay archivos de audio)
// y una vibración chiquita en los teléfonos que la permiten (Android; el iPhone no deja desde una web).
// Se apagan desde Perfil → "Sonido y vibración".

const CLAVE = 'nathorfit-sonido';
let ctx = null;

export function sonidoActivo() {
  try { return localStorage.getItem(CLAVE) !== 'no'; } catch { return true; }
}
export function fijarSonido(si) {
  try { localStorage.setItem(CLAVE, si ? 'si' : 'no'); } catch { /* nada */ }
}

// El navegador solo deja sonar después de un toque: se prepara con el primero.
function preparar() {
  if (ctx || typeof AudioContext === 'undefined') return;
  try { ctx = new AudioContext(); } catch { ctx = null; }
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => { preparar(); ctx?.resume?.(); }, { capture: true });
}

function tono(frec, { desde = 0, dur = 0.12, tipo = 'square', vol = 0.06, hasta = null } = {}) {
  const t = ctx.currentTime + desde;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(frec, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

const SONIDOS = {
  // gota que cae al agua
  plop: () => { tono(900, { dur: 0.13, tipo: 'sine', vol: 0.12, hasta: 260 }); },
  // algo que cae al plato
  golpe: () => { tono(220, { dur: 0.09, tipo: 'triangle', vol: 0.12, hasta: 90 }); },
  // misión cumplida: moneda
  moneda: () => { tono(988, { dur: 0.08 }); tono(1319, { desde: 0.08, dur: 0.22 }); },
  // festejo grande
  festejo: () => { [523, 659, 784, 1047].forEach((f, i) => tono(f, { desde: i * 0.08, dur: 0.16, vol: 0.05 })); },
};
const VIBRA = { plop: 15, golpe: 20, moneda: [20, 40, 30], festejo: [30, 50, 30, 50, 60] };

/** Suena y vibra (si no lo apagaste en Perfil). */
export function sonar(nombre) {
  if (!sonidoActivo()) return;
  try {
    if (ctx && ctx.state === 'running') SONIDOS[nombre]?.();
  } catch { /* sin sonido */ }
  try { navigator.vibrate?.(VIBRA[nombre] ?? 15); } catch { /* sin vibración */ }
}
