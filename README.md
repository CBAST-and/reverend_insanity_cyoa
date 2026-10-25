# Reverend Insanity CYOA

Una hoja de personaje interactiva para el mundo de *Reverend Insanity* (蛊真人). Eliges tu dificultad, gastas tus
puntos de creación en todo lo que define a tu personaje, desde el momento en que entras al mundo Gu hasta tus
herencias y desventajas, y compartes el resultado con un enlace.

**Pruébalo en https://reverend-insanity-cyoa.pages.dev**

## Cómo se usa

1. **Elige una dificultad.** Define cuántos puntos de creación (CP) tienes para empezar: 500, 1000, 2500 o 10000.
2. **Recorre las secciones** de la barra lateral y elige lo que quieras. Cada opción muestra su costo: un número negativo
   gasta puntos y uno positivo te los devuelve (es el caso de las desventajas). Un sello rojo marca lo que elegiste.
3. **Mira tus puntos.** El número grande de la barra lateral es lo que te queda, y cada sección muestra su subtotal.
   Si te pasas, el número se pone en rojo. Puedes pasarte mientras exploras, pero tu build quedará fuera de presupuesto.
4. **Revisa el resumen.** La pestaña Resumen lista todo lo elegido, con su costo y el total.

Si una opción aparece atenuada es porque no se puede elegir ahora. Al tocarla, el sitio te explica el motivo: falta un
requisito, es incompatible con otra opción que ya elegiste, o una elección anterior deshabilita esa sección.
Si quitas algo de lo que dependen otras opciones, esas también se quitan y el sitio te avisa.

## Guardar y compartir

- Pulsa **Guardar y compartir** y tu build recibe una dirección corta (`/b/xxxxxxxx`).
- **Copiar enlace** da una dirección que cualquiera puede abrir para ver tu build. No permite modificarlo.
- **Copiar enlace de edición** da una dirección con una clave secreta incluida. Quien la tenga puede editar el build,
  así que guárdala como una contraseña. Si la pierdes, el build sigue existiendo pero ya no podrás modificarlo desde
  otro navegador; siempre puedes abrirlo y guardar una copia nueva.
- Tu build se abre siempre con las reglas y el contenido con los que lo creaste, aunque el contenido del sitio se
  actualice después.
- Mientras no guardes, el borrador queda en tu navegador y se conserva si recargas la página.

### Privacidad

No hay cuentas ni registro. Lo que se guarda en el servidor es tu build y, solo si lo escribes, el texto libre de la
opción de padres inmortales. Cualquiera con el enlace público puede leerlo, así que no escribas datos personales ahí.
Tu navegador guarda en su almacenamiento local tu borrador y las claves de edición de los builds que creaste.

## Reglas que conviene conocer

- **Dependencias:** algunas opciones exigen otras (por ejemplo, las bases del alma van encadenadas).
- **Incompatibilidades:** algunas opciones no se pueden combinar.
- **Opciones repetibles:** las que lo permiten tienen un contador, con un máximo.
- **Tier 5:** cada perk de Tier 5 después del primero cuesta 200 CP adicionales.
- **Attainments:** cada camino tiene su propio nivel (Master, Grandmaster, Great Grandmaster), con límites por nivel, y el
  precio de cada uno es acumulado. Ciertas herencias cambian estos límites y precios.
- **Líneas de tiempo:** elegir una línea de tiempo alternativa deshabilita las secciones de nacimiento.

Cada opción explica sus reglas en su propia descripción, que es la referencia final.

## Ayuda y comentarios

Si encuentras un error, una regla que no coincide con el CYOA original o algo que se ve mal, abre un *issue* en este
repositorio. Cuanto más concreto sea, mejor: qué opciones elegiste, qué esperabas y qué pasó.

## Para desarrolladores

El proyecto está hecho con TypeScript, React y Cloudflare Pages con D1. La guía técnica (arquitectura, base de datos,
API, administrador y despliegue) está en [`docs/DESARROLLO.md`](docs/DESARROLLO.md). Para empezar:

    npm install
    npm test
    npm run dev:full

## Licencia y créditos

El contenido del CYOA se distribuye bajo
[Creative Commons Atribución-CompartirIgual 4.0 (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/).
Quien lo adapte debe conservar estos créditos y compartir su obra con la misma licencia.

- CYOA original: **alphanumericsprawl**, con contribuciones de **GashGrunt** y **smie27**.
- Premium Gu: **unlanned** y **WHOiAM981213**.
- Versión interactiva original: **WiseBein**.
- Basado en la novela *Reverend Insanity* (蛊真人), de **Gu Zhen Ren**.

Los detalles están en [`LICENSE.md`](LICENSE.md). El código propio del repositorio todavía no declara una licencia.

Este es un proyecto de fans, sin relación con los autores ni con los editores de la novela.
