#!/usr/bin/env bash
# Contrato: el escáner de dependencias pasa con un lockfile v3 sincronizado y bloquea
# cuando falta, está desincronizado, es de una versión antigua o descarga sin TLS.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCANNER="$REPO_ROOT/scripts/security/scan_dependencies.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FALLOS=0

# Proyecto mínimo con una dependencia y su lockfile coherente.
proyecto() {
  local dir="$TMP/$1"
  mkdir -p "$dir"
  cat >"$dir/package.json" <<'JSON'
{ "name": "prueba", "dependencies": { "paquete-ficticio": "1.2.3" } }
JSON
  cat >"$dir/package-lock.json" <<'JSON'
{
  "name": "prueba",
  "lockfileVersion": 3,
  "packages": {
    "": { "name": "prueba", "dependencies": { "paquete-ficticio": "1.2.3" } },
    "node_modules/paquete-ficticio": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/paquete-ficticio/-/paquete-ficticio-1.2.3.tgz"
    }
  }
}
JSON
  printf '%s\n' "$dir"
}

# esperado: 0 = pasa, 1 = bloquea; patrón: texto que debe aparecer en la salida.
espera() {
  local esperado="$1" descripcion="$2" dir="$3" patron="${4:-}"
  local salida obtenido=0
  salida="$(bash "$SCANNER" "$dir" 2>&1)" || obtenido=1
  if [ "$obtenido" != "$esperado" ]; then
    echo "FALLO: $descripcion (salida $obtenido, esperada $esperado)"
    FALLOS=$((FALLOS + 1))
  elif [ -n "$patron" ] && ! grep -q "$patron" <<<"$salida"; then
    echo "FALLO: $descripcion no informa «${patron}»"
    FALLOS=$((FALLOS + 1))
  fi
}

espera 0 "lockfile sincronizado" "$(proyecto limpio)"
espera 0 "el lockfile real del repo" "$REPO_ROOT"

dir="$(proyecto sin-lock)"
rm "$dir/package-lock.json"
espera 1 "falta package-lock.json" "$dir" "Falta package-lock.json"

dir="$(proyecto desincronizado)"
sed -i.bak 's/"paquete-ficticio": "1.2.3" } }$/"paquete-ficticio": "9.9.9" } }/' "$dir/package.json"
espera 1 "package.json pide otra versión" "$dir" "no están sincronizados"

dir="$(proyecto lock-antiguo)"
sed -i.bak 's/"lockfileVersion": 3/"lockfileVersion": 2/' "$dir/package-lock.json"
espera 1 "lockfile anterior a la versión 3" "$dir" "no están sincronizados"

dir="$(proyecto sin-tls)"
sed -i.bak 's#"https://registry#"http://registry#' "$dir/package-lock.json"
espera 1 "descarga sin TLS" "$dir" "sin TLS"

if [ "$FALLOS" -gt 0 ]; then
  echo "test_scan_dependencies: $FALLOS fallos"
  exit 1
fi
echo "test_scan_dependencies: OK"
