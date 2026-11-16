#!/usr/bin/env bash
# Configura los hooks versionados de este repositorio.
set -euo pipefail

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "No es un repositorio git: $PROJECT_ROOT" >&2
  exit 1
fi

chmod +x .githooks/pre-commit scripts/security/*.sh
git config core.hooksPath .githooks

echo "core.hooksPath configurado como .githooks"
