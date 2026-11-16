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

## Desarrollo

Antes de abrir la web, arranca la API local del estudio en
`127.0.0.1:8000`. Después inicia Next.js:

```bash
npm run dev
```

La web estará disponible en [http://localhost:3000](http://localhost:3000).
Si la API no está en marcha, las pantallas muestran un aviso en lugar de
quedarse en blanco.

## Comprobaciones

```bash
npm run lint
npm test -- --run
npm run build
for s in scripts/security/scan_*.sh; do bash "$s"; done
```
