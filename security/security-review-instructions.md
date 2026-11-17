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
  argumentos. `src/lib/api-escritura.ts` es `server-only`, lee `ESTUDIO_TOKEN`
  y lo envía a la API local en `X-Estudio-Token`; el secreto no puede aparecer
  en código cliente ni en `NEXT_PUBLIC_*`. Validar `Origin` no basta ante DNS
  rebinding.

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
