<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md - Web local del estudio de OnlyDevCoding

Instrucciones para cualquier agente de código que trabaje en este repositorio.

## Proyecto

Web local en Next.js 16, React 19, TypeScript y Tailwind CSS 4. Consume la API
local del estudio en `127.0.0.1:8000`. No tiene autenticación ni despliegue
público por diseño.

## Documentación que hay que leer

Lee el brief o plan aplicable y este archivo. Antes de usar una API de Next.js,
consulta la guía correspondiente en `node_modules/next/dist/docs/`; esta
versión puede diferir de versiones anteriores. Si falta una decisión que
afecte al producto o a la seguridad, señala la duda en vez de improvisarla.

## Comandos del proyecto

- Desarrollo: `npm run dev`
- Lint: `npm run lint`
- Tests: `npm test -- --run`
- Build: `npm run build`
- Scanners: `for s in scripts/security/scan_*.sh; do bash "$s"; done`

## Seguridad obligatoria

La revisión cubre ocho dominios mediante `.claude/agents/security-*.md`. Si el
entorno no permite delegar, recórrelos de forma secuencial. Lee también
`security/security-review-instructions.md`, que contiene los precedentes de
este proyecto.

Antes de cerrar cambios que afecten a:

- llamadas a la API, URLs públicas o contenido leído de disco:
  `.claude/agents/security-local-api.md`;
- variables de entorno o datos sensibles: `security-secrets.md`;
- renderizado de texto o URLs: `security-injection.md`;
- dependencias o `package-lock.json`: `security-supply-chain.md`;
- código general: `security-code-vulns.md`;
- workflows o configuración: `security-infrastructure.md`.

Una auditoría completa recorre `security-agent-env`, `security-secrets`,
`security-code-vulns`, `security-supply-chain`, `security-injection`,
`security-local-api`, `security-infrastructure` y
`security-prompt-injection`. Reporta solo hallazgos CRITICAL, HIGH o MEDIUM
con más del 80 % de confianza. Guarda auditorías completas en
`security/reviews/YYYY-MM-DD-<tema>.md`; los chequeos puntuales no requieren
un informe en esa carpeta.

## Enforcement

- `bash scripts/security/install_hooks.sh` configura `.githooks/pre-commit`.
- El hook ejecuta `scan_secrets.sh` y bloquea CRITICAL/HIGH.
- `.github/workflows/security-scan.yml` ejecuta todos los scanners en cada PR
  y push a `main`.
- `.github/workflows/ci.yml` ejecuta instalación reproducible, lint, tests y
  build.

## Flujo de ramas

1. Parte de `main` actualizado y crea `feat/<nombre-corto>` o
   `fix/<nombre-corto>`.
2. Mantén una tarea o un grupo pequeño y cohesionado por rama.
3. Ejecuta scanners, lint, tests y build.
4. Haz commits normales en la rama, push y PR contra `main`.
5. Solo integra cuando CI y la revisión estén verdes. Nunca hagas push directo
   a `main`.

Si el entorno no permite escribir en `.git`, deja los cambios en el árbol de
trabajo e indica los pasos manuales pendientes.

## Restricciones globales

- El repositorio es público. No incluyas rutas absolutas, emails, tomas ni
  textos reales de lecciones. Los valores privados solo viven en `.env`, que
  está ignorado.
- La fase 1 no escribe en las carpetas del estudio ni de cursos.
- La web solo llama a la API local. `API_URL` y `NEXT_PUBLIC_API_URL` usan por
  defecto `http://127.0.0.1:8000`.
- Nunca expongas secretos en variables `NEXT_PUBLIC_*`.
- Renderiza textos externos mediante JSX normal. No uses
  `dangerouslySetInnerHTML`.
- Mantén dependencias reproducibles mediante `package-lock.json`. No añadas
  una dependencia sin autorización y revisión.
