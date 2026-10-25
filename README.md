# Reverend Insanity CYOA (reescritura)

Reescritura del CYOA interactivo con TypeScript estricto, motor de reglas puro
y, más adelante, Cloudflare Pages Functions + D1.

Estado: **todo construido; falta desplegar** (motor, D1, interfaz, API de builds, guardado/compartir, admin y créditos). Después: pulir la apariencia.

## Comandos

    npm install
    npm run typecheck      # tsc --noEmit
    npm test               # vitest
    npm run convert-data -- ../reverend_insanity_cyoa/js/data.js   # regenera content/content.json

## Estructura

    content/content.json            Contenido validado (130 opciones, 21 categorías)
    scripts/convert-legacy-data.ts  Conversión desde el data.js anterior
    src/shared/schema.ts            Esquemas Zod; los tipos salen de aquí
    src/shared/content.ts           loadContent: forma + integridad referencial
    src/shared/engine/              Motor de reglas (lo usarán frontend y servidor)
      evaluate.ts                   Puntos, incidencias y estado de cada opción
      actions.ts                    applyAction: acciones puras con validación
      normalize.ts                  Poda en cascada / saneo de builds importados
    migrations/0001_init.sql        Esquema de D1 (contenido, versiones publicadas, builds)
    seed/seed.sql                   Generado: llena el contenido y publica la versión vigente
    src/server/db/                  Interfaz mínima de D1, generador de seed, carga de contenido
    wrangler.toml                   Pages + binding de D1
    tests/                          74 pruebas (motor, esquema, seed, restricciones)

## Idea central

Los puntos nunca se guardan ni se modifican de forma incremental: se calculan
siempre con `evaluateBuild(content, selections)`. Guardar, recargar, importar o
validar en el servidor da el mismo resultado por construcción. Las reglas
viven en una sola función; `applyAction` y `normalizeSelections` la reutilizan.

## Reglas confirmadas con el texto del propio contenido

- Costo positivo otorga puntos; negativo los gasta.
- **Tier 5:** "Each additional Tier 5 perk after first costs +200 CP extra" ->
  recargo plano de 200 por perk adicional (la versión anterior cobraba 200, 400, 600...).
- **Small Dream:** Master gratis en todos los caminos, sin límites de
  Grandmaster/Great Grandmaster y precio de attainments a la mitad.
- **Giant Sun:** "all options in the 'Luck' category for free".
- Los efectos son datos (`effects` en cada opción), no ids fijos en el código.

## Supuestos a confirmar contra el CYOA original

1. Giant Sun regala TAMBIÉN las Luck con desventaja (Nemesis, Horizon) a costo 0,
   sin darte los puntos que normalmente dan. Es la lectura literal de "for free".
2. Con Small Dream, subir un camino de Master (incluido) a Grandmaster cuesta
   `floor((100 - 50) * 0.5) = 25`, y a Great Grandmaster `floor((200 - 50) * 0.5) = 75`.
3. El campo de texto de "padres inmortales" es opcional (`input.required: false`).
4. Pasarse del presupuesto es una advertencia, no un error: el build se puede guardar.
5. Los límites de Grandmaster (4) y Great Grandmaster (2) cuentan por nivel exacto.

Todos se cambian en `content.json` (o en el script de conversión) sin tocar el motor.

## Base de datos (D1)

### Primera vez

    npx wrangler login
    npx wrangler d1 create ri-cyoa

Copia el `database_id` que imprime el comando en `wrangler.toml`
(reemplaza `REEMPLAZAR_CON_EL_ID_DE_D1`). Después:

    npm run db:migrate:local     # crea las tablas en la base local
    npm run db:seed:local        # llena el contenido y publica la versión vigente
    npm run db:migrate:remote    # lo mismo en Cloudflare
    npm run db:seed:remote

Si cambias `content/content.json`: sube `contentVersion`, corre
`npm run db:seed:generate` y vuelve a ejecutar el seed. Las versiones
publicadas son inmutables (`INSERT OR IGNORE`), y los builds guardados apuntan a
la versión con la que se crearon.

### Cómo está modelado

- **Contenido editable** en tablas normalizadas (`categories`, `options`,
  `option_requirements`, `option_conflicts`, `option_disables`, `clan_statuses`,
  `difficulty_modes`, `paths`, `grab_bag_items`, `attainment_levels`,
  `category_surcharges`). Las claves foráneas impiden reglas rotas; no se puede
  borrar una opción de la que otras dependen.
