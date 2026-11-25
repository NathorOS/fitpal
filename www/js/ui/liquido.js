// Líquido de juego: un recipiente (tanque o botella) con capas de colores que se mueven con el teléfono.
// - Se inclina según cómo sostengas el teléfono (giroscopio) y hace olas si lo sacudís.
// - Con el dedo: arrastrar de costado lo inclina, tocar salpica.
// - Si el teléfono pide "reducir movimiento", se dibuja quieto con el nivel final.
// Es decorativo (el canvas va con aria-hidden): los números de verdad están escritos al lado.

const quieto = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const lim = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- Sensor compartido (uno solo para toda la app) ----------
const sensor = { gamma: 0, ax: 0, escuchando: false, recibe: false };
function escuchar() {
  if (sensor.escuchando || typeof window === 'undefined') return;
  sensor.escuchando = true;
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    sensor.recibe = true;
    // Con el teléfono acostado (horizontal) se usa el otro eje
    const apaisado = Math.abs(screen.orientation?.angle ?? 0) === 90;
    sensor.gamma = apaisado ? (e.beta ?? 0) * Math.sign(screen.orientation.angle) : e.gamma;
  });
  addEventListener('devicemotion', e => { sensor.ax = e.acceleration?.x ?? 0; });
}

/** iPhone pide permiso para leer el movimiento (y solo se puede pedir al tocar un botón). */
export function necesitaPermiso() {
  if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') return false;
  try { return sessionStorage.getItem('nathorfit-sensor') !== 'si'; } catch { return true; }
}
export async function pedirPermiso() {
  try {
    const r = await DeviceOrientationEvent.requestPermission();
    if (typeof DeviceMotionEvent?.requestPermission === 'function') await DeviceMotionEvent.requestPermission().catch(() => {});
    if (r === 'granted') { try { sessionStorage.setItem('nathorfit-sensor', 'si'); } catch { /* nada */ } }
    return r === 'granted';
  } catch { return false; }
}

/** Inclinación suavizada en grados (−30..30), para que otras piezas (el plato) se muevan igual. */
let suave = 0;
export function inclinacion() {
  escuchar();
  suave += (lim(sensor.gamma, -30, 30) - suave) * 0.12;
  return suave;
}

// ---------- Formas ----------
function formaTanque(W, H) {
  const m = 5, x0 = m, x1 = W - m, y0 = m + 2, y1 = H - m - 4, r = 26;
  return {
    x0: x0 + 3, x1: x1 - 3, fondo: y1 - 3, lleno: y0 + (y1 - y0) * 0.2, // la línea de META queda al 80 %
    camino(ctx) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 10);
      ctx.lineTo(x0, y1 - r); ctx.quadraticCurveTo(x0, y1, x0 + r, y1);
      ctx.lineTo(x1 - r, y1); ctx.quadraticCurveTo(x1, y1, x1, y1 - r);
      ctx.lineTo(x1, y0 + 10); ctx.quadraticCurveTo(x1, y0, x1 - 10, y0);
      ctx.lineTo(x0 + 10, y0); ctx.quadraticCurveTo(x0, y0, x0, y0 + 10);
      ctx.closePath();
    },
  };
}
function formaBotella(W, H) {
  const m = 5, cx = W / 2, cuerpo = (W - 2 * m) / 2, cuello = cuerpo * 0.42;
  const yTapa = m + 2, yCuello = H * 0.17, yHombro = H * 0.3, y1 = H - m - 4, r = 22;
  return {
    x0: cx - cuerpo + 3, x1: cx + cuerpo - 3, fondo: y1 - 3, lleno: yHombro + 4,
    tapa: { x: cx - cuello - 3, y: yTapa - 2, w: (cuello + 3) * 2, h: yCuello * 0.42 },
    camino(ctx) {
      ctx.beginPath();
      ctx.moveTo(cx - cuello, yTapa);
      ctx.lineTo(cx - cuello, yCuello);
      ctx.bezierCurveTo(cx - cuello, yHombro - 6, cx - cuerpo, yCuello + 8, cx - cuerpo, yHombro + 8);
      ctx.lineTo(cx - cuerpo, y1 - r); ctx.quadraticCurveTo(cx - cuerpo, y1, cx - cuerpo + r, y1);
      ctx.lineTo(cx + cuerpo - r, y1); ctx.quadraticCurveTo(cx + cuerpo, y1, cx + cuerpo, y1 - r);
      ctx.lineTo(cx + cuerpo, yHombro + 8);
      ctx.bezierCurveTo(cx + cuerpo, yCuello + 8, cx + cuello, yHombro - 6, cx + cuello, yCuello);
      ctx.lineTo(cx + cuello, yTapa);
      ctx.closePath();
    },
  };
}

