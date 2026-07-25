# Chioma Frontend CI/CD Pipeline Makefile
# Mirrors the frontend-ci-cd.yml GitHub Actions workflow
# Use this to run all frontend pipeline checks locally before creating a PR

.PHONY: help check-pnpm install audit lint format format-check test build clean setup ci pre-commit

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

##@ Help

help:
	@echo "$(BLUE)Chioma Frontend CI/CD Pipeline$(NC)"
	@echo "$(BLUE)================================$(NC)"
	@echo ""
	@echo "$(YELLOW)Main Targets (matches frontend-ci-cd.yml):$(NC)"
	@echo "  $(GREEN)ci$(NC)              - Run full CI pipeline (install → audit → format-check → test → build)"
	@echo "  $(GREEN)pre-commit$(NC)      - Run pre-commit checks (format-check → test)"
	@echo ""
	@echo "$(YELLOW)Individual Pipeline Steps:$(NC)"
	@echo "  $(GREEN)install$(NC)         - Install dependencies with frozen lockfile"
	@echo "  $(GREEN)audit$(NC)           - Run npm audit for security vulnerabilities"
	@echo "  $(GREEN)lint$(NC)            - Run ESLint checks"
	@echo "  $(GREEN)format$(NC)          - Format code with Prettier"
	@echo "  $(GREEN)format-check$(NC)    - Check Prettier formatting without modifying"
	@echo "  $(GREEN)test$(NC)            - Run unit tests"
	@echo "  $(GREEN)build$(NC)           - Create production build"
	@echo ""
	@echo "$(YELLOW)Utility Targets:$(NC)"
	@echo "  $(GREEN)clean$(NC)           - Clean dependencies and build artifacts"
	@echo "  $(GREEN)setup$(NC)           - Install and setup development environment"
	@echo ""
	@echo "$(YELLOW)Usage examples:$(NC)"
	@echo "  make ci              # Run full pipeline (recommended before PR)"
	@echo "  make pre-commit      # Quick pre-commit checks"
	@echo "  make build           # Only build the project"
	@echo ""

##@ Setup

check-pnpm:
	@if ! command -v pnpm >/dev/null 2>&1; then \
		echo "$(RED)❌ pnpm is not installed. Please install pnpm first.$(NC)"; \
		echo "   npm install -g pnpm"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ pnpm is available$(NC)"

install: check-pnpm
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	pnpm install --frozen-lockfile
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

##@ Code Quality

audit: install
	@echo "$(BLUE)� Running npm audit...$(NC)"
	pnpm audit --audit-level=critical
	@echo "$(GREEN)✅ Audit passed$(NC)"

lint: install
	@echo "$(BLUE)� Running ESLint...$(NC)"
	@pnpm run lint || echo "$(YELLOW)⚠️  ESLint warnings found (see above)$(NC)"
	@echo "$(GREEN)✅ ESLint check complete$(NC)"

format: install
	@echo "$(BLUE)📝 Formatting code with Prettier...$(NC)"
	pnpm exec prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}" --ignore-path .gitignore
	@echo "$(GREEN)✅ Code formatted$(NC)"

format-check: install
	@echo "$(BLUE)📝 Checking Prettier formatting...$(NC)"
	pnpm exec prettier --check "**/*.{js,jsx,ts,tsx,json,css,md}" --ignore-path .gitignore
	@echo "$(GREEN)✅ Prettier formatting check passed$(NC)"

##@ Testing

test: install
	@echo "$(BLUE)🧪 Running unit tests...$(NC)"
	pnpm test --run
	@echo "$(GREEN)✅ Tests passed$(NC)"

##@ Build

build: install
	@echo "$(BLUE)🏗️  Creating production build...$(NC)"
	pnpm run build
	@echo "$(GREEN)✅ Build completed successfully$(NC)"

##@ CI/CD Pipeline Validation

pre-commit: format-check test
	@echo ""
	@echo "$(GREEN)✅ Pre-commit checks passed!$(NC)"
	@echo "   Ready to commit your changes."
	@echo ""

ci: install audit format-check test build
	@echo ""
	@echo "$(GREEN)═══════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)✅ FULL FRONTEND CI PIPELINE PASSED SUCCESSFULLY$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(BLUE)Pipeline Summary:$(NC)"
	@echo "  ✅ Dependencies installed"
	@echo "  ✅ Security audit passed"
	@echo "  ✅ Code formatting verified"
	@echo "  ✅ Unit tests passed"
	@echo "  ✅ Production build successful"
	@echo ""
	@echo "$(YELLOW)Your PR should pass all GitHub Actions checks.$(NC)"
	@echo ""

##@ Utilities

clean:
	@echo "$(BLUE)🧹 Cleaning frontend...$(NC)"
	rm -rf node_modules
	rm -rf .next
	rm -rf dist
	rm -rf coverage
	@echo "$(GREEN)✅ Frontend cleaned$(NC)"

setup: check-pnpm
	@echo "$(BLUE)⚙️  Setting up frontend development environment...$(NC)"
	pnpm install
	@echo "$(GREEN)✅ Frontend setup complete$(NC)"
	@echo ""
	@echo "$(BLUE)🎯 Next steps:$(NC)"
	@echo "  make ci         # Run full CI pipeline"
	@echo "  make pre-commit # Run pre-commit checks"
	@echo ""
