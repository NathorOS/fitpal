# Lo que dice el personaje

El personaje habla en una burbuja (`burbuja-dialogo`) al abrir Hoy y al anotar algo. **Es crudo**: te
chicanea, se burla, te dice "eso no lo comas" y no te deja pasar una. Habla en rioplatense, de vos, como el
amigo del barrio que te bardea porque le importás.

## Reglas

1. **Bardear está permitido**: la fiaca, las excusas, lo que comiste, la cerveza, el sillón, y el propio
   cuerpo del personaje ("mirá cómo me dejaste"). Es tu personaje: si comés mal, él lo sufre y te lo echa en cara.
2. **Puede decirte qué no comer** cuando anotás algo pesado (§ "Cuando anotás algo pesado").
3. **Dos límites que se quedan**, porque la app ya los tiene como regla de salud:
   - Nunca "no comas nada", "salteate la comida" o "mañana no comas para compensar". Te dice *qué* no comer,
     nunca *que no comas*.
   - Si el día quedó por debajo del piso de calorías (1200/1500), **se apaga la chicana** y va el aviso serio.
4. **Sin género:** nada de "papá", "flaca", "campeón". Se habla de vos y con el nombre (`{n}`).
5. **Cortas:** 70 caracteres como máximo.
6. **Sin famosos, marcas ni clubes** con nombre (el repo es público).
7. **No repetir** la misma frase en el mismo día.
8. Personalidad: **Directo** y **Divertido** = crudo siempre (es el modo por defecto). **Cariñoso** y
   **Tranqui** = crudo también, salvo en las situaciones marcadas con ✋, donde usan la versión *suave*.

Variables: `{n}` nombre, `{hora}` hora actual, `{kg}` kilos, `{dias}` días, `{vasos}` vasos de agua,
`{comida}` lo que acaba de anotar.

## Frases por situación

### Día vacío, a la mañana (pose `contento`)
- ¿Y, {n}? ¿Vas a anotar o te pensás que esto se hace solo?
- Registro vacío. Como tu fuerza de voluntad un viernes a la noche.
- Arrancá, que el día no te va a esperar tirado en la cama.
- ¿Qué desayunaste? Y no me digas "un cafecito" que te conozco.

### Sin anotar nada después de las 14 (pose `fiaca`)
- Son las {hora} y no anotaste nada. ¿Te comió el sillón?
- Mirame cómo estoy tirado. Esto es culpa tuya, eh.
- Dos toques te lleva anotar. Dos. Ni para eso te da.
- No anotás porque no te conviene, ¿no? Te tengo calado.
- Estoy echando raíces en este sillón. Gracias por nada.
- ¿Seguís vivo? Porque el registro dice que no.

### Vas bien (pose `contento`)
- Mirá vos, hoy estás hecho un relojito. No te la creas.
- Bien. Ahora no lo arruines con la picadita de la noche.
- Hoy sí. Mañana igual o te vuelvo a bardear.
- Esto es otra cosa. Casi no te reconozco.

### Cerca del límite de calorías
- Te queda poquito. Si agarrás un alfajor, te mato.
- Estás al límite. Lo que falta, ensalada y agua. Punto.
- Frená, que venís como camión sin frenos.
- Cerrá la heladera. Ya está. Cerrala.

### Te pasaste (pose `empachado`) ✋
- Hoy te comiste hasta el mantel. Felicitaciones, ¿eh?
- Mirá cómo me dejaste. Parezco un lechón de Navidad.
- Estoy por explotar y todavía me mirás con hambre.
- Te pasaste. Mañana, a lo de siempre. Sin llorar.
- Me desabroché el pantalón por tu culpa.
- *Suave:* Hoy se fue un poco la mano. Mañana seguimos normal.

### Cuando anotás algo pesado (`{comida}` de dulces, comida rápida, alcohol o fritura)
- ¿{comida}? ¿En serio? Dejalo ahí y andá a tomar agua.
- No, no y no. Eso no se come un martes.
- Ese {comida} me va directo a la panza. Gracias, eh.
- ¿Otra vez? Soltá eso. Ya.
- La próxima, pensalo dos veces antes de abrir la boca.
- Fernet a la noche, panza a la mañana. Vos sabrás.
- Pizza otra vez. Ya tengo más muzzarella que sangre.
- Eso que comiste no es comida, es un castigo para mí.

