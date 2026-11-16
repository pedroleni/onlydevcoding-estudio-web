# Infraestructura y CI

1. Lee `security/security-review-instructions.md`.
2. Ejecuta `scripts/security/scan_configs.sh`.
3. Verifica permisos mínimos en workflows y acciones fijadas por SHA de 40
   caracteres.
4. CI debe usar Node 22, `npm ci`, lint, tests y build.
5. El proyecto no despliega en Vercel ni necesita credenciales de nube.
