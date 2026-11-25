// Sonidos de 8 bits generados al vuelo (Web Audio, sin archivos) y la voz del teléfono.
// El audio solo puede arrancar después de un toque: por eso activar() va en el botón de empezar.

let ctx = null;

export function activar() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function nota(frec, inicio, dur, { tipo = 'square', vol = 0.08 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + inicio;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(frec, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SONIDOS = {
  moneda: () => { nota(988, 0, 0.07); nota(1319, 0.07, 0.22); },
  nivel: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => nota(f, i * 0.09, 0.14)),
  meta: () => [523, 523, 523, 698, 880, 1047].forEach((f, i) => nota(f, i * 0.12, i === 5 ? 0.5 : 0.1)),
  desafio: () => [880, 660, 880, 660].forEach((f, i) => nota(f, i * 0.1, 0.09, { tipo: 'sawtooth', vol: 0.05 })),
  logrado: () => [659, 784, 1319].forEach((f, i) => nota(f, i * 0.08, 0.16)),
  perdido: () => [392, 330, 262].forEach((f, i) => nota(f, i * 0.14, 0.18, { tipo: 'triangle', vol: 0.12 })),
  fantasma: () => [1047, 1319, 1568].forEach((f, i) => nota(f, i * 0.06, 0.1, { tipo: 'triangle', vol: 0.1 })),
  cuenta: () => nota(440, 0, 0.15),
  ya: () => nota(880, 0, 0.4),
  pausa: () => { nota(523, 0, 0.1); nota(392, 0.1, 0.16); },
};

export function sonar(nombre) {
  try { SONIDOS[nombre]?.(); } catch { /* sin audio: no pasa nada */ }
}

/** Dice un texto con la voz del teléfono, en español (de Argentina si está). */
export function decir(texto) {
  const s = globalThis.speechSynthesis;
  if (!s || !texto) return;
  try {
    const u = new SpeechSynthesisUtterance(texto);
    const voces = s.getVoices();
    u.voice = voces.find(v => v.lang === 'es-AR') ?? voces.find(v => v.lang?.startsWith('es-4')) ?? voces.find(v => v.lang?.startsWith('es')) ?? null;
    u.lang = u.voice?.lang ?? 'es-AR';
    u.rate = 1.05;
    s.speak(u);
  } catch { /* sin voz */ }
}

export function callar() { try { globalThis.speechSynthesis?.cancel(); } catch { /* nada */ } }
