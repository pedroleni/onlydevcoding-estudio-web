#!/usr/bin/env bash
# Detecta patrones vulnerables en la aplicación y sus configuraciones TS/JS.
set -euo pipefail

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"
FINDINGS=0

scan() {
  local severity="$1" description="$2" pattern="$3"
  local result
  result=$(grep -RnE --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' \
    --exclude='*.test.ts' --exclude='*.test.tsx' "$pattern" src next.config.ts \
    eslint.config.mjs vitest.config.ts 2>/dev/null || true)
  if [ -n "$result" ]; then
    FINDINGS=$((FINDINGS + 1))
    printf '[%s] %s\n%s\n' "$severity" "$description" "$result"
  fi
}

echo "=== Escáner de patrones de código ==="
scan "HIGH" "renderizado HTML sin escape" 'dangerouslySetInnerHTML|\.innerHTML[[:space:]]*='
scan "CRITICAL" "ejecución dinámica de código" '(^|[^A-Za-z])(eval|Function)[[:space:]]*\('
scan "HIGH" "ejecución de shell desde la web" 'child_process|execSync|spawnSync|\.exec[[:space:]]*\('
scan "HIGH" "secreto potencial en variable pública" 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PRIVATE|KEY)'

external_urls=$(grep -RnE --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' \
  --exclude='*.test.ts' --exclude='*.test.tsx' 'https?://' src 2>/dev/null \
  | grep -vE 'https?://(127\.0\.0\.1|localhost):8000' || true)
if [ -n "$external_urls" ]; then
  FINDINGS=$((FINDINGS + 1))
  printf '[HIGH] destino HTTP no local en código de aplicación\n%s\n' "$external_urls"
fi

echo "Total findings: $FINDINGS"
[ "$FINDINGS" -eq 0 ] && echo "No se han detectado patrones vulnerables."
exit 0
