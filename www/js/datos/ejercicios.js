// Biblioteca de ejercicios de Nathor Fit. Textos propios: indicaciones cortas y seguras.
// Fila: [id, nombre, emoji, grupo, equipo, tipo ('reps' | 'tiempo'), indicaciones, usaPeso]
// equipo: 'ninguno' (en casa) · 'mancuernas' · 'gimnasio' (máquinas, barra o poleas)

const E = [
  // --- En casa, sin equipo ---
  ['sentadilla', 'Sentadilla', '🦵', 'piernas', 'ninguno', 'reps', 'Pies al ancho de hombros. Bajá como si te sentaras en una silla, con el pecho arriba y las rodillas en la línea de los pies.'],
  ['sentadilla-silla', 'Sentadilla a la silla', '🪑', 'piernas', 'ninguno', 'reps', 'Igual que la sentadilla, pero tocá apenas el asiento de una silla y volvé a subir. Ideal para empezar.'],
  ['sentadilla-sumo', 'Sentadilla sumo', '🦵', 'piernas', 'ninguno', 'reps', 'Pies más abiertos que los hombros y puntas hacia afuera. Bajá recto, sin que las rodillas se vayan para adentro.'],
  ['zancada-atras', 'Zancada hacia atrás', '🦵', 'piernas', 'ninguno', 'reps', 'Llevá una pierna atrás y bajá hasta que ambas rodillas queden en ángulo recto. Alterná piernas.'],
  ['zancada-lateral', 'Zancada lateral', '🦵', 'piernas', 'ninguno', 'reps', 'Paso largo al costado, flexionando esa rodilla y con la otra pierna estirada. Volvé al centro y cambiá.'],
  ['puente', 'Puente de glúteos', '🍑', 'gluteos', 'ninguno', 'reps', 'Boca arriba con las rodillas flexionadas. Subí la cadera apretando los glúteos y bajá despacio.'],
  ['puente-una', 'Puente a una pierna', '🍑', 'gluteos', 'ninguno', 'reps', 'Como el puente, con una pierna estirada en el aire. Hacé todas las repeticiones y cambiá de lado.'],
  ['escalon', 'Subida al escalón', '🪜', 'piernas', 'ninguno', 'reps', 'Usá un escalón o un banco firme. Subí apoyando todo el pie y bajá controlando. Alterná piernas.'],
  ['pared', 'Sentadilla en la pared', '🧱', 'piernas', 'ninguno', 'tiempo', 'Espalda contra la pared y rodillas en ángulo recto, como sentado en una silla invisible. Mantené la posición.'],
  ['talones', 'Elevación de talones', '🦶', 'piernas', 'ninguno', 'reps', 'De pie, subí en puntas de pie y bajá despacio. Podés apoyarte en una pared.'],
  ['flexiones', 'Flexiones de brazos', '💪', 'pecho', 'ninguno', 'reps', 'Manos un poco más abiertas que los hombros y el cuerpo recto. Bajá el pecho cerca del piso y empujá.'],
  ['flexiones-rodillas', 'Flexiones con rodillas apoyadas', '💪', 'pecho', 'ninguno', 'reps', 'Como la flexión, con las rodillas en el piso. La espalda sigue recta, de la cabeza a las rodillas.'],
  ['flexiones-pared', 'Flexiones en la pared', '💪', 'pecho', 'ninguno', 'reps', 'De pie frente a una pared, manos apoyadas a la altura del pecho. Acercá el pecho y empujá. Para empezar.'],
  ['fondos-silla', 'Fondos en silla', '💪', 'brazos', 'ninguno', 'reps', 'Manos en el borde de una silla firme, detrás tuyo. Flexioná los codos hacia atrás y subí.'],
  ['plancha', 'Plancha', '🧘', 'core', 'ninguno', 'tiempo', 'Antebrazos en el piso y el cuerpo recto. Apretá abdomen y glúteos, sin dejar caer la cadera.'],
  ['plancha-lateral', 'Plancha lateral', '🧘', 'core', 'ninguno', 'tiempo', 'De costado, apoyado en un antebrazo, con la cadera arriba. Hacé la mitad del tiempo de cada lado.'],
  ['crunch', 'Abdominal corto', '🔥', 'core', 'ninguno', 'reps', 'Boca arriba, rodillas flexionadas. Despegá apenas los hombros del piso, sin tirar del cuello.'],
  ['bicho-muerto', 'Bicho muerto', '🪲', 'core', 'ninguno', 'reps', 'Boca arriba, brazos y piernas arriba. Bajá un brazo y la pierna contraria sin despegar la espalda baja.'],
  ['superman', 'Superman', '🦸', 'espalda', 'ninguno', 'reps', 'Boca abajo, levantá a la vez brazos y piernas unos centímetros. Sostené un segundo y bajá.'],
  ['perro-pajaro', 'Perro y pájaro', '🐕', 'core', 'ninguno', 'reps', 'En cuatro apoyos, estirá un brazo y la pierna contraria. Volvé y cambiá de lado.'],
  ['elevacion-piernas', 'Elevación de piernas', '🔥', 'core', 'ninguno', 'reps', 'Boca arriba con las manos bajo la cola. Subí las piernas estiradas y bajá sin tocar el piso.'],
  ['escaladores', 'Escaladores', '⛰️', 'cardio', 'ninguno', 'tiempo', 'En posición de flexión, llevá las rodillas al pecho alternando, a tu ritmo.'],
  ['saltos-tijera', 'Saltos de tijera', '⭐', 'cardio', 'ninguno', 'tiempo', 'Saltá abriendo piernas y brazos, y volvé a cerrar. Sin saltar: abrí un pie por vez.'],
  ['rodillas-arriba', 'Rodillas arriba', '🏃', 'cardio', 'ninguno', 'tiempo', 'Trotá en el lugar subiendo las rodillas. Podés hacerlo caminando si preferís bajo impacto.'],
  ['burpee', 'Burpee sin salto', '💥', 'cardio', 'ninguno', 'reps', 'Agachate, apoyá las manos, llevá los pies atrás de a uno, volvé y parate.'],
  ['caminar-lugar', 'Caminata en el lugar', '🚶', 'cardio', 'ninguno', 'tiempo', 'Caminá en el lugar moviendo los brazos. Buen ejercicio para entrar en calor.'],
  ['boxeo-sombra', 'Boxeo de sombra', '🥊', 'cardio', 'ninguno', 'tiempo', 'Tirá golpes al aire alternando brazos, con las rodillas apenas flexionadas.'],
  ['gato-vaca', 'Gato y vaca', '🐈', 'movilidad', 'ninguno', 'tiempo', 'En cuatro apoyos, redondeá la espalda y después arqueala suave, siguiendo la respiración.'],
  ['circulos-cadera', 'Círculos de cadera', '🌀', 'movilidad', 'ninguno', 'tiempo', 'De pie, manos en la cintura, hacé círculos amplios con la cadera hacia un lado y después al otro.'],
  ['rotacion-toracica', 'Rotación de tronco', '🔄', 'movilidad', 'ninguno', 'tiempo', 'De costado en el piso con las rodillas flexionadas, abrí el brazo de arriba hacia el otro lado.'],
  ['isquios', 'Estiramiento de isquios', '🧘', 'movilidad', 'ninguno', 'tiempo', 'Sentado con una pierna estirada, inclinate hacia adelante con la espalda recta. Cambiá de pierna a la mitad.'],
  ['estiramiento-cadera', 'Estiramiento de cadera', '🧘', 'movilidad', 'ninguno', 'tiempo', 'Rodilla atrás en el piso, la otra pierna adelante. Empujá suave la cadera hacia adelante. Cambiá a la mitad.'],

  // --- Con mancuernas ---
  ['goblet', 'Sentadilla con mancuerna', '🏋️', 'piernas', 'mancuernas', 'reps', 'Sostené una mancuerna frente al pecho y hacé una sentadilla con el pecho arriba.', true],
  ['rumano-manc', 'Peso muerto rumano con mancuernas', '🏋️', 'gluteos', 'mancuernas', 'reps', 'Rodillas apenas flexionadas. Llevá la cadera atrás bajando las mancuernas cerca de las piernas, espalda recta.', true],
  ['zancada-manc', 'Zancadas con mancuernas', '🏋️', 'piernas', 'mancuernas', 'reps', 'Una mancuerna en cada mano, paso atrás y bajá controlando. Alterná piernas.', true],
  ['bulgara', 'Sentadilla búlgara', '🏋️', 'piernas', 'mancuernas', 'reps', 'Pie de atrás apoyado en un banco o silla. Bajá con la pierna de adelante. Hacé todas y cambiá.', true],
  ['puente-manc', 'Puente con mancuerna', '🍑', 'gluteos', 'mancuernas', 'reps', 'Como el puente de glúteos, con una mancuerna apoyada sobre la cadera.', true],
  ['press-piso', 'Press de pecho en el piso', '🏋️', 'pecho', 'mancuernas', 'reps', 'Boca arriba, empujá las mancuernas hacia el techo y bajá hasta que los codos toquen el piso.', true],
  ['press-hombros', 'Press de hombros', '🏋️', 'hombros', 'mancuernas', 'reps', 'Sentado o de pie, empujá las mancuernas arriba de la cabeza sin arquear la espalda.', true],
  ['remo-una', 'Remo a una mano', '🏋️', 'espalda', 'mancuernas', 'reps', 'Una mano y una rodilla en un banco. Llevá la mancuerna hacia la cadera con el codo pegado.', true],
  ['curl', 'Curl de bíceps', '💪', 'brazos', 'mancuernas', 'reps', 'Codos pegados al cuerpo. Subí las mancuernas flexionando los codos y bajá despacio.', true],
  ['triceps-cabeza', 'Tríceps por encima de la cabeza', '💪', 'brazos', 'mancuernas', 'reps', 'Una mancuerna con las dos manos detrás de la cabeza. Estirá los brazos hacia arriba.', true],
  ['laterales', 'Elevaciones laterales', '🏋️', 'hombros', 'mancuernas', 'reps', 'Brazos al costado, subilos abiertos hasta la altura de los hombros, sin balancearte.', true],
  ['pajaro-manc', 'Vuelos posteriores', '🏋️', 'espalda', 'mancuernas', 'reps', 'Inclinado hacia adelante con la espalda recta, abrí los brazos hacia los costados.', true],
  ['giro-ruso', 'Giro de tronco con mancuerna', '🔥', 'core', 'mancuernas', 'reps', 'Sentado, un poco reclinado, llevá la mancuerna de un lado al otro girando el tronco.', true],
  ['granjero', 'Caminata con mancuernas', '🚶', 'core', 'mancuernas', 'tiempo', 'Caminá derecho con una mancuerna pesada en cada mano, hombros atrás.', true],

  // --- En el gimnasio ---
  ['prensa', 'Prensa de piernas', '🦵', 'piernas', 'gimnasio', 'reps', 'Pies al ancho de hombros en la plataforma. Bajá hasta 90° y empujá sin trabar las rodillas.', true],
  ['sentadilla-barra', 'Sentadilla con barra', '🏋️', 'piernas', 'gimnasio', 'reps', 'Barra sobre la espalda alta. Bajá controlando con el pecho arriba. Si es tu primera vez, pedí ayuda en el gimnasio.', true],
  ['rumano-barra', 'Peso muerto rumano con barra', '🏋️', 'gluteos', 'gimnasio', 'reps', 'Barra cerca de las piernas, cadera atrás y espalda recta. Subí apretando glúteos.', true],
  ['hip-thrust', 'Empuje de cadera con barra', '🍑', 'gluteos', 'gimnasio', 'reps', 'Espalda alta apoyada en un banco y la barra sobre la cadera (con protector). Subí la cadera.', true],
  ['extension-cuad', 'Extensión de cuádriceps', '🦵', 'piernas', 'gimnasio', 'reps', 'Sentado en la máquina, estirá las piernas y bajá despacio.', true],
  ['curl-femoral', 'Curl femoral', '🦵', 'piernas', 'gimnasio', 'reps', 'En la máquina, flexioná las rodillas llevando los talones hacia la cola.', true],
  ['press-banca', 'Press de banca', '🏋️', 'pecho', 'gimnasio', 'reps', 'Acostado en el banco, bajá la barra al pecho y empujá. Con alguien que te asista si es pesado.', true],
  ['press-inclinado', 'Press inclinado con mancuernas', '🏋️', 'pecho', 'gimnasio', 'reps', 'Banco inclinado. Empujá las mancuernas hacia arriba y bajá controlando.', true],
  ['jalon', 'Jalón al pecho', '🏋️', 'espalda', 'gimnasio', 'reps', 'En la polea alta, tirá de la barra hacia el pecho llevando los codos hacia abajo.', true],
  ['remo-polea', 'Remo sentado en polea', '🏋️', 'espalda', 'gimnasio', 'reps', 'Espalda recta, tirá del agarre hacia el abdomen juntando los omóplatos.', true],
  ['press-maquina', 'Press de hombros en máquina', '🏋️', 'hombros', 'gimnasio', 'reps', 'Sentado con la espalda apoyada, empujá hacia arriba sin trabar los codos.', true],
  ['curl-polea', 'Curl de bíceps en polea', '💪', 'brazos', 'gimnasio', 'reps', 'Codos fijos al costado, subí el agarre y bajá despacio.', true],
  ['triceps-polea', 'Tríceps en polea', '💪', 'brazos', 'gimnasio', 'reps', 'Codos pegados al cuerpo, empujá la cuerda o la barra hacia abajo.', true],
  ['cinta', 'Caminata en cinta inclinada', '🚶', 'cardio', 'gimnasio', 'tiempo', 'Caminá rápido con algo de inclinación, sin agarrarte de las barandas.'],
  ['bici-fija', 'Bici fija', '🚴', 'cardio', 'gimnasio', 'tiempo', 'Pedaleá a un ritmo en el que puedas hablar pero te cueste un poco.'],
  ['eliptico', 'Elíptico', '🏃', 'cardio', 'gimnasio', 'tiempo', 'Movimiento continuo, sin impacto. Ajustá la resistencia para que sea un esfuerzo moderado.'],
];

export const EJERCICIOS = E.map(([id, nombre, emoji, grupo, equipo, tipo, indicaciones, usaPeso = false]) =>
  ({ id, nombre, emoji, grupo, equipo, tipo, indicaciones, usaPeso }));

export const GRUPOS = {
  piernas: 'Piernas', gluteos: 'Glúteos', pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros',
  brazos: 'Brazos', core: 'Abdomen', cardio: 'Cardio', movilidad: 'Movilidad',
};
