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
7. `next dev` y `next start` deben escuchar solo en `127.0.0.1:3000`. El
   `src/proxy.ts` valida `Host`: permite el host canónico, redirige
   `localhost:3000` a este y rechaza los demás con 400. Esta combinación limita
   la exposición en la red local y mitiga DNS rebinding.
8. La dirección canónica `127.0.0.1` mantiene la web y la API en el mismo sitio,
   y la API rechaza los medios pedidos con `Sec-Fetch-Site: cross-site`. No se
   usa `Cross-Origin-Resource-Policy: same-site`: Chromium bloquea con ella los
   medios entre los puertos 3000 y 8000.
9. El salto del navegador a una Server Action exige el `Host` exacto
   `127.0.0.1:3000` y, salvo en GET y HEAD, el `Origin` exacto
   `http://127.0.0.1:3000`; Next comprueba además `Origin` frente a `Host`. No
   se debe relajar el Proxy. El token propio protege el salto posterior de la
   web a la API local, no la petición del navegador a la Server Action.
