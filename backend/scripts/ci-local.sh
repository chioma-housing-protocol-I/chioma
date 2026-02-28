#!/usr/bin/env bash
# Run the same steps as backend CI locally. Run from backend: ./scripts/ci-local.sh
set -e

cd "$(dirname "$0")/.."

echo "==> Install (frozen lockfile)"
pnpm install --frozen-lockfile

echo "==> Lint"
pnpm run lint

echo "==> Prettier check"
npx prettier --check "src/**/*.ts" "test/**/*.ts"

echo "==> TypeScript"
npx tsc --noEmit

echo "==> Unit tests"
pnpm run test

echo "==> Coverage"
pnpm run test:cov

echo "==> OpenAPI generate (CI env)"
export OPENAPI_GENERATE=true
export OPENAPI_OUTPUT=openapi.json
export NODE_ENV=test
export NODE_OPTIONS="${NODE_OPTIONS:---unhandled-rejections=strict}"
export RATE_LIMIT_TTL=60000
export RATE_LIMIT_MAX=100
export RATE_LIMIT_AUTH_TTL=60000
export RATE_LIMIT_AUTH_MAX=5
export RATE_LIMIT_STRICT_TTL=60000
export RATE_LIMIT_STRICT_MAX=10
export DB_TYPE=sqlite
export DB_DATABASE=:memory:
export JWT_SECRET=openapi-generate-dummy-secret-not-for-production
export CHIOMA_CONTRACT_ID=CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE
export ESCROW_CONTRACT_ID=CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE
export DISPUTE_CONTRACT_ID=CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE
export RENT_OBLIGATION_CONTRACT_ID=CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE

pnpm run openapi:generate

echo "==> Verify OpenAPI spec"
node -e "const s=require('./openapi.json'); if(!s.openapi||!s.paths) throw new Error('Invalid OpenAPI'); console.log('OpenAPI', s.info?.version, 'paths:', Object.keys(s.paths).length);"

echo "==> CI checks passed locally"
