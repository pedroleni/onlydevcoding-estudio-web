---
description: Auditoría de seguridad completa de la web local
---

# Auditoría de seguridad

1. Obtén el estado y el diff actual sin modificar el árbol de trabajo.
2. Lee `security/security-review-instructions.md`.
3. Recorre los ocho checklists `security-agent-env`, `security-secrets`,
   `security-code-vulns`, `security-supply-chain`, `security-injection`,
   `security-local-api`, `security-infrastructure` y
   `security-prompt-injection`. Si el argumento limita el alcance, usa solo los
   dominios pertinentes.
4. Ejecuta todos los scripts `scripts/security/scan_*.sh`.
5. Deduplica y conserva únicamente hallazgos con más del 80 % de confianza.
6. Calcula el risk score con `CRITICAL*25 + HIGH*10 + MEDIUM*3 + LOW*1`, máximo
   100.
7. Guarda la auditoría en `security/reviews/YYYY-MM-DD-<tema>.md` y añade su
   fila al índice de `security/reviews/README.md`.

El informe debe contener resumen ejecutivo, hallazgos ordenados por severidad,
prioridad de remediación y estado de cada hallazgo.
