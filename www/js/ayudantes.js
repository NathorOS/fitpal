// Los ayudantes: del Giudice (el entrenador) y el Chef. Qué pose ponen y qué dicen en cada situación.
// Funciones puras. Reglas de las frases: las de docs/personaje/FRASES.md (crudas, en argentino, sin términos
// de género, máximo 70 caracteres, nunca "no comas" ni saltearse comidas).

export const AYUDANTES = {
  entrenador: { nombre: 'del Giudice', rol: 'Tu entrenador' },
  chef: { nombre: 'el Chef', rol: 'Tu cocinero' },
};

/** Poses dibujadas (www/img/ayudantes/<quien>-<pose>.webp, todas de 480 px de alto). */
export const POSES_AYUDANTES = {
  entrenador: ['saludando', 'silbato', 'reloj', 'decepcionado', 'aplaudiendo', 'festejando'],
  chef: ['saludando', 'plato', 'exquisito', 'exquisito-2', 'pensando', 'eso-no', 'explicando'],
};

/** situación → [pose(s), frases]. Si hay varias poses, se elige una al azar. */
export const SITUACIONES = {
  entrenador: {
    saludo: [['saludando'], [
      '¿Vamos a entrenar o venís a mirar?',
      'Arriba, que el sillón no te va a bajar la panza.',
      'Hoy se suda. No me traigas excusas.',
      'La fiaca no quema calorías. Dale, levantate.',
      'Elegí una rutina y no me hagas esperar.',
    ]],
    serie: [['silbato'], [
      '¡Dale que va! Una más, que vos podés.',
      '¡Esa serie no se hace sola, eh!',
      'Apretá los dientes y seguí.',
      '¡Sin trampa! Bien hecho o no cuenta.',
      'Si te tiembla, vas bien. ¡Seguí!',
    ]],
    descanso: [['reloj'], [
      'Respirá y tomá agua. No te me enfríes.',
      'Descansá, pero con el reloj en la mira.',
      'Este descanso no es para mirar el celu, eh.',
      'Aprovechá a respirar, que lo que viene es peor.',
    ]],
    fin: [['festejando'], [
      '¡Eso es! Hoy te ganaste mi respeto.',
      '¡Terminaste, carajo! Así se hace.',
      '¡Vamos todavía! Mañana, un poquito más.',
      'Mirá lo que sudaste. ¡Orgullo total!',
    ]],
    abandono: [['decepcionado'], [
      '¿Ya está? Bueno… mañana te quiero entero.',
      'Lo dejamos acá. Pero mañana no te salvás.',
      'Ni una serie. Me rompiste el corazón.',
    ]],
    entreno: [['aplaudiendo'], [
      'Hoy cumpliste. Ahora a descansar como se debe.',
      '¡Entrenaste! Así me gusta, eh.',
      'Hoy le metiste. Mañana repetimos.',
    ]],
    quieto: [['reloj', 'decepcionado'], [
      'Se termina el día y vos sin moverte. ¿Qué onda?',
      'Quince minutos te pido. Quince. Dale.',
      'El cuerpo no se mueve solo. Arrancá.',
    ]],
    pensando: [['silbato'], ['Bancame que te armo algo que te haga transpirar.']],
  },
  chef: {
    saludo: [['saludando'], [
      '¿Qué cocinamos hoy? Contame qué hay en la heladera.',
      'Comer rico y sano se puede. Yo te enseño.',
      'Anotá todo, que lo que no se anota igual engorda.',
      'Buscá lo que comiste y yo te digo qué tal.',
    ]],
    sano: [['exquisito', 'exquisito-2'], [
      '¡Exquisito! Eso es comer como la gente.',
      'Mirá ese plato. Te felicito, de verdad.',
      'Así sí: proteína, verdura y a otra cosa.',
      '¡Un manjar! Y encima sano. Qué nivel.',
    ]],
    pesado: [['eso-no'], [
      'Eso no, che. Para la próxima, algo a la plancha.',
      'Mucha grasa ahí. Mañana lo compensamos.',
      'Eso es un ataque al hígado. La próxima, ensalada.',
      'Rico, sí. Sano, ni en pedo. Que no se repita.',
    ]],
    pensando: [['pensando'], [
      'Dejame ver qué tiene esto…',
      'Mmm… estoy calculando. Bancame un toque.',
      'A ver, a ver… ¿qué me trajiste?',
    ]],
    receta: [['plato'], [
      'Mirá lo que te preparé. Entra justo en tu día.',
      'Con eso que tenés, hacemos maravillas.',
    ]],
    consejo: [['explicando'], [
      'Sumá proteína en cada comida: te llena más.',
      'La mitad del plato, verdura. Siempre.',
      'Tomá agua antes de comer. Parece una pavada y no lo es.',
      'Lo frito, al horno. Mismo gusto, menos grasa.',
      'Comé despacio: la panza tarda en avisar que está llena.',
      'Picar entre comidas suma más de lo que pensás.',
      'La gaseosa es azúcar con burbujas. Pasate al agua.',
    ]],
    vacio: [['explicando'], [
      '¿Todavía nada? Saltearte comidas no sirve, eh.',
      'Comé algo con proteína, que después te agarra el hambre.',
    ]],
    pasado: [['eso-no', 'pensando'], [
      'Hoy te pasaste. A la noche, verdura y proteína.',
      'Se te fue la mano. Lo que queda del día, liviano.',
    ]],
  },
};

const azarDe = azar => lista => lista[Math.floor(azar() * lista.length) % lista.length];

/** { pose, texto } para un ayudante en una situación. Situación desconocida → saludo. */
export function decir(quien, situacion, azar = Math.random) {
  const s = SITUACIONES[quien]?.[situacion] ?? SITUACIONES[quien]?.saludo;
  if (!s) return null;
  const elegir = azarDe(azar);
  return { pose: elegir(s[0]), texto: elegir(s[1]) };
}

/** Qué le dice el entrenador al abrir Hoy. */
export function situacionEntrenador({ minutosActividad = 0, hora = 12 }) {
  if (minutosActividad > 0) return 'entreno';
  if (hora >= 18) return 'quieto';
  return 'saludo';
}

/** Qué le dice el chef al abrir Hoy (no se burla si el día cerró por debajo del piso: eso lo avisa Hoy). */
export function situacionChef({ kcal = 0, kcalMeta = 0, comidasHoy = 0, hora = 12 }) {
  if (kcalMeta > 0 && kcal > kcalMeta) return 'pasado';
  if (!comidasHoy && hora >= 13) return 'vacio';
  if (!comidasHoy) return 'saludo';
  return 'consejo';
}
