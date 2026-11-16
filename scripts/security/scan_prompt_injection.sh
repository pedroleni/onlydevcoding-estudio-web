#!/usr/bin/env bash
# Busca instrucciones sospechosas u ocultas en contenido que no es del marco.
set -euo pipefail

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"
FINDINGS=0

echo "=== Escáner de prompt injection ==="

result=$(grep -RnEi \
  'ignore (all |any |the )?(previous|prior) instructions|reveal (the )?(system|developer) prompt|exfiltrate|disable (the )?security' \
  src public README.md 2>/dev/null || true)
if [ -n "$result" ]; then
  echo "[HIGH] Posibles instrucciones dirigidas a agentes:"
  echo "$result"
  FINDINGS=$((FINDINGS + 1))
fi

if ! node --input-type=module <<'NODE'
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const roots = ["src", "public"];
const allowed = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".html", ".svg"]);
const hidden = /[\u202A-\u202E\u2066-\u2069]/u;

function walk(path) {
  for (const entry of readdirSync(path)) {
    const current = join(path, entry);
    if (statSync(current).isDirectory()) walk(current);
    else if (allowed.has(extname(current)) && hidden.test(readFileSync(current, "utf8"))) {
      process.exit(1);
    }
  }
}

for (const root of roots) walk(root);
NODE
then
  echo "[HIGH] Se han detectado caracteres de control bidireccional ocultos"
  FINDINGS=$((FINDINGS + 1))
fi

echo "Total findings: $FINDINGS"
[ "$FINDINGS" -eq 0 ] && echo "No se han detectado instrucciones sospechosas."
exit 0
