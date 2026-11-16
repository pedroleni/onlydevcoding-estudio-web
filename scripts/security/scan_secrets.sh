#!/usr/bin/env bash
# Busca credenciales en código, configuración y documentación pública.
set -euo pipefail

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"

FINDINGS=0

finding() {
  local severity="$1" file="$2" line="$3" description="$4"
  FINDINGS=$((FINDINGS + 1))
  printf '[%s] %s:%s - %s\n' "$severity" "$file" "$line" "$description"
}

scan_file() {
  local file="$1" line
  while IFS= read -r line; do
    [ -n "$line" ] && finding "CRITICAL" "$file" "$line" "posible credencial o clave privada"
  done < <(grep -nE \
    'AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{36,}|sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{48,}|-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|[A-Za-z][A-Za-z0-9+.-]*://[^/@[:space:]]+:[^/@[:space:]]+@' \
    "$file" 2>/dev/null | cut -d: -f1 || true)
}

echo "=== Escáner de secretos ==="

for root in src security .claude .github; do
  [ -d "$root" ] || continue
  while IFS= read -r -d '' file; do
    scan_file "$file"
  done < <(find "$root" -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \
       -o -name '*.json' -o -name '*.yml' -o -name '*.yaml' -o -name '*.md' \) \
    -print0)
done

for file in AGENTS.md CLAUDE.md README.md package.json next.config.ts eslint.config.mjs vitest.config.ts; do
  [ -f "$file" ] && scan_file "$file"
done

# Un .env local solo es un hallazgo si Git lo tiene versionado o en el índice.
while IFS= read -r envfile; do
  case "$envfile" in
    .env.example|*/.env.example) continue ;;
  esac
  [ -n "$envfile" ] && finding "HIGH" "$envfile" "0" "archivo de entorno presente en el índice de git"
done < <(git ls-files --cached -- '.env*' '*/.env*' 2>/dev/null || true)

echo "Total findings: $FINDINGS"
[ "$FINDINGS" -eq 0 ] && echo "No se han detectado secretos."
exit 0