- **`content_versions`**: snapshots inmutables del contenido completo (JSON que
  consume el motor). Solo una versión puede ser la vigente. La API sirve el
  snapshot (una sola lectura de una fila) y no reensambla las tablas.
- **`builds`**: id de 8 caracteres alfanuméricos, versión de contenido, datos
  JSON (máx. 50 KB) y `edit_token_hash` (SHA-256 en hex; el token nunca se guarda).

### Límites de D1 que condicionan el diseño (plan gratis)

- 100 KB por sentencia: el seed lo comprueba (falla antes de llegar a Cloudflare).
- 100 parámetros por consulta y 2 MB por fila.
- 50 consultas por invocación del Worker: el contenido se carga con un solo `batch`.
- 100.000 escrituras y 5 millones de lecturas de filas por día.

### Cómo se prueban las migraciones

Las pruebas aplican `migrations/*.sql` sobre SQLite real en memoria (`node:sqlite`,
con claves foráneas activas como en D1), ejecutan el seed y comprueban que el
contenido reensamblado desde las tablas es idéntico al original. D1 es SQLite,
pero conviene un chequeo manual con `npm run db:migrate:local` y `npm run db:seed:local`.

## API de builds (Pages Functions)

Todo `/api/*` lo resuelve `functions/api/[[path]].ts`, un adaptador mínimo sobre
`handleApi` (`src/server/api/`), que es lógica pura y está probada sin el runtime de Workers.

| Método y ruta | Qué hace |
|---|---|
| `GET /api/content` | Contenido vigente (JSON), con `ETag` y caché pública de 5 min |
| `GET /api/content/:version` | Una versión concreta, inmutable |
| `POST /api/builds` | Crea un build. Cuerpo: `{ "selections": ... }`. Devuelve `201 { id, editToken, contentVersion }`; el token solo se muestra esta vez |
| `GET /api/builds/:id` | Lee un build (nunca expone el hash ni el token) |
| `PUT /api/builds/:id` | Edita un build con `Authorization: Bearer <editToken>` |

Errores: `{ "error": { "code", "message", "issues"? } }`. Códigos: 400 formato, 401 falta
token, 403 token incorrecto, 404 no existe, 405 método, 413 cuerpo > 64 KB, 422 el build
incumple las reglas (con la lista de `issues`), 503 sin contenido publicado.

Decisiones:
- El servidor valida con el mismo motor que la interfaz y guarda la versión canónica
  (sin texto libre de opciones que ya no están elegidas).
- Pasarse del presupuesto se acepta (es advertencia, no error).
- Editar valida contra la versión de contenido con la que se creó el build.
- Se guarda solo el SHA-256 del token y se compara en tiempo constante.

### Probar en local con D1

    npm run dev:full      # compila la web y levanta Pages + D1 local en http://localhost:8788

(Antes: `npm run db:migrate:local` y `npm run db:seed:local`.) Con `npm run dev` (Vite) en otra
terminal, `/api` se reenvía a ese puerto.

### Opcional: limitar peticiones

La API no limita peticiones por sí sola. En el plan gratis el peor caso de un abuso es agotar la
cuota diaria de escrituras de D1 (100.000), no un cobro. Si algún día hace falta: Turnstile (gratis)
en el botón de guardar, o un dominio propio en Cloudflare para usar reglas de límite de velocidad.
Con `*.pages.dev` no se pueden crear reglas por dominio, y el WAF a nivel de cuenta es de pago.

## Guardar y compartir (interfaz)

- **Guardar y compartir** crea el build y cambia la URL a `/b/<id>`.
- **Copiar enlace** da la URL pública (solo lectura). **Copiar enlace de edición** añade `#edit=<token>`;
  el fragmento no viaja al servidor, y al abrirlo la interfaz guarda el token en el navegador y lo quita de la barra.
- Quien abre un build sin token puede probar cambios, pero al guardar se crea una copia propia.
- Si un build usa una versión de contenido distinta a la incluida en la interfaz, se avisa y no se carga.

## Administrador (`/admin`)

Permite editar **nombre, descripción y costo de las opciones existentes** y publicar el resultado
como una versión nueva. No crea ni borra opciones, ni edita reglas o imágenes (eso queda para después).

