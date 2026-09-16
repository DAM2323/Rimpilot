# Guion de demo de RIMPILOT

Duración: 2 minutos. Todo se hace desde el navegador, sin llamar a ningún número.

## Antes de empezar

- Backend en `:3001`, panel en `:3000`, sesión iniciada con el Basic Auth del panel.
- El día tiene que estar en cero. Si quedaron movimientos de una prueba, bórralos antes.
- Prueba el micrófono una vez: el navegador pide permiso la primera vez y esa pausa mata el ritmo de la demo.

## La demo

1. Abre el panel. Todo en cero. Señala las cuatro tarjetas: **Ventas · Gastos · Sacaste para ti · Caja**.
2. Toca **Hablar con Wari** y di, en un solo tirón:

   > “Vendí tres pollos a veinticinco soles cada uno, me pagaron por Yape. Gasté quince en pasaje y me saqué veinte para el almuerzo.”

3. Wari registra los tres movimientos mientras hablas. La transcripción aparece debajo del botón y las tarjetas se actualizan solas.
4. Wari cierra leyendo: ventas S/ 75, gastos S/ 15, retiros S/ 20, **caja S/ 40**.

## El momento que importa

Vendiste S/ 75 pero en la caja hay S/ 40.

Esa resta es todo el producto. El vendedor informal sabe cuánto vendió y no sabe por qué le falta plata al final del día; la respuesta casi siempre es la que nadie anota: se sacó algo para él. RIMPILOT no se lo explica ni se lo aconseja — se lo muestra con sus propios números.

Si ya hay una semana cargada, Wari cierra con una línea más: «esta semana vendiste 270 y sacaste 83 para ti, 1 de cada 3 soles que vendiste». La misma frase está en el panel, debajo de la tarjeta de retiros. La calcula el código; Wari no opina sobre ella.

5. Abre cualquier movimiento: se ve el fragmento exacto que dijo la persona y que originó ese registro. Nada de lo que hay en el libro salió de una suposición.

## Si el jurado quiere probarlo

Dale el micrófono. Que diga cualquier cosa en español: “vendí dos panes a tres soles”, “gasté diez en bolsas”, “agarré cinco para el pasaje”. Los tres tipos funcionan con lenguaje natural, sin palabras clave.

## Subtítulos en inglés para el video

Lo hablado queda en español: es el producto. Estos son los subtítulos que van
encima, en el orden en que pasan las cosas.

| Momento | Subtítulo |
| --- | --- |
| Panel en cero | Sales · Expenses · What she took out · Cash |
| Toca el botón | One button. No menus. |
| Empieza a hablar | “I sold three chickens at twenty-five soles each, paid by Yape.” |
| Sigue | “I spent fifteen on the bus.” |
| El retiro | “And I took out twenty for my lunch.” |
| Aparecen las tarjetas | Three entries, filed while she is still talking |
| Wari cierra | Sales 75 · Expenses 15 · Withdrawals 20 · **Cash 40** |
| Sostener el plano | She sold 75. She has 40. Now she knows why. |
| Frase de la semana | “1 out of every 3 soles you sold.” Computed in code, not by the model. |
| Abre un movimiento | Every entry keeps the exact words that produced it. |

`S/ 75 ≈ US$ 20`: conviene ponerlo una sola vez, la primera vez que aparece un monto.

## Variante por teléfono

El canal telefónico sigue existiendo para el vendedor que en ese momento no tiene datos. Es la misma sesión y el mismo libro; solo cambia el códec. Si lo vas a mostrar, llama al número de Twilio y repite el paso 2.
