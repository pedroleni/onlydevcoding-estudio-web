#!/usr/bin/env bash
# Audita configuración y exige acciones de GitHub fijadas por SHA completo.
set -euo pipefail

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"
FINDINGS=0

finding() {
  FINDINGS=$((FINDINGS + 1))
  printf '[HIGH] %s\n' "$1"
}

echo "=== Auditor de configuración ==="

if [ -d .github/workflows ]; then
  while IFS= read -r workflow; do
    grep -qE '^permissions:' "$workflow" || finding "$workflow no declara permisos mínimos"

    if grep -qE '^[[:space:]]*permissions:[[:space:]]*write-all([[:space:]]*(#.*)?)?$' "$workflow"; then
      finding "$workflow declara permissions: write-all"
    fi

    if grep -qE 'pull_request_target([[:space:]]*:|[[:space:]]*(#.*)?$)' "$workflow"; then
      finding "$workflow usa pull_request_target"
    fi

    while IFS= read -r permission_line; do
      permission_line="$(printf '%s' "$permission_line" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
      finding "$workflow declara un permiso de escritura: $permission_line"
    done < <(grep -E '^[[:space:]]*[a-zA-Z-]+:[[:space:]]*write([[:space:]]*(#.*)?)?$' "$workflow" || true)

    while IFS= read -r use_line; do
      ref="${use_line##*@}"
      ref="${ref%%#*}"
      ref="$(printf '%s' "$ref" | tr -d '[:space:]')"
      if ! printf '%s' "$ref" | grep -qE '^[0-9a-f]{40}$'; then
        finding "$workflow contiene una acción sin SHA de 40 caracteres: $ref"
      fi
    done < <(grep -E '^[[:space:]]*(-[[:space:]]+)?uses:[[:space:]]+[^[:space:]]+@' "$workflow" || true)
  done < <(find .github/workflows -type f \( -name '*.yml' -o -name '*.yaml' \) | sort)
fi

if [ ! -f package.json ]; then
  finding "falta package.json"
else
  for script in dev start estudio; do
    command="$(node -e '
      const pkg = require(process.argv[1]);
      process.stdout.write(pkg.scripts?.[process.argv[2]] ?? "");
    ' "$(pwd)/package.json" "$script")"
    if ! grep -qE '(^|[[:space:]])-H[[:space:]]+127\.0\.0\.1([[:space:]]|$)' <<< "$command"; then
      finding "el script $script no fija -H 127.0.0.1"
    fi
  done
fi

if grep -RnE 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PRIVATE|KEY)' \
  --include='*.ts' --include='*.tsx' --include='*.yml' --include='*.yaml' \
  src .github next.config.ts 2>/dev/null; then
  finding "se ha encontrado una variable pública con nombre sensible"
fi

echo "Total findings: $FINDINGS"
[ "$FINDINGS" -eq 0 ] && echo "La configuración no presenta hallazgos bloqueantes."
if [ "$FINDINGS" -gt 0 ]; then
  exit 1
fi
