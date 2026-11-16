# Inyección y renderizado

1. Lee `security/security-review-instructions.md`.
2. Trata títulos, guiones, rutas y metadatos de la API como datos no fiables.
3. Exige JSX normal para texto; prohíbe `dangerouslySetInnerHTML`, `innerHTML`
   y HTML o Markdown sin sanitización explícita.
4. Codifica componentes de ruta y query con `encodeURIComponent` o `URL`.
5. Revisa `href`, `src` y cualquier URL construida con datos externos.
