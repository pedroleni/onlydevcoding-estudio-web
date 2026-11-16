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

external_urls=$(node --input-type=module <<'NODE'
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const extensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const allowed = /^http:\/\/(?:127\.0\.0\.1:8000|localhost:8000|127\.0\.0\.1:3000)(?=$|[\/"'\x60])/;
const absoluteUrl = /https?:\/\/[^\s)\]}]+/g;
const protocolRelative = /["'\x60]\/\/[^\s"'\x60)\]}]+/g;
const findings = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") walk(path);
      continue;
    }
    if (!extensions.has(extname(entry.name)) || /\.(?:test|spec)\.[^.]+$/.test(entry.name)) continue;
    const data = readFileSync(path);
    if (data.includes(0)) continue;
    const lines = data.toString("utf8").split(/\r?\n/u);
    lines.forEach((line, index) => {
      for (const url of line.match(absoluteUrl) ?? []) {
        if (!allowed.test(url)) findings.push(relative(".", path) + ":" + (index + 1) + ":" + url);
      }
      for (const url of line.match(protocolRelative) ?? []) {
        findings.push(relative(".", path) + ":" + (index + 1) + ":" + url);
      }
    });
  }
}

try {
  walk("src");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
process.stdout.write(findings.join("\n"));
NODE
)
if [ -n "$external_urls" ]; then
  FINDINGS=$((FINDINGS + 1))
  printf '[HIGH] destino HTTP no local en código de aplicación\n%s\n' "$external_urls"
fi

echo "Total findings: $FINDINGS"
[ "$FINDINGS" -eq 0 ] && echo "No se han detectado patrones vulnerables."
if [ "$FINDINGS" -gt 0 ]; then
  exit 1
fi
