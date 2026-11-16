# Límite de la API local

1. Lee `security/security-review-instructions.md`.
2. Confirma que la web solo contacte `127.0.0.1:8000` por defecto y que las
   alternativas solo procedan de variables de entorno explícitas.
3. `API_URL` se usa en servidor. `NEXT_PUBLIC_API_URL` solo puede contener la
   URL base pública y nunca secretos, tokens ni credenciales.
4. Las rutas de medios se codifican antes de entrar en la query. La API sigue
   siendo responsable de contenerlas dentro de sus raíces.
5. No envíes textos, rutas privadas o errores del disco a terceros, telemetría
   o logs públicos.
6. Esta web no tiene autenticación, Supabase, RLS ni criptografía de sesión.
