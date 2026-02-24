#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

pnpm install

# Format, lint, test, and build
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
