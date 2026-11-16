# Cadena de suministro

1. Lee `security/security-review-instructions.md`.
2. Ejecuta `scripts/security/scan_dependencies.sh` sin acceder a la red.
3. Compara `package.json` y `package-lock.json`; investiga dependencias nuevas,
   scripts de instalación y cambios de procedencia.
4. Verifica que CI use `npm ci` y que las acciones estén fijadas por SHA.
5. No autorices instalaciones ni actualizaciones fuera del alcance solicitado.