### Entrenando o con actividad anotada (pose `entrenando`)
- ¡Eso! Transpirando la camiseta como corresponde.
- Mirá cómo sudo. Por fin hacés algo.
- Ahora sí parecemos deportistas. No aflojes que te veo.
- Así me gusta. Mañana más, no te hagas el cansado.

### No se movió en todo el día (después de las 19, sin actividad ni pasos)
- Hoy caminaste lo que hay de la cama a la heladera.
- Cero actividad. Ni para bajar la basura saliste.
- Diez minutos de caminata. Diez. No te vas a morir.

### Poca agua (después de las 16 y menos de la mitad de la meta)
- Tomaste menos agua que un cactus en el desierto.
- Llevás {vasos} vasos. Hasta las plantas del balcón toman más.
- Agua, {n}. Es gratis y la tenés a dos metros. Dale.
- Si es gaseosa no cuenta. No te hagas el vivo.

### Racha (3, 7, 14, 30 días; pose `festejando`)
- {dias} días seguidos. Mirá vos, tenías voluntad escondida.
- {dias} días al hilo. Ni yo me lo creía.
- Racha de {dias}. Cortala y no te hablo más.

### Se cortó la racha ✋
- Se cortó la racha. Aplausos para el sillón. Arrancá de nuevo.
- Ayer te borraste. Hoy no te salvás.
- Tanto esfuerzo para tirarlo así. Dale, de nuevo.
- *Suave:* Se cortó la racha, pero lo hecho no se pierde. Arrancamos otra.

### Volvió después de 3 o más días sin entrar
- ¡Apareciste! Pensé que te habías mudado a la parrilla.
- {dias} días sin noticias. Ni un mensajito. Qué falta de respeto.
- Mirá cómo quedó el cuarto sin vos. Un asco.
- Volviste. Seguro con dos kilos de regalo, ¿no?

### Pesaje: bajó
- Bajaste {kg} kg. ¿Viste que no era verso?
- {kg} kg menos. Ya me entra la camiseta.
- Bajó. No festejes con un asado, eh.

### Pesaje: subió ✋
- Subió. ¿Qué fue? ¿El asado o el postre? Las dos, seguro.
- La balanza no miente. Vos sí.
- Subiste. No me mires a mí, que yo como lo que vos comés.
- *Suave:* Un número alto no cambia la tendencia. Seguimos.

### Cuarto sucio (limpieza < 34)
- Mirá este cuarto. Mirá las moscas. Vivís como un chancho.
- Esto es un chiquero. Hasta las moscas se quieren mudar.
- Huele a fernet y a excusas acá adentro.
- Una semana bien y lo dejo impecable. Una. ¿Podés?

### Cuarto limpio (limpieza ≥ 67)
- Mirá cómo brilla esto. Quién te viera.
- Cuarto limpio, cabeza limpia. No lo ensucies.

### De noche sin cerrar el día (después de las 21)
- ¿Cenaste o estás picoteando a escondidas? Anotalo.
- Cerrá el día y andá a dormir. La heladera no te llama.

### Llegó a la meta (pose `festejando`)
- Llegaste, {n}. Ahora no la cagues.
- Meta cumplida. Esto no fue suerte, fue laburo.

### Insignia o premio nuevo (pose `festejando` o `con-un-trofeo`)
- ¡Premio nuevo para el cuarto! Esto se gana, no se regala.
- Otra insignia. Ya no entran en la repisa.

## Cómo elegir cuál decir

Al abrir Hoy, gana la primera situación que se cumpla en este orden: llegó a la meta → volvió después de días
→ racha nueva → te pasaste → sin anotar después de las 14 → no se movió → de noche sin cerrar → poca agua →
cerca del límite → cuarto sucio o limpio → vas bien / día vacío.

Al anotar algo, se usa la situación que cambió con esa acción. "Algo pesado" se detecta por la categoría del
alimento (`alim-dulces`, `alim-rapidas`, bebidas con alcohol) o por más de 600 kcal en un solo registro.
