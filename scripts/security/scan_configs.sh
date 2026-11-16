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

if grep -RnE 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PRIVATE|KEY)' \
  --include='*.ts' --include='*.tsx' --include='*.yml' --include='*.yaml' \
  src .github next.config.ts 2>/dev/null; then
  finding "se ha encontrado una variable pública con nombre sensible"
fi

echo "Total findings: $FINDINGS"
[ "$FINDINGS" -eq 0 ] && echo "La configuración no presenta hallazgos bloqueantes."
exit 0
