#!/usr/bin/env sh

PROJECT_FILE=".vercel/project.json"

if [ -f "$PROJECT_FILE" ]; then
  exit 0
fi

if command -v vercel >/dev/null 2>&1; then
  if vercel whoami >/dev/null 2>&1; then
    vercel link --yes --project infinite-fusion-nuzlocke --scope frederik-boschs-projects-b8622911 >/dev/null 2>&1 || true
  fi
fi
