# Contributor Guidelines

Welcome to the Chioma project! This document provides comprehensive guidelines for contributing to the Chioma platform — an open-source rental payment platform built on the Stellar blockchain.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Contribution Workflow](#contribution-workflow)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)
- [Review Guidelines](#review-guidelines)
- [Community and Communication](#community-and-communication)

---

## Code of Conduct

All contributors must adhere to our Code of Conduct:

- **Be respectful and constructive** in reviews and discussions
- **Welcome newcomers** and help them get started
- **Assume positive intent** and give the benefit of the doubt
- **Focus on code quality**, not personal preferences
- **Report harassment** or inappropriate behavior to security@chioma.dev

Violations may result in temporary or permanent exclusion from the project.

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Git** — Version control
- **Node.js** — v18 or later (backend/frontend)
- **pnpm** — v8 or later (package manager)
- **Rust** — Latest stable (smart contracts)
- **Docker** — For local services (PostgreSQL, Redis, monitoring)
- **PostgreSQL** — 14+ (can run via Docker)
- **Redis** — 7+ (can run via Docker)

### First Steps

1. **Read the project documentation**
   - [Root README](../README.md) — Project overview
   - [Quickstart Guide](../QUICKSTART.md) — Get the full stack running
   - [Backend README](../backend/README.md) — Backend-specific setup
   - [Frontend README](../frontend/README.md) — Frontend-specific setup
   - [Contract README](../contract/README.md) — Smart contract setup

2. **Set up your development environment** (see [Development Environment Setup](#development-environment-setup))

3. **Find an issue to work on**
   - Browse [open issues](https://github.com/yourusername/chioma/issues)
   - Look for `good-first-issue` labels for newcomer-friendly tasks
   - Comment on the issue to claim it before starting work

4. **Join the community**
   - Telegram: https://t.me/chiomagroup
   - Introduce yourself and ask questions

---

## Development Environment Setup

### Full Stack Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/chioma.git
cd chioma

# 2. Install dependencies (all workspaces)
pnpm install

# 3. Set up environment files
cp backend/.env.example backend/.env.development
cp frontend/.env.example frontend/.env.local
cp contract/.env.testnet.example contract/.env.testnet

# 4. Configure environment variables
# Edit the .env files with your local settings
# See individual READMEs for required variables

# 5. Start infrastructure services (PostgreSQL, Redis, Monitoring)
cd backend
docker-compose up -d

# 6. Run database migrations and seed data
pnpm run migration:run
pnpm run seed:admin
pnpm run seed:agent
pnpm run seed:tenant
pnpm run seed:landlord

# 7. Start the backend development server
pnpm run start:dev

# 8. In a new terminal, start the frontend
cd ../frontend
pnpm run dev
```

**Access Points:**
- Backend API: http://localhost:5000
- Swagger UI: http://localhost:5000/api/docs
- Frontend: http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

### Component-Specific Setup

**Backend Only:**
```bash
cd backend
pnpm install
cp .env.example .env.development
docker-compose up -d
pnpm run migration:run
pnpm run seed:admin
pnpm run start:dev
```

**Frontend Only:**
```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm run dev
```

**Smart Contracts:**
```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/chioma.wasm \
  --network testnet
```

See [contract/README.md](../contract/README.md) for detailed Stellar contract setup.

---

## Project Structure

```
chioma/
├── backend/              # NestJS REST API
│   ├── src/
│   │   ├── modules/      # Feature modules (auth, properties, payments, etc.)
│   │   ├── common/       # Shared utilities, guards, decorators
│   │   ├── database/     # TypeORM config, migrations
│   │   └── main.ts       # Application entry point
│   ├── test/             # E2E and integration tests
│   ├── docs/             # Backend documentation
│   └── migrations/       # Database migrations
│
├── frontend/             # Next.js 14+ React application
│   ├── app/              # App router pages
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utilities, API clients, hooks
│   └── public/           # Static assets
│
├── contract/             # Stellar/Soroban smart contracts
│   ├── contracts/        # Contract source code (Rust)
│   │   ├── chioma/       # Main rental contract
│   │   ├── agent_registry/ # Agent management
│   │   └── ...           # Other contracts
│   ├── tests/            # Contract unit tests
│   └── docs/             # Contract documentation
│
├── .github/              # GitHub Actions workflows, issue templates
├── docs/                 # Root-level documentation
└── README.md             # Root README
```

### Module Boundaries

- **Backend modules** are domain-scoped (e.g., `auth`, `properties`, `payments`). No circular dependencies allowed.
- **Frontend components** follow a structured convention (see [Frontend Component Conventions](#frontend-component-conventions)).
- **Smart contracts** are independent Rust crates with clear ABIs.

---

## Contribution Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/chioma.git
cd chioma
git remote add upstream https://github.com/chiomaproject/chioma.git
```

### 2. Create a Feature Branch

```bash
# Sync with upstream
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feat/your-feature-name
```

**Branch Naming Convention:**
- `feat/<short-description>` — New features
- `fix/<short-description>` — Bug fixes
- `docs/<short-description>` — Documentation updates
- `refactor/<short-description>` — Code refactoring
- `test/<short-description>` — Test additions or updates
- `chore/<short-description>` — Build, CI, or tooling changes

Examples:
- `feat/property-search-filters`
- `fix/1234-payment-timeout`
- `docs/api-authentication`

### 3. Make Your Changes

- Follow the [Coding Standards](#coding-standards)
- Write or update tests for your changes
- Update relevant documentation
- Ensure all CI checks pass locally

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat(properties): add search filters for location and price"
```

See [Commit Convention](#commit-convention) for commit message rules.

### 5. Push and Open a Pull Request

```bash
git push origin feat/your-feature-name
```

Open a PR on GitHub:
- Use a clear, descriptive title
- Fill out the PR template completely
- Link related issues with `Fixes #123` or `Closes #456`
- Request reviews from relevant maintainers

### 6. Address Review Feedback

- Respond to all review comments
- Make requested changes and push updates
- Re-request review after addressing feedback
- Be patient and respectful during the review process

### 7. Merge

Once approved:
- Maintainers will merge your PR
- Celebrate your contribution! 🎉

---

## Coding Standards

### General Principles

- **Readability over cleverness** — Code should be easy to understand
- **Consistency** — Follow existing patterns in the codebase
- **Simplicity** — Avoid premature optimization and over-engineering
- **Testability** — Write code that's easy to test
- **Security** — Follow security best practices (see [Security Best Practices](../backend/docs/security/SECURITY_BEST_PRACTICES.md))

### TypeScript/JavaScript (Backend & Frontend)

**Style Guide:**
- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Prefer **functional programming** patterns where appropriate
- Use **explicit types** (avoid `any`)
- Prefer **named exports** over default exports

**Naming Conventions:**
- **Variables/functions**: `camelCase`
- **Classes/interfaces/types**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.ts` or `PascalCase.tsx` (React components)

**Example:**
```typescript
// ✅ Good
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

export function getUserProfile(userId: string): Promise<UserProfile> {
  return userRepository.findById(userId);
}

// ❌ Bad
export default function (id: any) {
  return repo.find(id);
}
```

### Backend-Specific Standards

**Module Structure:**
```
src/modules/feature-name/
├── dto/                    # Data Transfer Objects
│   ├── create-feature.dto.ts
│   └── update-feature.dto.ts
├── entities/               # TypeORM entities
│   └── feature.entity.ts
├── feature.controller.ts   # HTTP controller
├── feature.service.ts      # Business logic
├── feature.module.ts       # NestJS module
└── feature.service.spec.ts # Unit tests
```

**NestJS Conventions:**
- Use **dependency injection** for all services
- Use **DTOs** with `class-validator` decorators for validation
- Use **Swagger decorators** (`@ApiProperty`, `@ApiOperation`) for API documentation
- Use **guards** for authorization
- Use **interceptors** for cross-cutting concerns (logging, caching)

**Example:**
```typescript
@Controller('properties')
@UseGuards(JwtAuthGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new property listing' })
  @ApiResponse({ status: 201, type: PropertyResponseDto })
  async create(
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentUser() user: User,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.create(createPropertyDto, user);
  }
}
```

### Frontend Component Conventions

**Component Structure:**
```
components/
├── ui/                     # Generic reusable components (buttons, inputs)
├── features/               # Feature-specific components
│   ├── properties/
│   │   ├── PropertyCard.tsx
│   │   └── PropertySearchFilters.tsx
│   └── auth/
│       └── LoginForm.tsx
└── layouts/                # Layout components
```

**React Best Practices:**
- Use **functional components** with hooks
- Use **TypeScript interfaces** for props
- Prefer **composition** over inheritance
- Use **Server Components** by default in Next.js 14+
- Mark Client Components explicitly with `'use client'`
- Use **Tailwind CSS** for styling
- Use **Shadcn UI** for base components

**Example:**
```typescript
// ✅ Good - Server Component
interface PropertyCardProps {
  property: Property;
  onFavorite?: (id: string) => void;
}

export function PropertyCard({ property, onFavorite }: PropertyCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold">{property.title}</h3>
      <p className="text-gray-600">{property.description}</p>
    </div>
  );
}

// ❌ Bad
export default function Card(props: any) {
  return <div>{props.data.map(x => <span>{x}</span>)}</div>;
}
```

### Rust (Smart Contracts)

**Style Guide:**
- Follow **Rust standard style** (`cargo fmt`)
- Run **Clippy** for linting (`cargo clippy`)
- Use **descriptive names** for functions and variables
- Add **doc comments** (`///`) for public APIs
- Keep functions **small and focused**

**Example:**
```rust
/// Creates a new rental agreement on-chain
/// 
/// # Arguments
/// * `env` - The contract environment
/// * `landlord` - Landlord's Stellar address
/// * `tenant` - Tenant's Stellar address
/// * `monthly_rent` - Rent amount in stroops
pub fn create_agreement(
    env: Env,
    landlord: Address,
    tenant: Address,
    monthly_rent: i128,
) -> Result<AgreementId, Error> {
    // Implementation
}
```

### Formatting and Linting

**Before committing:**
```bash
# Backend
cd backend
pnpm run lint          # ESLint
pnpm run format        # Prettier

# Frontend
cd frontend
pnpm run lint
pnpm run format

# Contracts
cd contract
cargo fmt
cargo clippy
```

Pre-commit hooks (via Husky) automatically run formatting and linting checks.

---

## Commit Convention

Chioma uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by **commitlint**.

### Format

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer>
```

### Types

| Type       | Description                                      |
| ---------- | ------------------------------------------------ |
| `feat`     | New feature                                      |
| `fix`      | Bug fix                                          |
| `docs`     | Documentation changes                            |
| `style`    | Code style (formatting, whitespace, no logic)    |
| `refactor` | Code refactoring (no feature change)             |
| `perf`     | Performance improvements                         |
| `test`     | Add or update tests                              |
| `build`    | Build system or dependency changes               |
| `ci`       | CI/CD configuration changes                      |
| `chore`    | Other changes (tooling, config, etc.)            |
| `revert`   | Revert a previous commit                         |

### Scopes (Examples)

- `auth` — Authentication module
- `properties` — Property listings
- `payments` — Payment processing
- `contract` — Smart contracts
- `frontend` — Frontend-specific
- `backend` — Backend-specific
- `ci` — CI/CD pipelines

### Examples

```bash
# ✅ Good
feat(properties): add geolocation search filters
fix(auth): resolve token expiration edge case
docs(api): update authentication endpoint examples
refactor(payments): extract payment validation logic
test(contracts): add unit tests for escrow release

# ❌ Bad
added some stuff
Fix bug
Update code
WIP
```

### Rules

- **Subject line**: 50 characters or less, lowercase, no period
- **Body**: Optional detailed description (wrap at 72 characters)
- **Footer**: Optional `Fixes #123`, `Closes #456`, `BREAKING CHANGE:`

**Breaking Changes:**
```
feat(api)!: change payment response format

BREAKING CHANGE: Payment API now returns `processedAt` instead of `completedAt`
```

---

## Testing Requirements

### Backend Testing

**Test Types:**
- **Unit tests** — Test individual functions/methods (Jest)
- **Integration tests** — Test module interactions (Jest)
- **E2E tests** — Test full request/response flows (Supertest)

**Coverage Requirements:**
- **Minimum**: 70% code coverage
- **Critical paths** (auth, payments, blockchain): 90%+ coverage

**Running Tests:**
```bash
cd backend
pnpm run test              # Unit tests
pnpm run test:cov          # With coverage report
pnpm run test:e2e          # E2E tests
pnpm run test:mutation     # Mutation testing (Stryker)
```

**Example Test:**
```typescript
describe('PropertiesService', () => {
  let service: PropertiesService;
  let repository: MockRepository<Property>;

  beforeEach(() => {
    // Setup
  });

  describe('create', () => {
    it('should create a new property listing', async () => {
      const dto: CreatePropertyDto = { /* ... */ };
      const user = { id: 'user-id', role: UserRole.ADMIN };
      
      const result = await service.create(dto, user);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(dto.title);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const dto: CreatePropertyDto = { /* ... */ };
      const user = { id: 'user-id', role: UserRole.USER };
      
      await expect(service.create(dto, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
```

### Frontend Testing

**Test Types:**
- **Component tests** — Test UI components (React Testing Library)
- **Integration tests** — Test page flows (Playwright)

**Running Tests:**
```bash
cd frontend
pnpm run test              # Component tests
pnpm run test:e2e          # E2E tests
```

**Example Test:**
```typescript
import { render, screen } from '@testing-library/react';
import { PropertyCard } from './PropertyCard';

describe('PropertyCard', () => {
  const mockProperty = {
    id: '1',
    title: 'Cozy Apartment',
    monthlyRent: 1200,
  };

  it('renders property title', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('Cozy Apartment')).toBeInTheDocument();
  });

  it('displays rent amount', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('$1,200/month')).toBeInTheDocument();
  });
});
```

### Smart Contract Testing

**Running Tests:**
```bash
cd contract
cargo test
cargo test --package chioma-contract
```

**Example Test:**
```rust
#[test]
fn test_create_agreement() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ChiomaContract);
    let client = ChiomaContractClient::new(&env, &contract_id);

    let landlord = Address::random(&env);
    let tenant = Address::random(&env);
    let monthly_rent = 100_000_000; // 10 XLM in stroops

    let agreement_id = client.create_agreement(&landlord, &tenant, &monthly_rent);
    assert!(agreement_id > 0);
}
```

---

## Documentation Standards

### Code Documentation

**TypeScript/JavaScript:**
- Use **JSDoc comments** for public APIs
- Document complex logic with inline comments
- Keep comments up-to-date with code changes

```typescript
/**
 * Retrieves a user's payment history
 * 
 * @param userId - The unique user identifier
 * @param options - Pagination and filter options
 * @returns Paginated list of payments
 * @throws {NotFoundException} If user is not found
 */
export async function getUserPayments(
  userId: string,
  options: PaginationOptions,
): Promise<PaginatedResponse<Payment>> {
  // Implementation
}
```

**Rust:**
- Use **doc comments** (`///`) for public functions
- Include examples in doc comments where helpful

```rust
/// Creates a new rental agreement
///
/// # Arguments
/// * `landlord` - Landlord's Stellar address
/// * `tenant` - Tenant's Stellar address
///
/// # Examples
/// ```
/// let agreement = create_agreement(landlord_addr, tenant_addr, 1000);
/// ```
pub fn create_agreement(landlord: Address, tenant: Address, rent: i128) -> Agreement {
    // Implementation
}
```

### Documentation Files

**When to Update Docs:**
- New feature added → Update relevant docs
- API changes → Update API documentation
- Architecture changes → Update architecture docs or add ADR
- Bug fix with user impact → Update changelog

**Documentation Locations:**
- `docs/` — Root-level documentation
- `backend/docs/` — Backend-specific docs
- `frontend/docs/` — Frontend-specific docs (if applicable)
- `contract/docs/` — Smart contract docs

**Required Documentation for New Features:**
- API endpoints → Update OpenAPI/Swagger annotations
- Database changes → Update schema documentation
- New modules → Add README in module directory
- Configuration changes → Update environment variable docs

---

## Pull Request Process

### Before Opening a PR

**Checklist:**
- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Commit messages follow convention
- [ ] Branch is up-to-date with `main`

### PR Template

Fill out the PR template completely:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issue
Fixes #123

## Changes Made
- Added search filters for properties
- Updated property listing API to support filtering
- Added unit tests for filter logic

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
(Add screenshots for UI changes)

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing tests pass locally
```

### Contract-Specific PRs

PRs touching `contract/**` must:
- Use the contract PR template: `?template=contract.md`
- Complete the [contract readiness checklist](../contract/docs/deployment/READINESS_CHECKLIST.md)
- Include test coverage for all new contract functions
- Document ABI changes

### Review Process

1. **Automated Checks** — CI runs linting, tests, builds
2. **Code Review** — At least one maintainer reviews
3. **Changes Requested** — Address feedback, push updates
4. **Approval** — Maintainer approves PR
5. **Merge** — Maintainer merges (squash or merge commit)

**Review Turnaround:**
- Small PRs (<100 lines): 1-2 days
- Medium PRs (100-500 lines): 2-4 days
- Large PRs (>500 lines): 4-7 days

---

## Review Guidelines

### For Reviewers

**What to Look For:**
- **Correctness** — Does the code solve the problem?
- **Readability** — Is the code easy to understand?
- **Security** — Are there security implications?
- **Performance** — Will this scale?
- **Tests** — Are changes adequately tested?
- **Documentation** — Is documentation updated?

**Review Etiquette:**
- Be kind and constructive
- Explain your reasoning
- Suggest alternatives when requesting changes
- Approve promptly if the code looks good

**Example Comments:**
```
✅ "Nice work! This is a clean solution."

✅ "Consider extracting this logic into a separate function for reusability."

✅ "This query could cause N+1 issues. Can we eager load the relation?"

❌ "This is terrible."

❌ "Why would you do this?"
```

### For Authors

**Responding to Reviews:**
- **Thank reviewers** for their time
- **Ask clarifying questions** if feedback is unclear
- **Explain your approach** if there's disagreement
- **Make requested changes** or discuss alternatives
- **Re-request review** after addressing feedback

---

## Community and Communication

### Communication Channels

- **GitHub Issues** — Bug reports, feature requests, discussions
- **GitHub Discussions** — General questions, ideas, announcements
- **Telegram** — Real-time chat: https://t.me/chiomagroup
- **Email** — security@chioma.dev (security issues only)

### Getting Help

**Stuck on something?**
1. Check the documentation
2. Search existing issues and discussions
3. Ask in Telegram
4. Open a GitHub discussion

**Found a bug?**
1. Check if it's already reported
2. Open a new issue with reproduction steps

**Have a feature idea?**
1. Check if it's already requested
2. Open a feature request issue
3. Discuss in Telegram to gauge interest

### Reporting Security Issues

**Do NOT open public issues for security vulnerabilities.**

Report privately:
- GitHub Security tab → "Report a vulnerability"
- Email: security@chioma.dev

See [SECURITY.md](../SECURITY.md) for full details.

---

## Recognition

Contributors are recognized in:
- **README** — Contributors section
- **Release notes** — Credited for changes
- **GitHub** — Listed in contributors

Significant contributions may result in maintainer privileges.

---

## Questions?

If you have questions about contributing:
- Join our Telegram: https://t.me/chiomagroup
- Open a GitHub discussion
- Review existing documentation

Thank you for contributing to Chioma! 🎉

---

**Last Updated:** 2025-01-17
