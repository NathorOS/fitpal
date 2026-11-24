# Lo que dice el personaje

El personaje habla en una burbuja (`burbuja-dialogo`) al abrir Hoy y al anotar algo. Las frases tienen que
**pinchar**: que te den ganas de levantarte y hacer la tarea. Hablan en rioplatense, de vos, como un amigo que
te conoce y no te deja pasar una.

## Reglas (no se negocian)

1. **Se chicanea la fiaca y las excusas, nunca el cuerpo.** Nada de "gordo", "panza", "estás enorme" ni nada
   sobre cómo se ve la persona. La gracia es que el personaje sufre las consecuencias, no que te insulte.
2. **Nunca empujar a comer menos de la cuenta.** Prohibido "hoy no comas", "salteate la cena" o "compensá
   mañana comiendo poco". Si el día quedó por debajo del piso de calorías (1200/1500), no hay chiste: va el
   aviso serio que ya existe.
3. **Sin género:** nada de "papá", "campeón", "flaca". Se habla de vos y con el nombre (`{n}`).
4. **Cortas:** 70 caracteres como máximo, para que entren en la burbuja.
5. **Sin famosos, marcas ni clubes** con nombre (el repo es público).
6. **No repetir** la misma frase en el mismo día: elegir al azar entre las que no salieron.
7. Personalidad **Cariñoso** o **Tranqui**: en las situaciones marcadas con ✋ se usa la versión suave.
   **Directo** y **Divertido** usan siempre la picante. Para quien no eligió, la picante.

Variables: `{n}` nombre, `{hora}` hora actual, `{kg}` kilos, `{dias}` días, `{vasos}` vasos de agua.

## Frases por situación

### Día vacío, a la mañana (pose `contento`)
- ¿Y, {n}? El día no se anota solo.
- Arrancamos. ¿Qué desayunaste? Y no me mientas.
- Registro vacío. Como la heladera un domingo a la noche.
- Buen día. Primer paso: anotar. Segundo paso: no aflojar.

### Sin anotar nada después de las 14 (pose `fiaca`)
- Son las {hora} y no anotaste nada. ¿Te tomaste el día?
- Mirame cómo estoy tirado. Esto es culpa tuya, eh.
- Dos toques te lleva anotar. Dos. Dale.
- Si no anotás, después no vengas a llorarle a la balanza.
- Me estoy fosilizando en este sillón. Movete vos, que yo no puedo.

### Vas bien (pose `contento`)
- Mirá vos, hoy estás hecho un relojito. No aflojes.
- Así sí. Que no te agarre el bajón de la tarde.
- Vas bárbaro. Ojo con la picadita de la noche.
- Esto es otra cosa. Seguí así y no te reconozco.

### Cerca del límite de calorías
- Te queda poquito. No me arruines todo con un alfajor ahora.
- Estás al límite. Lo que falta, liviano.
- Frená un poco, que venís a mil.

### Te pasaste (pose `empachado`) ✋
- Hoy te comiste hasta el mantel. Mañana seguimos normal.
- Estoy por explotar. Un día no arruina nada; una semana sí.
- Te pasaste. Ni culpa ni drama: mañana, a lo de siempre.
- *Suave:* Hoy se fue un poco la mano. No pasa nada, mañana seguimos.

### Entrenando o con actividad anotada (pose `entrenando`)
- ¡Eso! Transpirando la camiseta como corresponde.
- Mirá cómo sudo. Esto es amor propio.
- Ahora sí parecemos deportistas. Dale que va.

### Poca agua (después de las 16 y menos de la mitad de la meta)
- Tomaste menos agua que un cactus. Andá a llenar el vaso.
- Llevás {vasos} vasos. Hasta las plantas toman más.
- Agua, {n}. Gratis, sin calorías y la tenés a dos metros.

### Racha (3, 7, 14, 30 días; pose `festejando`)
- {dias} días seguidos. Ya no sos el mismo de antes.
- {dias} días al hilo. Esto ya es costumbre, no suerte.
- Racha de {dias}. No se te ocurra cortarla ahora.

### Se cortó la racha ✋
- Se cortó la racha. Duele, ¿no? Bueno, hoy arranca otra.
- Ayer te borraste. Hoy no hay excusa.
- *Suave:* Se cortó la racha, pero lo hecho no se pierde. Arrancamos otra.

### Volvió después de 3 o más días sin entrar
- ¡Apareciste! Pensé que te habías mudado a la parrilla.
- {dias} días sin noticias. Ni un mensaje. Bueno, dale, empecemos.
- Mirá cómo quedó el cuarto sin vos. Hay que poner orden.

### Pesaje: bajó
- Bajaste {kg} kg. ¿Viste que no era verso?
- {kg} kg menos. Esto se nota, eh. Seguí.

### Pesaje: subió ✋
- Subió un poco. Es agua, sal y vida. Seguimos igual.
- La balanza tuvo un mal día. Vos no. Seguimos.
- *Suave:* Un número alto no cambia la tendencia. Tranqui.

### Cuarto sucio (limpieza < 34)
- Mirá este cuarto. Mirá las moscas. ¿Te parece?
- Esto está hecho un chiquero. Una semana bien y queda impecable.
- Hasta las moscas se quieren ir de acá.

### Cuarto limpio (limpieza ≥ 67)
- Mirá cómo brilla esto. Así da gusto vivir.
- Cuarto limpio, cabeza limpia. Bien ahí.

### De noche sin cerrar el día (después de las 21)
- Antes de dormir, cerrá el día. No me dejes con la intriga.
- ¿Cenaste? Anotalo y a la cama.

### Llegó a la meta (pose `festejando`)
- Llegaste, {n}. Ahora viene lo difícil: quedarte acá.
- Meta cumplida. Esto no lo hizo la suerte, lo hiciste vos.

### Insignia o premio nuevo (pose `festejando` o `con-un-trofeo`)
- ¡Premio nuevo para el cuarto! Esto se gana, no se regala.
- Otra insignia. Ya no entran en la repisa.

## Cómo elegir cuál decir

Al abrir Hoy, gana la primera situación que se cumpla en este orden: llegó a la meta → volvió después de días
→ racha nueva → te pasaste → sin anotar después de las 14 → de noche sin cerrar → poca agua → cerca del límite
→ cuarto sucio o limpio → vas bien / día vacío.

Al anotar algo, se usa la situación que cambió con esa acción (pesaje, agua, actividad, comida).
