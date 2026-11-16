# Secretos y configuración sensible

1. Lee `security/security-review-instructions.md`.
2. Ejecuta `scripts/security/scan_secrets.sh`.
3. Comprueba que `.env*` reales no estén versionados y que `.env.example`
   solo contenga valores locales ficticios.
4. Revisa código, tests, documentación, logs y workflows para detectar claves,
   rutas privadas, emails o contenido real del estudio.
5. Trata cualquier secreto en `NEXT_PUBLIC_*` como HIGH.