- Editar escribe en las tablas (el borrador); los usuarios siguen viendo lo publicado.
- **Publicar** crea una versión `AAAA-MM-DD.N` y la marca como vigente en una sola transacción.
  Las versiones anteriores se conservan: los builds viejos se abren y se editan con su contenido original.
- La interfaz carga el contenido desde `/api/content` (con el incluido en la web como respaldo sin conexión).
  Al abrir `/b/:id` carga la versión con la que se creó ese build.

### Seguridad

`/api/admin/*` acepta **una de dos credenciales** y, si no hay ninguna configurada, responde 503 (cerrado):

1. **Clave de administrador** (`ADMIN_KEY`): `Authorization: Bearer <clave>`. Debe tener al menos 32
   caracteres; una más corta se ignora. Se compara por hash en tiempo constante.
2. **Cloudflare Access** (opcional, hay que activar Zero Trust): la API valida el JWT por su cuenta
   (firma RS256, emisor, audiencia, expiración y `nbf`) y no confía en que la ruta esté protegida.

Los cambios solo se aceptan del mismo origen y como `application/json`. Con la clave, el riesgo principal es
que se filtre: no hay verificación en dos pasos ni registro de quién entró (los intentos fallidos sí se
escriben en el log). Si la clave se filtra, genera otra y vuelve a guardar el secreto.

### Configurar la clave (sin tarjeta)

1. Genera una clave aleatoria de 43 caracteres:

       node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

2. **Local:** crea el archivo `.dev.vars` (ya está en `.gitignore`) con `ADMIN_KEY=<tu clave>` y corre
   `npm run dev:full`; el admin queda en `http://localhost:8788/admin`.
3. **Producción** (el proyecto de Pages debe existir; la clave se pide por consola):

       npx wrangler pages secret put ADMIN_KEY --project-name reverend-insanity-cyoa

4. Entra en `/admin` y escribe la clave. Se guarda en `sessionStorage` (se borra al cerrar la pestaña);
   el botón **Salir** la borra al momento. Guárdala en un gestor de contraseñas.

### Cloudflare Access (opcional)

Requiere activar Zero Trust (aunque el plan Free sea de $0, pide una tarjeta). Pasos:

1. Zero Trust > Access > Applications > **Add an application** > Self-hosted.
2. Destinos en `reverend-insanity-cyoa.pages.dev`: ruta `admin` y ruta `api/admin/*`.
3. Política **Allow** solo para tu correo.
4. Copia la **AUD Tag** y tu dominio de equipo (`<equipo>.cloudflareaccess.com`) y guárdalos:

       npx wrangler pages secret put ACCESS_TEAM_DOMAIN --project-name reverend-insanity-cyoa
       npx wrangler pages secret put ACCESS_AUD --project-name reverend-insanity-cyoa

Se pueden tener los dos modos a la vez.

## Desplegar en Cloudflare Pages

Se publica en un **proyecto nuevo** (`reverend-insanity-cyoa-v2`) con subida directa, sin tocar el sitio actual.
Un proyecto de Pages creado con Git no se puede pasar luego a subida directa, y esta vía no depende de cómo se creó el viejo.
Todos los comandos se corren en la carpeta del proyecto.

    npm run db:migrate:remote                 # tablas en el D1 remoto
    npm run db:seed:generate                  # (ya generado; repítelo si cambias content.json)
    npm run db:seed:remote                    # contenido y versión vigente en el D1 remoto
    npx wrangler pages project create reverend-insanity-cyoa-v2 --production-branch main
    npx wrangler pages secret put ADMIN_KEY --project-name reverend-insanity-cyoa-v2
    npm run deploy                            # compila y publica

El secreto se guarda **antes** del primer despliegue porque los cambios de variables se aplican a los despliegues nuevos.
Si cambias el secreto después, vuelve a correr `npm run deploy`.

Comprobación (cambia el dominio si Cloudflare asigna otro):

1. `https://reverend-insanity-cyoa-v2.pages.dev/api/content` responde el JSON del contenido.
2. En `/` elige opciones, pulsa **Guardar y compartir** y abre el enlace en una ventana privada.
3. En `/admin` entra con la clave, cambia un costo y publica; recarga `/` y comprueba el cambio.

Para usar el dominio del sitio anterior más adelante hay que borrar ese proyecto y recrear uno con el mismo nombre,
o pasar a despliegue por Git; ambas cosas se pueden hacer cuando el sitio nuevo esté probado.
