#!/usr/bin/env bash
# Comprueba la reproducibilidad local sin consultar registros remotos.
set -euo pipefail

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"
FINDINGS=0

echo "=== Escáner de dependencias sin red ==="

if [ ! -f package-lock.json ]; then
  echo "[HIGH] Falta package-lock.json"
  FINDINGS=$((FINDINGS + 1))
else
  if ! node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const root = lock.packages?.[""];

if (!root || lock.lockfileVersion < 3) process.exit(1);

for (const group of ["dependencies", "devDependencies"]) {
  const declared = pkg[group] ?? {};
  const locked = root[group] ?? {};
  for (const [name, version] of Object.entries(declared)) {
    if (locked[name] !== version) process.exit(1);
  }
}
NODE
  then
    echo "[HIGH] package.json y package-lock.json no están sincronizados"
    FINDINGS=$((FINDINGS + 1))
  fi

  if grep -nE '"resolved":[[:space:]]*"http://' package-lock.json >/dev/null; then
    echo "[HIGH] package-lock.json contiene una descarga sin TLS"
    FINDINGS=$((FINDINGS + 1))
  fi
fi

echo "Total findings: $FINDINGS"
[ "$FINDINGS" -eq 0 ] && echo "Lockfile presente y sincronizado."
if [ "$FINDINGS" -gt 0 ]; then
  exit 1
fi
