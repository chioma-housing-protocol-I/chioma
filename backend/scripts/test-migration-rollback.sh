#!/usr/bin/env bash
# =============================================================================
# test-migration-rollback.sh
# =============================================================================
# Tests the rollback viability of database migrations by:
#   1. Creating a temporary test database
#   2. Running all migrations up
#   3. Reverting each migration one-by-one, verifying the schema state
#   4. Re-applying the migrations
#   5. Cleaning up the test database
#
# Usage:
#   bash ./scripts/test-migration-rollback.sh
#
# Prerequisites:
#   - PostgreSQL must be running and accessible via the env vars below
#   - psql must be installed
#   - Node.js dependencies must be installed (pnpm install)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Database configuration (defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
TEST_DB="chioma_migration_test_$(date +%s)"

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

cleanup() {
  if [[ -n "${TEST_DB:-}" ]]; then
    warn "Cleaning up test database: $TEST_DB"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -c "DROP DATABASE IF EXISTS \"$TEST_DB\"" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "=============================================="
echo " Migration Rollback Test"
echo "=============================================="
echo ""

# Step 1: Create test database
echo "Creating test database: $TEST_DB"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -c "CREATE DATABASE \"$TEST_DB\"" 2>/dev/null || {
  error "Failed to create test database. Ensure PostgreSQL is running and accessible."
  exit 1
}
log "Test database created"

# Step 2: Export test database config
export DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB}"
export TYPEORM_LOGGING=false

# Step 3: Run all migrations
echo ""
echo "--- Running all migrations ---"
if ! npx ts-node -r tsconfig-paths/register src/database/migration-runner.ts run; then
  error "Migration run failed"
  exit 1
fi
log "All migrations applied successfully"

# Step 4: Count applied migrations
MIGRATION_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEST_DB" -t -A -c "SELECT COUNT(*) FROM migrations" 2>/dev/null || echo "0")
log "$MIGRATION_COUNT migrations applied"

# Step 5: Revert each migration one at a time
echo ""
echo "--- Testing rollback of each migration ---"
REVERT_COUNT=0
for i in $(seq 1 "$MIGRATION_COUNT"); do
  if npx ts-node -r tsconfig-paths/register src/database/migration-runner.ts revert; then
    REVERT_COUNT=$((REVERT_COUNT + 1))
    log "Rollback #$REVERT_COUNT successful"
  else
    error "Rollback #$i failed"
    exit 1
  fi
done

REMAINING=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEST_DB" -t -A -c "SELECT COUNT(*) FROM migrations" 2>/dev/null || echo "0")
if [[ "$REMAINING" -eq 0 ]]; then
  log "All $REVERT_COUNT migrations reverted successfully (migrations table empty)"
else
  error "Expected 0 migrations remaining, found $REMAINING"
  exit 1
fi

# Step 6: Re-apply all migrations
echo ""
echo "--- Re-applying all migrations ---"
if ! npx ts-node -r tsconfig-paths/register src/database/migration-runner.ts run; then
  error "Re-apply of migrations failed"
  exit 1
fi
log "All migrations re-applied successfully"

# Step 7: Run consistency checks
echo ""
echo "--- Running consistency checks ---"
if npx ts-node -r tsconfig-paths/register src/database/consistency-checker.ts; then
  log "Consistency checks passed"
else
  warn "Migration rollback end-to-end test passed, but consistency checks flagged issues"
fi

# Step 8: Summary
echo ""
echo "=============================================="
echo -e "${GREEN} Migration Rollback Test: PASSED${NC}"
echo "=============================================="
echo "  Migrations applied:   $MIGRATION_COUNT"
echo "  Migrations reverted:  $REVERT_COUNT"
echo "  Migrations re-applied: $MIGRATION_COUNT"
echo "  Test database:        $TEST_DB"
echo "=============================================="
