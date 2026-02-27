.PHONY: help install clean lint format format-check typecheck test test-unit test-cov test-e2e build security-lint security-test all ci pre-commit

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ Help

help: ## Display this help message
	@echo "$(BLUE)Backend CI/CD Validation Makefile$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	pnpm install --frozen-lockfile
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

clean: ## Clean build artifacts and dependencies
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf dist coverage node_modules
	@echo "$(GREEN)✓ Clean complete$(NC)"

##@ Code Quality

lint: ## Run ESLint
	@echo "$(BLUE)Running ESLint...$(NC)"
	pnpm run lint
	@echo "$(GREEN)✓ Linting passed$(NC)"

format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	pnpm run format
	@echo "$(GREEN)✓ Code formatted$(NC)"

format-check: ## Check code formatting without modifying files
	@echo "$(BLUE)Checking code formatting...$(NC)"
	npx prettier --check "src/**/*.ts" "test/**/*.ts"
	@echo "$(GREEN)✓ Format check passed$(NC)"

typecheck: ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript type checking...$(NC)"
	npx tsc --noEmit
	@echo "$(GREEN)✓ Type checking passed$(NC)"

##@ Testing

test: ## Run all unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	pnpm run test --ci --forceExit
	@echo "$(GREEN)✓ Unit tests passed$(NC)"

test-unit: test ## Alias for test

test-cov: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	pnpm run test:cov --ci --forceExit
	@echo "$(GREEN)✓ Coverage report generated$(NC)"
	@echo "$(YELLOW)Coverage report available at: coverage/lcov-report/index.html$(NC)"

test-e2e: ## Run end-to-end tests (requires PostgreSQL)
	@echo "$(BLUE)Running E2E tests...$(NC)"
	@echo "$(YELLOW)Note: Ensure PostgreSQL is running and environment variables are set$(NC)"
	pnpm run test:e2e --forceExit
	@echo "$(GREEN)✓ E2E tests passed$(NC)"

##@ Build

build: ## Build the application
	@echo "$(BLUE)Building application...$(NC)"
	pnpm run build
	@echo "$(GREEN)✓ Build successful$(NC)"

##@ Security

security-lint: ## Run security-focused linting
	@echo "$(BLUE)Running security linting...$(NC)"
	pnpm exec eslint \
		--rule "prettier/prettier: off" \
		--rule "@typescript-eslint/require-await: off" \
		--rule "@typescript-eslint/await-thenable: off" \
		--rule "@typescript-eslint/no-unused-vars: off" \
		--ignore-pattern "**/*.spec.ts" \
		--ignore-pattern "**/*.e2e-spec.ts" \
		--ignore-pattern "**/__tests__/**" \
		"src/common/middleware/csrf.middleware.ts" \
		"src/common/middleware/request-size-limit.middleware.ts" \
		"src/common/middleware/security-headers.middleware.ts" \
		"src/common/pipes/sanitize.pipe.ts" \
		"src/common/interceptors/rate-limit.interceptor.ts" \
		"src/modules/auth/**/*.ts" \
		"src/modules/security/**/*.ts" \
		"src/main.ts" \
		"src/app.module.ts"
	@echo "$(GREEN)✓ Security linting passed$(NC)"

security-test: ## Run security smoke tests
	@echo "$(BLUE)Running security smoke tests...$(NC)"
	pnpm exec jest --runInBand "src/common/__tests__/security-smoke.spec.ts"
	@echo "$(GREEN)✓ Security tests passed$(NC)"

##@ CI/CD Pipeline Validation

pre-commit: format-check lint typecheck test ## Run pre-commit checks (format, lint, typecheck, test)
	@echo "$(GREEN)✓ All pre-commit checks passed$(NC)"

ci: install format-check lint typecheck test-cov build ## Run full CI pipeline (matches backend-ci-cd.yml)
	@echo "$(GREEN)✓ Full CI pipeline passed$(NC)"

security-ci: install security-lint security-test build ## Run security CI pipeline (matches backend-security-ci-cd.yml)
	@echo "$(GREEN)✓ Security CI pipeline passed$(NC)"

test-ci: install test-unit test-cov ## Run test pipeline (matches backend-tests.yml unit tests)
	@echo "$(GREEN)✓ Test CI pipeline passed$(NC)"

all: ci security-ci ## Run all CI/CD pipelines
	@echo ""
	@echo "$(GREEN)═══════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)✓ ALL BACKEND WORKFLOWS AND PIPELINES PASSED SUCCESSFULLY$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(BLUE)Summary:$(NC)"
	@echo "  • Code formatting: $(GREEN)✓$(NC)"
	@echo "  • Linting: $(GREEN)✓$(NC)"
	@echo "  • Type checking: $(GREEN)✓$(NC)"
	@echo "  • Unit tests: $(GREEN)✓$(NC)"
	@echo "  • Coverage report: $(GREEN)✓$(NC)"
	@echo "  • Security checks: $(GREEN)✓$(NC)"
	@echo "  • Build: $(GREEN)✓$(NC)"
	@echo ""

##@ Additional Utilities

openapi: ## Generate OpenAPI specification
	@echo "$(BLUE)Generating OpenAPI specification...$(NC)"
	pnpm run openapi:generate
	@echo "$(GREEN)✓ OpenAPI spec generated$(NC)"

perf: ## Run performance benchmarks
	@echo "$(BLUE)Running performance benchmarks...$(NC)"
	pnpm run perf
	@echo "$(GREEN)✓ Performance benchmarks complete$(NC)"

sdk: ## Generate SDK
	@echo "$(BLUE)Generating SDK...$(NC)"
	pnpm run sdk:generate
	@echo "$(GREEN)✓ SDK generated$(NC)"
