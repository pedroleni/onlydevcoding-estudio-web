# Instrucciones de revisión de seguridad - web local del estudio

Fuente de verdad para los precedentes de seguridad de esta web Next.js local.

## Rol y filtro

Revisa las implicaciones de seguridad del diff o alcance indicado. Reporta
solo hallazgos con más del 80 % de confianza. Prioriza la exposición de datos
privados, XSS, llamadas a destinos no locales, secretos en el bundle y cambios
de CI que permitan ejecutar código no fijado.

No reportes DoS teórico, falta genérica de rate limiting o hardening sin una
ruta de explotación concreta.

## Decisiones aceptadas

- La web no tiene login por diseño. No reportes la ausencia de autenticación.
- La API válida es local: `http://127.0.0.1:8000`; `localhost:8000` puede
  usarse mediante configuración local explícita.
- `API_URL` es solo de servidor. `NEXT_PUBLIC_API_URL` es pública por diseño y
  nunca contiene credenciales.
- React escapa texto renderizado con JSX. Este es el patrón aprobado para los
  títulos, guiones y metadatos recibidos de la API.
- No existe Supabase, RLS ni despliegue en Vercel en este proyecto.
- Next escucha únicamente en `127.0.0.1:3000`. `src/proxy.ts` permite ese
  `Host`, redirige `localhost:3000` a la dirección canónica y rechaza el resto
  con 400 en las rutas de la aplicación para reducir la exposición local y
  mitigar DNS rebinding. Las rutas internas `/__nextjs_*` y `/_next/*` de
  `next dev` no pasan por el Proxy, incluida `__nextjs_launch-editor`;
  `npm run dev` es solo para desarrollar. El uso diario es `npm run estudio`
  (`next build && next start`), donde los endpoints `__nextjs` no existen.
- Web y API usan `127.0.0.1` para pertenecer al mismo sitio; la API rechaza
  los medios pedidos con `Sec-Fetch-Site: cross-site`. No se usa
  `Cross-Origin-Resource-Policy: same-site` (Chromium bloquea con ella los
  medios entre los puertos 3000 y 8000).
- Las escrituras de publicación pasan por Server Actions que validan sus
  argumentos. El salto del navegador a la Server Action está protegido por el
  Proxy: exige el `Host` exacto `127.0.0.1:3000` y, salvo para GET y HEAD, el
  `Origin` exacto `http://127.0.0.1:3000`; Next comprueba además `Origin` frente
  a `Host`. No se debe relajar esta cobertura del Proxy. Después,
  `src/lib/api-escritura.ts` es `server-only`, lee `ESTUDIO_TOKEN` y lo envía a
  la API local en `X-Estudio-Token`; ese token protege la llamada de la web a
  la API y no puede aparecer en código cliente ni en `NEXT_PUBLIC_*`.

## Precedentes de la fase 5 (acciones y trabajos)

Amplían las decisiones anteriores; lo que no se cite aquí sigue igual.

- **Acciones del estudio.** Las herramientas solo se lanzan con `lanzarAccion`
  y se cancelan con `cancelarTrabajo` (`src/lib/acciones-estudio.ts`). La
  acción va en la ruta solo si está en `IDS_ACCION`
  (`src/lib/catalogo-acciones.ts`), la única lista de la web: de ella salen el
  tipo `IdAccion`, la validación y las etiquetas. Las opciones se reconstruyen
  desde cero con regex cerradas (`previa` y `short`) y el id del trabajo es un
  entero seguro positivo. La API vuelve a comprobar que el objetivo existe en
  la lección. Una acción o una opción nueva tiene que entrar en los dos
  catálogos, el de la web y el de la API.
- **Origen de las Server Actions.** La comprobación de `Host` y `Origin`
  exactos vive en un único módulo `server-only`, `src/lib/origen-servidor.ts`
  (`origenPermitido()`), usado por `acciones.ts`, `acciones-tareas.ts`,
  `acciones-teleprompter.ts` y `acciones-estudio.ts` antes de cualquier
  escritura. Es la segunda barrera tras el Proxy. Una Server Action nueva la
  usa y añade un test de origen ajeno que comprueba que `escribir` no se
  llama. El Route Handler de `/grabar` mantiene su comprobación propia sobre
  `request.headers`.
