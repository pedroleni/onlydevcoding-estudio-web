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
