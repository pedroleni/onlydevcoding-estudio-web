# Vulnerabilidades de código

1. Lee `security/security-review-instructions.md`.
2. Ejecuta `scripts/security/scan_code_patterns.sh`.
3. Revisa XSS, redirecciones abiertas, URLs inseguras, ejecución de procesos,
   exposición de errores y límites entre componentes de servidor y cliente.
4. Comprueba que las peticiones tengan `cache: 'no-store'` cuando leen el
   estado local mutable del estudio.
5. Descarta falsos positivos y reporta solo riesgos concretos.
