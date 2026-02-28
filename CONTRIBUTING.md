````markdown
# Contributing to Chioma

Thank you for your interest in contributing to Chioma! We welcome contributions from the community to help make rental payments transparent, low-cost, and programmable.

## Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
  - [Backend (NestJS)](#backend-nestjs)
  - [Frontend (Next.js)](#frontend-nextjs)
  - [Smart Contracts (Soroban)](#smart-contracts-soroban)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)

## Introduction

Chioma is an open-source platform on the Stellar blockchain connecting landlords, agents, and tenants. It uses a hybrid architecture with on-chain settlement and off-chain business logic.

## Prerequisites

Ensure you have the following installed:

-   **Node.js** (v20+ recommended)
-   **pnpm** (v9+ recommended)
-   **Rust** (latest stable)
-   **Soroban CLI** (latest version compatible with Stellar network)
-   **Docker** (optional, for running local databases)

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/caxtonacollins/chioma.git
    cd chioma
    ```

2.  **Install dependencies**:
    Navigate to the backend and frontend directories and run:
    ```bash
    cd backend && pnpm install
    cd ../frontend && pnpm install
    ```

3.  **Set up Environment Variables**:
    -   **Backend**: Copy `.env.example` to `.env` in `backend/` and configure your database and Stellar credentials.
    -   **Frontend**: Copy `.env.example` (if available) or create `.env.local` in `frontend/` with necessary API endpoints.

## Development Workflow

### Backend (NestJS)

Located in `backend/`.

-   **Run in development mode**:
    ```bash
    cd backend
    pnpm start:dev
    ```
-   **Run tests**:
    ```bash
    pnpm test
    ```
-   **Lint code**:
    ```bash
    pnpm lint
    ```

### Frontend (Next.js)

Located in `frontend/`.

-   **Run in development mode**:
    ```bash
    cd frontend
    pnpm dev
    ```
-   **Build for production**:
    ```bash
    pnpm build
    ```
-   **Lint code**:
    ```bash
    pnpm lint
    ```

### Smart Contracts (Soroban)

Located in `contract/`.

-   **Build contracts**:
    ```bash
    cd contract
    cargo build
    ```
-   **Run tests**:
    ```bash
    cargo test
    ```
-   **Format code**:
    ```bash
    cargo fmt
    ```

## Code Style

-   **JavaScript/TypeScript**: We use **Prettier** and **ESLint**. Run `pnpm format` or `pnpm lint` before committing.
-   **Rust**: We use **Rustfmt**. Run `cargo fmt` before committing.

## Pull Request Process

1.  Fork the repository and creating a new branch for your feature or fix.
2.  Ensure all tests pass locally.
3.  Submit a Pull Request (PR) with a clear description of your changes.
4.  Link any relevant issues in your PR description.
5.  Wait for review and address any feedback.

Thank you for contributing to Chioma!

## Local pipeline checks

You can run the same checks that our CI/CD uses locally before opening a pull request. Each sub-project includes a `check-all.sh` helper that runs formatting, linting, building, and tests.

- Frontend: Run the script from the repository root or the `frontend` folder:

  - File: [frontend/check-all.sh](frontend/check-all.sh)

  ```bash
  ./frontend/check-all.sh
  ```

- Backend: Run the script from the repository root or the `backend` folder:

  - File: [backend/check-all.sh](backend/check-all.sh)

  ```bash
  ./backend/check-all.sh
  ```

- Contracts: Run the script from the repository root or the `contract` folder:

  - File: [contract/check-all.sh](contract/check-all.sh)

  ```bash
  ./contract/check-all.sh
  ```

Each script exits immediately on error (`set -e`) so any failing step will stop the run and return a non-zero exit code. Use these scripts to validate your changes locally and reduce CI iteration.

````