/**
 * Pone a andar el líquido en un <canvas>.
 * opts: forma 'tanque'|'botella', capas [{color, valor}] de abajo hacia arriba,
 *       nivel (0..1, puede pasar de 1 en el tanque), desde (nivel con el que arranca), marcas (cantidad de rayitas),
 *       meta (true dibuja la línea META), gota (true: cae una gota al empezar).
 */
export function liquido(canvas, opts) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { salpicar() {} };
  escuchar();
  const css = getComputedStyle(document.documentElement);
  const LINEA = css.getPropertyValue('--linea').trim() || '#1E1B2E';
  const color = c => (c.startsWith('--') ? css.getPropertyValue(c).trim() || '#3B8FE0' : c);
  const total = opts.capas.reduce((a, c) => a + Math.max(0, c.valor), 0);
  const capas = total > 0 ? opts.capas.filter(c => c.valor > 0).map(c => ({ color: color(c.color), f: c.valor / total })) : [];
  const nivelFinal = lim(opts.nivel ?? 0, 0, opts.forma === 'tanque' ? 1.22 : 1);
  const calmo = quieto();

  let W = 0, H = 0, g = null;
  function medir() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return false;
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    g = (opts.forma === 'botella' ? formaBotella : formaTanque)(W, H);
    return true;
  }

  const N = 42;
  const ola = new Float32Array(N), vel = new Float32Array(N);
  let ang = 0, angV = 0, arrastre = 0, tocando = false;
  let nivel = calmo ? nivelFinal : lim(opts.desde ?? 0, 0, 1.22);
  const t0 = performance.now() + 250, dur = 1300, nivelIni = nivel;
  const burbujas = [], gotas = [];

  const xi = i => g.x0 + (i / (N - 1)) * (g.x1 - g.x0);
  function olaEn(x, t) {
    const p = lim((x - g.x0) / (g.x1 - g.x0), 0, 1) * (N - 1);
    const i = Math.floor(p), f = p - i;
    const base = ola[i] * (1 - f) + ola[Math.min(N - 1, i + 1)] * f;
    return calmo ? 0 : base + Math.sin(t * 0.0018 + x * 0.045) * 0.7 + Math.sin(t * 0.0011 - x * 0.03) * 0.5;
  }
  const alturaLlena = () => (g.fondo - g.lleno) / (opts.forma === 'tanque' ? 1 : 1);
  const ySup = (base, x, t, fac) => base + Math.tan(ang) * (x - (g.x0 + g.x1) / 2) + olaEn(x, t) * fac;

  function salpicar(x, fuerza = 7) {
    if (calmo || !g) return;
    const i = Math.round(lim((x - g.x0) / (g.x1 - g.x0), 0, 1) * (N - 1));
    for (let k = -2; k <= 2; k++) if (ola[i + k] !== undefined) vel[i + k] += fuerza * (1 - Math.abs(k) * 0.3);
    const y = g.fondo - alturaLlena() * nivel;
    for (let k = 0; k < 7; k++) gotas.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -2.2 - Math.random() * 2.6, r: 2 + Math.random() * 2.2, cae: false });
  }
  /** Una gota que cae desde arriba (al sumar agua o comida). */
  function gota(x = null) {
    if (calmo || !g) return;
    gotas.push({ x: x ?? (g.x0 + g.x1) / 2 + (Math.random() - 0.5) * 20, y: 0, vx: 0, vy: 1.5, r: 6, cae: true });
  }

  function paso(t) {
    // Nivel: sube (o baja) con un rebote al final
    if (!calmo) {
      const p = lim((t - t0) / dur, 0, 1);
      const e = p < 1 ? 1 - Math.pow(1 - p, 3) + Math.sin(p * Math.PI) * 0.04 : 1;
      nivel = nivelIni + (nivelFinal - nivelIni) * e;
    }
    // Inclinación con resorte: se pasa un poco y vuelve (eso es el "chapoteo")
    const objetivo = lim(-sensor.gamma * Math.PI / 180, -0.5, 0.5) + arrastre;
    angV += (objetivo - ang) * 0.025; angV *= 0.9; ang += angV;
    if (!tocando) arrastre *= 0.93;
    vel[0] += angV * 55 + sensor.ax * 0.25; vel[N - 1] -= angV * 55 + sensor.ax * 0.25;
    // Olas: cada punto es un resorte y empuja a sus vecinos
    for (let i = 0; i < N; i++) { vel[i] += -ola[i] * 0.03; vel[i] *= 0.982; ola[i] += vel[i]; }
    for (let pas = 0; pas < 2; pas++) for (let i = 0; i < N; i++) {
      if (i > 0) vel[i - 1] += (ola[i] - ola[i - 1]) * 0.08;
      if (i < N - 1) vel[i + 1] += (ola[i] - ola[i + 1]) * 0.08;
    }
    for (let i = 0; i < N; i++) ola[i] = lim(ola[i], -16, 16);
    // Burbujas
    if (nivel > 0.04 && burbujas.length < 6 && Math.random() < 0.025) {
      burbujas.push({ x: g.x0 + 8 + Math.random() * (g.x1 - g.x0 - 16), y: g.fondo - 4, r: 1.5 + Math.random() * 3, v: 0.35 + Math.random() * 0.7, f: Math.random() * 6 });
    }
    const base = g.fondo - alturaLlena() * nivel;
    for (let k = burbujas.length - 1; k >= 0; k--) {
      const b = burbujas[k];
      b.y -= b.v; b.x += Math.sin(t * 0.004 + b.f) * 0.3;
      if (b.y < ySup(base, b.x, t, 1) + b.r) burbujas.splice(k, 1);
    }
    // Gotas (salpicaduras y la que cae)
    for (let k = gotas.length - 1; k >= 0; k--) {
      const d = gotas[k];
      d.vy += 0.22; d.x += d.vx; d.y += d.vy;
      const sup = ySup(base, d.x, t, 1);
      if (d.vy > 0 && d.y > sup) {
        gotas.splice(k, 1);
        if (d.cae) { salpicar(d.x, 9); opts.alCaer?.(); }
      } else if (d.y > H + 20) gotas.splice(k, 1);
    }
  }

  function dibujar(t) {
    ctx.clearRect(0, 0, W, H);
    const cx = (g.x0 + g.x1) / 2;
    // Vidrio
    ctx.save();
    g.camino(ctx);
    ctx.fillStyle = '#F4FAFF';
    ctx.fill();
    ctx.clip();
    // Cuadriculado suave de fondo (que se note que es un recipiente)
    ctx.strokeStyle = 'rgba(30,27,46,.05)'; ctx.lineWidth = 1;
    for (let y = g.fondo; y > 0; y -= 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const base = g.fondo - alturaLlena() * nivel;
    if (nivel > 0.002 && capas.length) {
      let acum = 1;
      // De la capa de arriba hacia la de abajo: cada una tapa la parte de abajo de la anterior
      for (let k = capas.length - 1; k >= 0; k--) {
        const yk = g.fondo - alturaLlena() * nivel * acum;
        const fac = k === capas.length - 1 ? 1 : 0.35;
        ctx.beginPath();
        ctx.moveTo(-2, H + 2);
        for (let x = -2; x <= W + 2; x += 4) ctx.lineTo(x, ySup(yk, x, t, fac));
        ctx.lineTo(W + 2, H + 2);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, yk - 10, 0, g.fondo);
        grad.addColorStop(0, mezclar(capas[k].color, '#FFFFFF', 0.28));
        grad.addColorStop(1, capas[k].color);
        ctx.fillStyle = grad;
        ctx.fill();
        // Borde de historieta entre capas
        ctx.beginPath();
        for (let x = -2; x <= W + 2; x += 4) { const y = ySup(yk, x, t, fac); x === -2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.strokeStyle = 'rgba(30,27,46,.55)'; ctx.lineWidth = 2; ctx.stroke();
        acum -= capas[k].f;
      }
      // Brillo de la superficie
      ctx.beginPath();
      for (let x = g.x0 + 8; x <= g.x1 - 8; x += 4) { const y = ySup(base, x, t, 1) + 5; x === g.x0 + 8 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
      // Pasado de la meta: lo de arriba de la línea se tiñe
      if (opts.meta && nivel > 1) {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, W, g.lleno); ctx.clip();
        ctx.beginPath(); ctx.moveTo(-2, g.lleno);
        for (let x = -2; x <= W + 2; x += 4) ctx.lineTo(x, ySup(base, x, t, 1));
        ctx.lineTo(W + 2, g.lleno); ctx.closePath();
        ctx.fillStyle = 'rgba(255,122,26,.55)'; ctx.fill();
        ctx.restore();
      }
      // Burbujas
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(255,255,255,.25)';
      for (const b of burbujas) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    }
    // Rayitas de medida
    const marcas = opts.marcas ?? 4;
    ctx.strokeStyle = 'rgba(30,27,46,.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let k = 1; k < marcas; k++) {
      const y = g.fondo - alturaLlena() * (k / marcas);
      const largo = k % 2 === 0 || marcas <= 4 ? 14 : 8;
      ctx.beginPath(); ctx.moveTo(g.x1 - 4, y); ctx.lineTo(g.x1 - 4 - largo, y); ctx.stroke();
    }
    if (opts.meta) {
      ctx.setLineDash([7, 6]); ctx.strokeStyle = LINEA; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(g.x0, g.lleno); ctx.lineTo(g.x1, g.lleno); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = "600 11px Fredoka, ui-rounded, system-ui, sans-serif"; ctx.fillStyle = LINEA; ctx.textAlign = 'left';
      ctx.fillText('META', g.x0 + 6, g.lleno - 5);
    }
    // Reflejo del vidrio
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    redondeado(ctx, g.x0 + 6, g.lleno - (opts.forma === 'botella' ? 0 : 6), 7, (g.fondo - g.lleno) * 0.62, 4); ctx.fill();
    ctx.restore();

    // Gotas (pueden andar por arriba del recipiente)
    for (const d of gotas) {
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = capas.at(-1)?.color ?? opts.colorGota ?? '#5DB4FF'; ctx.fill();
      ctx.strokeStyle = LINEA; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // Borde
    g.camino(ctx);
    ctx.strokeStyle = LINEA; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    if (g.tapa) {
      redondeado(ctx, g.tapa.x, g.tapa.y, g.tapa.w, g.tapa.h, 5);
      ctx.fillStyle = opts.colorTapa ?? '#3B8FE0'; ctx.fill(); ctx.stroke();
    }
    void cx;
  }

  // Dedo: arrastrar de costado inclina; tocar salpica
  let xIni = null, movio = false;
  canvas.addEventListener('pointerdown', e => { xIni = e.clientX; movio = false; tocando = true; });
  canvas.addEventListener('pointermove', e => {
    if (xIni == null) return;
    const dx = e.clientX - xIni;
    if (Math.abs(dx) > 6) movio = true;
    arrastre = lim(-dx / (W || 1) * 0.9, -0.55, 0.55);
  });
  const soltar = e => {
    if (xIni == null) return;
    if (!movio) { const r = canvas.getBoundingClientRect(); salpicar(e.clientX - r.left); }
    xIni = null; tocando = false;
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', () => { xIni = null; tocando = false; });

  let visible = true, corriendo = false;
  function cuadro(t) {
    if (!canvas.isConnected) { corriendo = false; return; }
    if (!g && !medir()) { corriendo = false; return; }
    paso(t); dibujar(t);
    if (visible) requestAnimationFrame(cuadro); else corriendo = false;
  }
  function arrancar() { if (!corriendo && !calmo) { corriendo = true; requestAnimationFrame(cuadro); } }

  requestAnimationFrame(() => {
    if (!medir()) return;
    if (calmo) { dibujar(0); return; }
    if (opts.gota) setTimeout(() => gota(), 350);
    arrancar();
  });
  if (!calmo && typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (!canvas.isConnected) return io.disconnect();
      if (visible) arrancar();
    });
    io.observe(canvas);
  }
  addEventListener('resize', () => { if (canvas.isConnected && medir() && calmo) dibujar(0); });
  return { salpicar, gota };
}

function redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Mezcla dos colores #RRGGBB (p = cuánto del segundo). */
function mezclar(a, b, p) {
  const h = s => { const v = s.replace('#', ''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)); };
  try {
    const [x, y] = [h(a), h(b)];
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * p)).join(',')})`;
  } catch { return a; }
}
