#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCANNER="$SCRIPT_DIR/scan_configs.sh"
TEMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEMP_ROOT"' EXIT

crear_proyecto() {
  local nombre="$1"
  mkdir -p "$TEMP_ROOT/$nombre/.github/workflows" "$TEMP_ROOT/$nombre/src"
  touch "$TEMP_ROOT/$nombre/next.config.ts"
  cat > "$TEMP_ROOT/$nombre/package.json" <<'JSON'
{
  "scripts": {
    "dev": "next dev -H 127.0.0.1",
    "start": "next start -H 127.0.0.1",
    "estudio": "next build && next start -H 127.0.0.1"
  }
}
JSON
}

ejecutar_scanner() {
  local proyecto="$1"
  if SALIDA="$(bash "$SCANNER" "$proyecto" 2>&1)"; then
    ESTADO=0
  else
    ESTADO=$?
  fi
}

crear_proyecto uses_sin_guion
cat > "$TEMP_ROOT/uses_sin_guion/.github/workflows/ci.yml" <<'YAML'
permissions: read-all
jobs:
  test:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
YAML
ejecutar_scanner "$TEMP_ROOT/uses_sin_guion"
[ "$ESTADO" -ne 0 ]
grep -q 'acción sin SHA de 40 caracteres: v4' <<< "$SALIDA"

crear_proyecto write_all
cat > "$TEMP_ROOT/write_all/.github/workflows/ci.yml" <<'YAML'
permissions: write-all
jobs: {}
YAML
ejecutar_scanner "$TEMP_ROOT/write_all"
[ "$ESTADO" -ne 0 ]
grep -q 'permissions: write-all' <<< "$SALIDA"

crear_proyecto permiso_write
cat > "$TEMP_ROOT/permiso_write/.github/workflows/ci.yml" <<'YAML'
permissions: read-all
jobs:
  test:
    permissions:
      contents: write
YAML
ejecutar_scanner "$TEMP_ROOT/permiso_write"
[ "$ESTADO" -ne 0 ]
grep -q 'contents: write' <<< "$SALIDA"

crear_proyecto host_no_local
cat > "$TEMP_ROOT/host_no_local/package.json" <<'JSON'
{
  "scripts": {
    "dev": "next dev",
    "start": "next start -H 0.0.0.0",
    "estudio": "next build && next start"
  }
}
JSON
ejecutar_scanner "$TEMP_ROOT/host_no_local"
[ "$ESTADO" -ne 0 ]
grep -q 'script dev no fija -H 127.0.0.1' <<< "$SALIDA"
grep -q 'script start no fija -H 127.0.0.1' <<< "$SALIDA"
grep -q 'script estudio no fija -H 127.0.0.1' <<< "$SALIDA"

crear_proyecto pull_request_target
cat > "$TEMP_ROOT/pull_request_target/.github/workflows/ci.yml" <<'YAML'
name: CI insegura
on: pull_request_target
permissions: read-all
jobs: {}
YAML
ejecutar_scanner "$TEMP_ROOT/pull_request_target"
[ "$ESTADO" -ne 0 ]
grep -q 'pull_request_target' <<< "$SALIDA"

crear_proyecto configuracion_valida
cat > "$TEMP_ROOT/configuracion_valida/.github/workflows/ci.yml" <<'YAML'
name: CI segura
on: pull_request
permissions: read-all
jobs: {}
YAML
ejecutar_scanner "$TEMP_ROOT/configuracion_valida"
[ "$ESTADO" -eq 0 ]

echo "scan_configs: pruebas superadas"
