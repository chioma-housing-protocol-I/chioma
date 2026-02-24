#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# Install dependencies (prefer pnpm, fall back to npm)
pnpm install || npm install

# Check formatting, lint, and build
pnpm run format:check
pnpm run lint
pnpm run build
