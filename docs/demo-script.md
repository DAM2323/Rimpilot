# Guion de demo de RIMPILOT

Duración: menos de 3 minutos. Todo se hace desde el navegador, sin llamar a ningún número.

## Antes de empezar

- Levantá todo con `rimpilot.bat` (o `pnpm dev`). Si es la versión desplegada,
  abrila y hablá una vez cinco minutos antes: el plan gratuito de Render duerme
  el backend y despertarlo tarda cerca de un minuto.
- No hace falta borrar nada: la cuenta que vas a crear en la demo nace en cero.
- Probá el micrófono una vez antes de grabar: el navegador pide permiso la
  primera vez y esa pausa mata el ritmo del video.
- Hablá con frases completas y, si Wari te pregunta algo, contestale. Cuando
  termines, decile «eso es todo por hoy» para que lea el resumen.

## La demo

1. **La landing.** Unos segundos: el titular, la resta de 75 a 40 y la lista
   de con qué está hecho. No hace falta leerla, solo que se vea que hay un
   producto detrás.
2. **Crear el libro.** Tocá **Crear mi libro**, poné un correo, una contraseña
   y un nombre, y entrás directo al libro. Todo en cero. Señalá las cuatro
   tarjetas: **Ventas · Gastos · Sacaste para ti · Caja**.
   (Si preferís no mostrar el formulario, **Probar sin registrarme** entra en
   un clic con un libro vacío propio.)
3. Tocá **Hablar con Wari** y decí, en un solo tirón:

   > “Vendí tres pollos a veinticinco soles cada uno, me pagaron por Yape. Gasté quince en pasaje y me saqué veinte para el almuerzo.”

4. Mientras hablás aparece escrito lo que dijiste y, debajo, en violeta, lo que
   contesta Wari. Los movimientos entran al libro y las tarjetas se actualizan
   solas, sin recargar.
5. Decile «eso es todo por hoy». Wari cierra leyendo: ventas S/ 75, gastos S/ 15,
   retiros S/ 20, **caja S/ 40**.

## El momento que importa

Vendiste S/ 75 pero en la caja hay S/ 40.

Esa resta es todo el producto. El vendedor informal sabe cuánto vendió y no sabe por qué le falta plata al final del día; la respuesta casi siempre es la que nadie anota: se sacó algo para él. RIMPILOT no se lo explica ni se lo aconseja — se lo muestra con sus propios números.

Si ya hay una semana cargada, Wari cierra con una línea más: «esta semana vendiste 270 y sacaste 83 para ti, 1 de cada 3 soles que vendiste». La misma frase está en el panel, debajo de la tarjeta de retiros. La calcula el código; Wari no opina sobre ella.

6. Abrí cualquier movimiento: se ve la frase exacta que dijo la persona y que originó ese registro. Nada de lo que hay en el libro salió de una suposición.

## Si el jurado quiere probarlo

Dale el micrófono. Que diga cualquier cosa en español: “vendí dos panes a tres soles”, “gasté diez en bolsas”, “agarré cinco para el pasaje”. Los tres tipos funcionan con lenguaje natural, sin palabras clave.

## Subtítulos en inglés para el video

Lo hablado queda en español: es el producto. Estos son los subtítulos que van
encima, en el orden en que pasan las cosas.

| Momento | Subtítulo |
| --- | --- |
| La landing | Street vendors in Peru know what they sold. Not where the money went. |
| Crea la cuenta | Sign up, and the ledger is open. No setup. |
| Panel en cero | Sales · Expenses · What she took out · Cash |
| Toca el botón | One button. No menus. |
| Empieza a hablar | “I sold three chickens at twenty-five soles each, paid by Yape.” |
| Sigue | “I spent fifteen on the bus.” |
| El retiro | “And I took out twenty for my lunch.” |
| Aparece lo que dice Wari | Both sides of the conversation, on screen. |
| Aparecen las tarjetas | Three entries, filed while she is still talking |
| Wari cierra | Sales 75 · Expenses 15 · Withdrawals 20 · **Cash 40** |
| Sostener el plano | She sold 75. She has 40. Now she knows why. |
| Frase de la semana | “1 out of every 3 soles you sold.” Computed in code, not by the model. |
| Abre un movimiento | Every entry keeps the exact words that produced it. |

`S/ 75 ≈ US$ 20`: conviene ponerlo una sola vez, la primera vez que aparece un monto.

## Variante por teléfono

El canal telefónico sigue existiendo para el vendedor que en ese momento no tiene datos. Es el mismo agente y el mismo puente; solo cambia el códec. Quien llama tiene un libro propio, identificado por su número, que todavía no se une con una cuenta creada en la web. Si lo vas a mostrar, llamá al número de Twilio y repetí el paso 3.
