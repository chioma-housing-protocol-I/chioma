# Chioma Frontend Pipeline Checks Makefile
# Use this to run all frontend pipeline checks locally before creating a PR

.PHONY: help check lint format test build clean install setup

# Default target
help:
	@echo "Chioma Frontend Pipeline Checks"
	@echo "================================"
	@echo ""
	@echo "Available targets:"
	@echo "  check     - Run all frontend pipeline checks (lint, format, test, build)"
	@echo "  lint      - Run ESLint checks"
	@echo "  format    - Check Prettier formatting"
	@echo "  test      - Run unit and E2E tests"
	@echo "  build     - Create production build"
	@echo "  clean     - Clean dependencies and build artifacts"
	@echo "  install   - Install dependencies"
	@echo "  setup     - Install and setup development environment"
	@echo ""
	@echo "Usage examples:"
	@echo "  make check     # Run all checks (recommended before PR)"
	@echo "  make lint      # Run only linting"
	@echo "  make build     # Only build the project"

# Check if pnpm is available
check-pnpm:
	@if ! command -v pnpm >/dev/null 2>&1; then \
		echo "❌ pnpm is not installed. Please install pnpm first."; \
		echo "   npm install -g pnpm"; \
		exit 1; \
	fi
	@echo "✅ pnpm is available"

# Install dependencies (mirrors pipeline step)
install: check-pnpm
	@echo "📦 Installing dependencies..."
	pnpm install --frozen-lockfile
	@echo "✅ Dependencies installed"

# Run ESLint (mirrors lint-and-format job)
lint: install
	@echo "🔍 Running ESLint..."
	pnpm run lint
	@echo "✅ ESLint passed"

# Check Prettier formatting (mirrors lint-and-format job)
format: install
	@echo "📝 Checking Prettier formatting..."
	@if pnpm list prettier --depth=0 | grep -q "prettier"; then \
		pnpm exec prettier --check "**/*.{js,jsx,ts,tsx,json,css,md}"; \
		echo "✅ Prettier formatting check passed"; \
	else \
		echo "ℹ️  Prettier not installed, skipping formatting check"; \
	fi

# Run tests (mirrors test job)
test: install
	@echo "🧪 Running tests..."
	@echo "Running unit tests..."
	@if pnpm list jest --depth=0 | grep -q "jest"; then \
		pnpm test -- --coverage; \
		echo "✅ Unit tests passed"; \
	else \
		echo "ℹ️  Jest not installed, skipping unit tests"; \
	fi
	@echo "Running E2E tests..."
	@if pnpm list cypress --depth=0 | grep -q "cypress"; then \
		pnpm run test:e2e; \
		echo "✅ E2E tests passed"; \
	else \
		echo "ℹ️  Cypress not installed, skipping E2E tests"; \
	fi

# Create production build (mirrors build job)
build: install
	@echo "🏗️  Creating production build..."
	pnpm run build
	@echo "✅ Build completed successfully"

# Clean dependencies and build artifacts
clean:
	@echo "🧹 Cleaning frontend..."
	rm -rf node_modules
	rm -rf .next
	rm -rf dist
	rm -rf coverage
	@echo "✅ Frontend cleaned"

# Run all frontend pipeline checks in order (mirrors the complete CI/CD pipeline)
check: lint format test build
	@echo ""
	@echo "🎉 All frontend pipeline checks passed!"
	@echo "   Your PR should pass the CI/CD pipeline checks."
	@echo ""
	@echo "📋 Summary:"
	@echo "   ✅ ESLint checks"
	@echo "   ✅ Prettier formatting"
	@echo "   ✅ Unit tests (if available)"
	@echo "   ✅ E2E tests (if available)"
	@echo "   ✅ Production build"

# Quick check for development ( skips time-consuming tests)
check-quick: lint format build
	@echo ""
	@echo "🚀 Quick frontend checks passed!"
	@echo "   (Tests skipped - use 'make check' for full validation)"

# Install and setup development environment
setup: check-pnpm
	@echo "⚙️  Setting up frontend development environment..."
	pnpm install
	@echo "✅ Frontend setup complete"
	@echo ""
	@echo "🎯 Next steps:"
	@echo "   make check    # Run all pipeline checks"
	@echo "   make dev       # Start development server"