- **`Trabajo.error`.** La API solo guarda mensajes fijos. Aun así, cualquier
  componente que lo pinte (`BotonAccion`, `TablaTrabajos`, `PanelPrevia`) pasa
  por `textoErrorTrabajo` (`src/lib/error-trabajo.ts`), que descarta textos
  con `/` o `\`. `Trabajo.registro` no sale de la API.
- **Lecturas opcionales.** Una lectura opcional de la página (teleprompter y
  acciones) usa `lecturaApiOpcional`: solo `ApiNoDisponible` y `ErrorApi` se
  convierten en `null`, y cualquier otro error se relanza. Con `null` se
  ocultan los controles que dependen de esa lectura. Nunca se enseña su error
  ni se habilita una acción por falta de datos.
- **Sondeo de trabajos.** `leerTrabajo` usa `NEXT_PUBLIC_API_URL`, sin token,
  solo con un id entero seguro y `cache: "no-store"`. Se consulta cada 2 s
  solo con la pestaña visible y un trabajo `en_marcha`. Un 404
  (`TrabajoInexistente`) detiene el sondeo de ese trabajo y lo dice («El
  trabajo ya no existe.»).
- **Edición del guion con trabajos en marcha.** Mientras corre `alinear-voz`,
  `preparar-montaje` o `preparar-shorts`, la pestaña Guion no deja editar ni
  guardar. La API también lo rechaza con 409, que la web enseña como un error
  normal (sin «Recargar»). Es coherencia de datos, no un control de acceso.

## Precedentes de la fase 6 (entrega de tomas de cámara)

Amplían las decisiones anteriores; lo que no se cite aquí sigue igual.

- **Rutas fuera del Proxy.** El `matcher` de `src/proxy.ts` excluye solo
  `/_next/`, `/grabar/` y `/entregar/` (con y sin barra final), porque el
  Proxy guarda el cuerpo en memoria hasta 10 MB y las tomas pasan de ahí. Bajo
  esos prefijos solo puede haber Route Handlers de subida, nunca páginas ni
  Server Actions, y `proxy.test.ts` fija qué rutas parecidas sí pasan por el
  Proxy. Un prefijo nuevo excluido necesita la misma justificación, su
  comentario y sus tests.
- **Route Handlers de subida** (`grabar/[curso]/[numero]/[escena]` y
  `entregar/[curso]/[numero]/[archivo]`). Cada uno, antes de leer parámetros
  o cuerpo, exige `Host` exacto `127.0.0.1:3000` y `Origin` exacto
  `http://127.0.0.1:3000`; después valida la ruta con regex cerradas, exige
  `Content-Length` de solo dígitos con tope de dígitos y de bytes (200 MiB para
  el WAV y 4 GiB para el vídeo), rechaza `Transfer-Encoding` y cualquier tipo
  fuera de su lista cerrada (`audio/wav`; `video/quicktime` o `video/mp4`).
  Solo exporta `PUT`. Reenvía el cuerpo en streaming con cabeceras construidas
  desde cero (tipo normalizado, `Content-Length` validado y el token leído de
  `process.env`), `redirect: "error"` y `cache: "no-store"`, y la respuesta
  solo copia el `Content-Type` de la API. Un fallo de red da un 502 con
  mensaje fijo. `Sec-Fetch-Site` no hace falta: un `PUT` siempre lleva
  `Origin` y el navegador no deja falsificarlo.
- **Nombres de las tomas entregadas.** `PATRON_ARCHIVO_ENTREGA`
  (`src/lib/entregas.ts`) es el mismo patrón que aplica la API con
  `fullmatch`: ASCII, sin barras, sin empezar por punto, hasta 120 caracteres
  y extensión `.mov` o `.mp4`. Lo usan el navegador (antes de subir), el Route
  Handler y las Server Actions, y el nombre siempre se codifica con
  `encodeURIComponent` en la URL hacia la API. Si cambia en la API, cambia en
  la web.
- **Server Actions de entregas** (`src/lib/acciones-entregas.ts`).
  `leerEntregas`, `quitarEntrega` y `colocarTomas` validan curso y número,
  validan el nombre con `esNombreEntrega` y reconstruyen las asignaciones sin
  claves extra (como mucho 200), usan `origenPermitido()` antes de tocar la
  red y solo escriben con `escribir`. `leerEntregas` es un GET sin token. Al
  navegador solo llegan literales o el `detail` de cadena de 404, 409, 422 y
  503, que en la API son literales. La opción `escena` de `lanzarAccion`
  cumple `^E[0-9]{2}$` en la web y en la API, que comprueba además que la
  escena exista.
- **Datos de las tomas en pantalla.** El texto reconocido de las tomas, los
  nombres de archivo (entregados, en cola o de la propuesta), `original` y los
  títulos de escenas y ganchos son datos del disco: se pintan con JSX y nunca
  como HTML. `original` llega de la API reducido al nombre, sin carpetas. Un
  `detail` que muestre `subirEntrega` solo se toma si es una cadena.
- **URL de vídeo.** Los `<video>` de las tomas a cámara y de los ganchos usan
  `urlToma(video, version)` sobre `NEXT_PUBLIC_API_URL`: `video` es una ruta
  pública relativa que resuelve la API y va codificada en `ruta=`, y la
  versión también se codifica.

## Hallazgos prioritarios

- Un secreto o ruta privada en `NEXT_PUBLIC_*`, código, tests o documentación:
  HIGH.
- `dangerouslySetInnerHTML`, `innerHTML` o una librería que interprete HTML de
  datos leídos de disco sin sanitización: HIGH.
- Una URL de API controlable por parámetros de usuario o que permita enviar
  datos a un host remoto inesperado: HIGH.
- Acciones de GitHub no fijadas por un SHA completo de 40 caracteres: HIGH.
- Mostrar errores que incluyan rutas locales o textos reales de lecciones:
  MEDIUM o HIGH según el dato.

## Formato

```text
# Vuln N: <categoría>: `archivo:línea`
- Severity: Critical | High | Medium | Low
- Description: ...
- Exploit Scenario: ...
- Recommendation: ...
```

Una auditoría completa añade resumen, prioridad y risk score:
`CRITICAL*25 + HIGH*10 + MEDIUM*3 + LOW*1`, con máximo 100.
