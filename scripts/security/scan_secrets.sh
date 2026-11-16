#!/usr/bin/env bash
# Busca credenciales y datos privados en todo archivo versionado o pendiente.
set -euo pipefail

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"
FINDINGS=0

finding() {
  local severity="$1" file="$2" line="$3" description="$4"
  FINDINGS=$((FINDINGS + 1))
  printf '[%s] %s:%s - %s\n' "$severity" "$file" "$line" "$description"
}

listar_archivos() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git ls-files -z --cached --others --exclude-standard
  else
    find . -type f \
      -not -path './.git/*' \
      -not -path './node_modules/*' \
      -not -path './.next/*' \
      -print0
  fi
}

scan_file() {
  local file="$1" line

  while IFS= read -r line; do
    [ -n "$line" ] && finding "CRITICAL" "$file" "$line" "posible credencial o clave privada"
  done < <(grep -nIE \
    'AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{36,}|sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{48,}|xoxb-[A-Za-z0-9-]{20,}|AIza[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|[A-Za-z][A-Za-z0-9+.-]*://[^/@[:space:]]+:[^/@[:space:]]+@' \
    "$file" 2>/dev/null | cut -d: -f1 || true)

  while IFS= read -r line; do
    [ -n "$line" ] && finding "HIGH" "$file" "$line" "ruta absoluta privada de macOS"
  done < <(grep -nIE '/Users/[^/[:space:]]+/' "$file" 2>/dev/null | cut -d: -f1 || true)

  while IFS= read -r line; do
    [ -n "$line" ] && finding "HIGH" "$file" "$line" "posible email privado"
  done < <(grep -nIE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' "$file" 2>/dev/null \
    | grep -viE '@example\.com|(^|[^A-Za-z0-9])noreply@' | cut -d: -f1 || true)
}

echo "=== Escáner de secretos ==="

while IFS= read -r -d '' file; do
  file="${file#./}"
  [ "$file" = "scripts/security/scan_secrets.sh" ] && continue
  [ -f "$file" ] && scan_file "$file"
done < <(listar_archivos)

# Un .env local solo es un hallazgo si Git lo tiene versionado o en el índice.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  while IFS= read -r envfile; do
    case "$envfile" in
      .env.example|*/.env.example) continue ;;
    esac
    [ -n "$envfile" ] && finding "HIGH" "$envfile" "0" "archivo de entorno presente en el índice de git"
  done < <(git ls-files --cached -- '.env*' '*/.env*' 2>/dev/null || true)
else
  while IFS= read -r -d '' envfile; do
    envfile="${envfile#./}"
    finding "HIGH" "$envfile" "0" "archivo de entorno presente en la copia escaneada"
  done < <(find . -type f -name '.env*' ! -name '.env.example' \
    -not -path './.git/*' -not -path './node_modules/*' -not -path './.next/*' -print0)
fi

echo "Total findings: $FINDINGS"
[ "$FINDINGS" -eq 0 ] && echo "No se han detectado secretos."
if [ "$FINDINGS" -gt 0 ]; then
  exit 1
fi
