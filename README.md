# OnlyDevCoding Estudio Web

Interfaz local para consultar los cursos, las lecciones y su estado de
producción en el estudio de OnlyDevCoding. Está construida con Next.js 16,
React 19, TypeScript y Tailwind CSS 4.

La aplicación no tiene autenticación ni despliegue público. Solo consume la
API local del estudio.

## Preparación

Instala las dependencias fijadas en el lockfile:

```bash
npm ci
```

Crea el archivo de configuración local a partir del ejemplo:

```bash
cp .env.example .env
```

Los valores de ejemplo apuntan a `http://127.0.0.1:8000`. No añadas secretos,
rutas privadas ni datos reales del estudio a los archivos versionados.

Genera un token para las escrituras locales y copia exactamente el mismo valor
en `ESTUDIO_TOKEN` del `.env` de la API y de la web:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

El token solo se lee en el servidor. No lo pongas en una variable
`NEXT_PUBLIC_*` ni lo incluyas en archivos versionados.

## Uso diario

Antes de abrir la web, arranca la API local del estudio en
`127.0.0.1:8000`. Para consultar el estudio, crea una build de producción y
arráncala con:

```bash
npm run estudio
```

La web estará disponible únicamente en
[http://127.0.0.1:3000](http://127.0.0.1:3000). Los scripts `dev`, `start` y
`estudio` escuchan solo en `127.0.0.1`, no en las interfaces de la red local.
Usa esa dirección en vez de `localhost`: así la web y la API
(`127.0.0.1:8000`) pertenecen al mismo sitio, y la API solo sirve los medios
a peticiones que no lleguen marcadas como `Sec-Fetch-Site: cross-site`. Las peticiones con
`Host: localhost:3000` se redirigen a la dirección canónica; cualquier otro
`Host` se rechaza con un 400 en las rutas de la aplicación para reducir la
exposición a DNS rebinding.

## Desarrollo

Usa `npm run dev` únicamente mientras programas. Las rutas internas
`/__nextjs_*` y `/_next/*` de `next dev` no pasan por `src/proxy.ts`, incluida
`/__nextjs_launch-editor`; por eso el modo de desarrollo no ofrece la misma
protección de `Host` que el uso diario con `npm run estudio`. En la build de
producción los endpoints `__nextjs` de desarrollo no existen.

Si la API no está en marcha, las pantallas muestran un aviso en lugar de
quedarse en blanco. Las escrituras de publicación se realizan mediante Server
Actions que validan sus argumentos y envían `X-Estudio-Token` a la API local
desde el servidor. Validar `Origin` no basta frente a DNS rebinding, por lo que
la API rechaza toda escritura sin ese token.

## Comprobaciones

```bash
npm run lint
npm test -- --run
npm run build
for s in scripts/security/scan_*.sh; do bash "$s"; done
```
