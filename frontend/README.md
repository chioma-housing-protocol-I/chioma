This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Map Feature

The interactive map feature uses **Leaflet with OpenStreetMap** - **no API key required!**

- ✅ 100% free
- ✅ No setup needed
- ✅ Works immediately
- ✅ No usage limits

See [LEAFLET_SETUP.md](./LEAFLET_SETUP.md) for more details.

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Pipeline Validation with Makefile

### Frontend Pipeline Checks

The frontend includes a Makefile to run all CI/CD pipeline checks locally before creating a PR. This ensures your code will pass the GitHub Actions pipeline.

#### Quick Start

```bash
# Run all frontend pipeline checks (recommended before PR)
make check

# Quick check without tests (faster for development)
make check-quick

# Get help with all available commands
make help
```

#### Available Frontend Commands

```bash
# Main pipeline commands
make check          # Run all checks: lint, format, test, build
make check-quick    # Quick version: lint, format, build (no tests)

# Individual checks
make lint           # Run ESLint checks
make format         # Check Prettier formatting
make test           # Run unit and E2E tests (if available)
make build          # Create production build

# Setup and maintenance
make install        # Install dependencies with frozen lockfile
make clean          # Clean node_modules and build artifacts
make setup          # Initial development environment setup
```

#### Pipeline Workflow

The Makefile mirrors the GitHub Actions workflow in `.github/workflows/frontend-ci-cd.yml`:

1. **Linting & Formatting** - ESLint and Prettier checks
2. **Testing** - Unit tests (Jest) and E2E tests (Cypress) if installed
3. **Build** - Production build verification

### Backend Pipeline Checks

The backend also includes a comprehensive Makefile for CI/CD validation.

#### Backend Quick Start

```bash
cd ../backend

# Run full CI pipeline (matches GitHub Actions)
make ci

# Run all backend workflows (CI + security)
make all

# Get help with all available commands
make help
```

#### Key Backend Commands

```bash
# Main pipeline commands
make ci              # Full CI pipeline: install, format-check, lint, typecheck, test-cov, build
make security-ci     # Security pipeline: install, security-lint, security-test, build
make all             # Run all CI/CD pipelines

# Individual checks
make lint            # Run ESLint
make format-check    # Check Prettier formatting
make typecheck       # TypeScript type checking
make test            # Run unit tests
make test-cov        # Run tests with coverage
make test-e2e        # Run E2E tests (requires PostgreSQL)
make build           # Build the application

# Pre-commit workflow
make pre-commit      # Run format-check, lint, typecheck, test
```

### Before Creating a PR

Run these commands to ensure your PR will pass all pipeline checks:

```bash
# Frontend checks
cd frontend
make check
```

The makefile is designed to replicate the exact same checks that run in GitHub Actions, giving you confidence that your PR will pass the CI/CD pipeline.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
