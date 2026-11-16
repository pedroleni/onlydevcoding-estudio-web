#!/usr/bin/env bash
# Busca instrucciones sospechosas y texto oculto en todo archivo versionado.
set -euo pipefail

PROJECT_ROOT="${1:-.}"
FINDINGS=0

echo "=== Escáner de prompt injection ==="

if ! python3 - "$PROJECT_ROOT" <<'PY'
import re
import subprocess
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
excluded = {"scripts/security/scan_prompt_injection.sh"}
ignored_directories = {".git", "node_modules", ".next"}

try:
    output = subprocess.run(
        ["git", "-C", str(root), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        check=True,
        capture_output=True,
    ).stdout.decode()
    relative_paths = [path for path in output.split("\0") if path]
except (subprocess.CalledProcessError, FileNotFoundError, UnicodeDecodeError):
    relative_paths = [
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file()
        and not ignored_directories.intersection(path.relative_to(root).parts)
    ]

invisible = re.compile("[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff\u00ad]")
directive = re.compile(
    r"ignore.{0,30}(previous|prior|above).{0,20}instruction|"
    r"reveal.{0,20}(system|developer).{0,20}prompt|"
    r"disable.{0,20}security|exfiltrate|"
    r"you are now|system prompt|disregard.{0,30}(previous|prior|all)|"
    r"act as.{0,20}(root|system|unrestricted)|"
    r"(hidden|secret).{0,20}instruction",
    re.IGNORECASE,
)
encoded = re.compile(r"(?:[A-Za-z0-9+/]{4}){15,}={0,2}")
errors = []

for relative in dict.fromkeys(relative_paths):
    if relative in excluded:
        continue
    path = root / relative
    if not path.is_file():
        continue
    data = path.read_bytes()
    if b"\0" in data:
        continue
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        continue
    for number, line in enumerate(text.splitlines(), 1):
        if invisible.search(line):
            errors.append(f"carácter Unicode invisible en {relative}:{number}")
        if directive.search(line):
            errors.append(f"directiva dirigida a agentes en {relative}:{number}")
        if encoded.search(line) and line.lstrip().startswith(("#", "//", "<!--")):
            errors.append(f"payload codificado en comentario en {relative}:{number}")

for error in errors:
    print(f"[HIGH] {error}")
if errors:
    raise SystemExit(1)
print("OK: sin caracteres ocultos, directivas maliciosas ni payloads codificados.")
PY
then
  FINDINGS=$((FINDINGS + 1))
fi

echo "Total findings: $FINDINGS"
if [ "$FINDINGS" -gt 0 ]; then
  exit 1
fi
echo "No se han detectado instrucciones sospechosas."
