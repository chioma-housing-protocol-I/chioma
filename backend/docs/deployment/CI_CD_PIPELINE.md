# CI/CD Pipeline Documentation

## Overview

The Chioma project uses GitHub Actions for continuous integration and continuous deployment across three main components: Backend (NestJS), Frontend (Next.js), and Smart Contracts (Soroban). This document provides comprehensive guidance on pipeline architecture, stages, build processes, testing, deployment, monitoring, and troubleshooting.

## Pipeline Architecture

### High-Level Flow

```
Code Push → GitHub Actions Trigger
    ↓
Lint & Format Checks
    ↓
Type Checking & Security Audit
    ↓
Unit Tests & Coverage
    ↓
Build Verification
    ↓
Docker Image Build (Backend/Frontend)
    ↓
Push to Container Registry (GHCR)
    ↓
Deploy to Staging (develop branch)
    ↓
Deploy to Production (main branch)
```

### Workflow Files Location

All CI/CD workflows are defined in `.github/workflows/`:

- `backend-ci-cd.yml` - Backend (NestJS) pipeline
- `backend-tests.yml` - Backend continuous testing pipeline (PR/push + every 6 hours)
- `frontend-ci-cd.yml` - Frontend (Next.js) pipeline
- `contract-ci-cd.yml` - Smart Contracts (Soroban) pipeline

## Pipeline Stages

### Stage 1: Code Quality & Linting

**Purpose**: Ensure code follows project standards and best practices

**Backend**:

- ESLint validation
- Prettier formatting check
- TypeScript strict mode compilation

**Frontend**:

- ESLint validation
- Prettier formatting check
- TypeScript strict mode compilation

**Contracts**:

- `cargo fmt --check` - Rust formatting validation
- `cargo clippy` - Rust linter for common mistakes

**Failure Impact**: Pipeline stops; developer must fix and re-push

### Stage 2: Type Checking & Security

**Purpose**: Catch type errors and security vulnerabilities early

**Backend**:

- Full TypeScript compilation with strict settings
- Dependency security audit (`npm audit`)

**Frontend**:

- Full TypeScript compilation with strict settings
- Dependency security audit (`npm audit`)

**Contracts**:

- Cargo build with all features enabled

**Failure Impact**: Pipeline stops; developer must resolve type errors or security issues

### Stage 3: Unit Testing

**Purpose**: Verify business logic correctness

**Backend**:

- Jest test suite execution
- Coverage reporting to Codecov
- Minimum coverage threshold: 70%

**Frontend**:

- Vitest test suite execution
- Coverage reporting

**Contracts**:

- `cargo test` - Rust unit tests
- Test output validation

**Failure Impact**: Pipeline stops; developer must fix failing tests

### Stage 4: Build Verification

**Purpose**: Ensure production build succeeds

**Backend**:

- `npm run build` - NestJS production build
- Validates all dependencies are resolvable
- Checks for unused imports and dead code

**Frontend**:

- `npm run build` - Next.js production build
- Static analysis and optimization
- Validates all pages and components

**Contracts**:

- `cargo build --release` - Optimized Soroban contract build
- Size and performance validation

**Failure Impact**: Pipeline stops; developer must fix build errors

### Stage 5: Docker Image Build & Push

**Purpose**: Create and store container images for deployment

**Backend & Frontend**:

- Build Docker image using Dockerfile
- Tag with commit SHA and branch name
- Push to GitHub Container Registry (GHCR)
- Only runs on main and develop branches

**Image Naming Convention**:

```
ghcr.io/chioma-housing-protocol-i/chioma/backend:latest
ghcr.io/chioma-housing-protocol-i/chioma/backend:main-<commit-sha>
ghcr.io/chioma-housing-protocol-i/chioma/frontend:latest
ghcr.io/chioma-housing-protocol-i/chioma/frontend:main-<commit-sha>
```

**Failure Impact**: Deployment cannot proceed; investigate Docker build logs

### Stage 6: Deployment

**Purpose**: Deploy verified code to staging and production environments

**Staging Deployment**:

- Triggered on: `develop` branch push
- Environment: Staging infrastructure
- Rollback: Manual via GitHub Actions UI
- Health checks: Automated post-deployment verification

**Production Deployment**:

- Triggered on: `main` branch push
- Environment: Production infrastructure
- Approval: Optional manual approval gate (configurable)
- Rollback: Manual via GitHub Actions UI
- Health checks: Automated post-deployment verification

**Deployment Process**:

1. Pull latest Docker image from GHCR
2. Stop running containers
3. Start new containers with updated image
4. Run database migrations (if applicable)
5. Verify service health
6. Update load balancer routing

## Build Process

### Backend Build

**Trigger**: On every push to any branch

**Steps**:

1. Checkout code
2. Setup Node.js (v20.x)
3. Install dependencies: `npm ci`
4. Run linter: `npm run lint`
5. Run type check: `npm run type-check`
6. Run tests: `npm run test`
7. Build: `npm run build`
8. Build Docker image (main/develop only)
9. Push to GHCR (main/develop only)

**Duration**: ~8-12 minutes

**Artifacts**:

- Docker image in GHCR
- Test coverage reports
- Build logs

**Environment Variables Required**:

```
NODE_ENV=production
DATABASE_URL=<production-db-url>
REDIS_URL=<production-redis-url>
JWT_SECRET=<jwt-secret>
STELLAR_NETWORK=public
```

### Frontend Build

**Trigger**: On every push to any branch

**Steps**:

1. Checkout code
2. Setup Node.js (v20.x)
3. Install dependencies: `npm ci --frozen-lockfile`
4. Run linter: `npm run lint`
5. Run type check: `npm run type-check`
6. Run tests: `npm run test`
7. Build: `npm run build`
8. Build Docker image (main/develop only)
9. Push to GHCR (main/develop only)

**Duration**: ~6-10 minutes

**Artifacts**:

- Docker image in GHCR
- Test coverage reports
- Build logs

**Environment Variables Required**:

```
NEXT_PUBLIC_API_URL=<api-url>
NEXT_PUBLIC_STELLAR_NETWORK=public
```

### Contract Build

**Trigger**: On every push to any branch

**Steps**:

1. Checkout code
2. Setup Rust (latest stable)
3. Cache Cargo dependencies
4. Format check: `cargo fmt --check`
5. Lint: `cargo clippy --all-targets --all-features`
6. Test: `cargo test --all-features`
7. Build release: `cargo build --release`

**Duration**: ~5-8 minutes (first run), ~2-3 minutes (cached)

**Artifacts**:

- Compiled WASM binaries
- Test results
- Build logs

## Testing Stages

### Backend Testing

**Framework**: Jest

**Test Types**:

- Unit tests: Business logic, utilities, services
- Integration tests: Database, external APIs
- E2E tests: API endpoints (optional)

**Coverage Requirements**:

- Minimum: 70% line coverage
- Critical paths: 90%+ coverage
- Excluded: Generated code, migrations

**Running Locally**:

```bash
npm run test                    # Run all tests
npm run test:watch            # Watch mode
npm run test:coverage         # With coverage report
npm run test:debug            # Debug mode
```

**CI Configuration**:

```yaml
- name: Run tests
  run: npm run test -- --coverage --ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

**Continuous Testing Workflow**:

- Workflow: `.github/workflows/backend-tests.yml`
- Triggers: push/pull request on `main` and `develop`, manual dispatch, and scheduled runs every 6 hours
- Node versions: 20 and 22 for unit-test compatibility checks
- Readiness checks: format, lint, typecheck, coverage, and build verification

### Frontend Testing

**Framework**: Vitest

**Test Types**:

- Unit tests: Components, hooks, utilities
- Integration tests: Page rendering, user interactions
- Snapshot tests: UI component structure

**Coverage Requirements**:

- Minimum: 60% line coverage
- Components: 80%+ coverage

**Running Locally**:

```bash
npm run test                    # Run all tests
npm run test:watch            # Watch mode
npm run test:coverage         # With coverage report
```

### Contract Testing

**Framework**: Rust built-in test framework

**Test Types**:

- Unit tests: Contract functions
- Integration tests: Contract interactions
- Property-based tests: Invariant validation

**Running Locally**:

```bash
cargo test                      # Run all tests
cargo test -- --nocapture     # With output
cargo test --release          # Optimized build
```

## Deployment Stages

### Pre-Deployment Checks

**Automated Checks**:

- All tests passing
- Code coverage above threshold
- No security vulnerabilities
- Docker image successfully built
- Database migrations validated

**Manual Checks** (optional):

- Code review approval
- Stakeholder sign-off
- Change log updated
- Documentation updated

### Staging Deployment

**Trigger**: Automatic on `develop` branch push

**Process**:

1. Pull latest image from GHCR
2. Update staging environment variables
3. Run database migrations
4. Deploy new containers
5. Run smoke tests
6. Verify service health

**Rollback**:

```bash
# Manual rollback to previous version
git revert <commit-hash>
git push origin develop
```

**Verification**:

- API health check: `GET /health`
- Database connectivity: Query test table
- External services: Stellar, S3, Redis
- Logs: Check for errors in Winston logs

### Production Deployment

**Trigger**: Automatic on `main` branch push (with optional approval)

**Process**:

1. Pull latest image from GHCR
2. Update production environment variables
3. Run database migrations (with backup)
4. Deploy new containers (blue-green strategy)
5. Run smoke tests
6. Verify service health
7. Monitor error rates for 5 minutes

**Rollback**:

```bash
# Manual rollback to previous version
git revert <commit-hash>
git push origin main
```

**Verification**:

- API health check: `GET /health`
- Database connectivity: Query test table
- External services: Stellar, S3, Redis
- Logs: Check for errors in Winston logs
- Metrics: Monitor CPU, memory, request latency

### Blue-Green Deployment Strategy

**Purpose**: Zero-downtime deployments with instant rollback

**Process**:

1. **Blue Environment**: Current production (running)
2. **Green Environment**: New version (staged)
3. Deploy to Green
4. Run smoke tests on Green
5. Switch load balancer to Green
6. Keep Blue running for 30 minutes
7. If issues detected, switch back to Blue
8. After 30 minutes, stop Blue

**Benefits**:

- Zero downtime
- Instant rollback
- Easy A/B testing
- Reduced risk

## Pipeline Monitoring

### Real-Time Monitoring

**GitHub Actions Dashboard**:

- View workflow runs: https://github.com/chioma-housing-protocol-i/chioma/actions
- Filter by workflow, branch, status
- View logs for each job
- Retry failed jobs

**Metrics to Monitor**:

- Pipeline duration
- Success/failure rate
- Test coverage trends
- Build artifact size
- Deployment frequency

### Logging

**Backend Logs**:

- Winston structured logging
- Log levels: error, warn, info, debug
- Centralized logging: Elasticsearch
- Log retention: 30 days

**Frontend Logs**:

- Browser console logs
- Sentry error tracking
- Log retention: 7 days

**Pipeline Logs**:

- GitHub Actions logs (90 days retention)
- Docker build logs
- Deployment logs

### Alerting

**Alert Channels**:

- Slack: #deployments channel
- Email: DevOps team
- PagerDuty: Critical incidents

**Alert Triggers**:

- Pipeline failure
- Deployment failure
- High error rate (>1%)
- Performance degradation
- Security vulnerability detected

**Alert Configuration**:

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Pipeline failed: ${{ github.repository }}",
        "blocks": [...]
      }
```

### Health Checks

**Backend Health Check**:

```bash
curl -X GET http://localhost:3000/health
# Response: { "status": "ok", "timestamp": "2024-01-01T00:00:00Z" }
```

**Frontend Health Check**:

```bash
curl -X GET http://localhost:5000/api/health
# Response: { "status": "ok" }
```

**Database Health Check**:

```bash
# Verify database connectivity
SELECT 1;
```

**Redis Health Check**:

```bash
# Verify Redis connectivity
PING
```

## Pipeline Failures & Troubleshooting

### Common Failure Scenarios

#### 1. Linting Failures

**Symptoms**: ESLint or Prettier errors

**Resolution**:

```bash
# Fix formatting
npm run format

# Fix linting issues
npm run lint -- --fix

# Commit and push
git add .
git commit -m "fix: resolve linting issues"
git push
```

#### 2. Type Checking Failures

**Symptoms**: TypeScript compilation errors

**Resolution**:

```bash
# Check types locally
npm run type-check

# Fix type errors
# Edit files to resolve type issues

# Verify fix
npm run type-check

# Commit and push
git add .
git commit -m "fix: resolve type errors"
git push
```

#### 3. Test Failures

**Symptoms**: Jest or Vitest failures

**Resolution**:

```bash
# Run tests locally
npm run test

# Debug failing test
npm run test -- --testNamePattern="test name" --watch

# Fix test or implementation
# Update test if behavior change is intentional

# Commit and push
git add .
git commit -m "fix: resolve test failures"
git push
```

#### 4. Build Failures

**Symptoms**: Production build fails

**Resolution**:

```bash
# Build locally
npm run build

# Check for errors
# Common issues: unused imports, missing dependencies, circular dependencies

# Fix issues
# Commit and push
git add .
git commit -m "fix: resolve build errors"
git push
```

#### 5. Docker Build Failures

**Symptoms**: Docker image build fails

**Resolution**:

```bash
# Build Docker image locally
docker build -f Dockerfile -t chioma-backend:test .

# Check Dockerfile for issues
# Common issues: missing dependencies, incorrect paths, permission issues

# Fix Dockerfile
# Commit and push
git add Dockerfile
git commit -m "fix: resolve Docker build issues"
git push
```

#### 6. Deployment Failures

**Symptoms**: Deployment to staging/production fails

**Resolution**:

1. Check deployment logs in GitHub Actions
2. Verify environment variables are set
3. Check database migrations
4. Verify service health
5. Check logs in Elasticsearch
6. Rollback if necessary

**Rollback Process**:

```bash
# Identify last good commit
git log --oneline | head -20

# Revert to previous version
git revert <commit-hash>
git push origin main

# Monitor deployment
# Verify service health
```

### Debugging Pipeline Issues

**Enable Debug Logging**:

```yaml
- name: Enable debug logging
  run: |
    export DEBUG=*
    npm run build
```

**View Workflow Logs**:

1. Go to GitHub Actions
2. Click on failed workflow run
3. Click on failed job
4. Expand step logs
5. Search for error messages

**Local Reproduction**:

```bash
# Reproduce pipeline steps locally
npm ci
npm run lint
npm run type-check
npm run test
npm run build
```

**Common Debug Commands**:

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check installed dependencies
npm list

# Check for circular dependencies
npm run build -- --analyze

# Check TypeScript errors
npx tsc --noEmit

# Check ESLint errors
npx eslint . --format=json
```

## Pipeline Maintenance

### Regular Maintenance Tasks

**Weekly**:

- Review failed pipeline runs
- Check for security vulnerabilities
- Monitor pipeline duration trends
- Review error logs

**Monthly**:

- Update dependencies
- Review and update CI/CD configuration
- Audit GitHub Actions permissions
- Review deployment frequency and success rate

**Quarterly**:

- Review pipeline architecture
- Optimize pipeline performance
- Update documentation
- Conduct disaster recovery drill

### Dependency Updates

**Process**:

1. Create feature branch: `chore/update-dependencies`
2. Update dependencies: `npm update`
3. Run full test suite
4. Review changes
5. Create pull request
6. Merge after approval

**Security Updates**:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Review changes
git diff

# Commit and push
git add package*.json
git commit -m "chore: fix security vulnerabilities"
git push
```

### Performance Optimization

**Caching Strategy**:

- Cache Node modules: `~/.npm`
- Cache Cargo dependencies: `~/.cargo`
- Cache Docker layers: Use BuildKit

**Parallel Execution**:

- Run linting, type checking, tests in parallel
- Use matrix strategy for multiple Node versions

**Artifact Management**:

- Clean up old artifacts
- Compress large artifacts
- Archive important artifacts

## CI/CD Checklist

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code coverage above threshold
- [ ] No security vulnerabilities
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Secrets configured in GitHub
- [ ] Rollback plan documented

### Post-Deployment Checklist

- [ ] Service health verified
- [ ] Database connectivity verified
- [ ] External services verified
- [ ] Error logs reviewed
- [ ] Performance metrics normal
- [ ] User-facing features tested
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified
- [ ] Deployment documented
- [ ] Rollback plan ready

### Incident Response Checklist

- [ ] Identify root cause
- [ ] Assess impact
- [ ] Initiate rollback if necessary
- [ ] Notify stakeholders
- [ ] Document incident
- [ ] Implement fix
- [ ] Deploy fix
- [ ] Verify resolution
- [ ] Post-mortem scheduled
- [ ] Preventive measures implemented

## Related Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Monitoring and Alerting](./MONITORING_AND_ALERTING.md)
- [Release Management](./RELEASE_MANAGEMENT.md)
- [Backup and Recovery](./BACKUP_AND_RECOVERY.md)
- [Testing Standards](../community/TESTING_STANDARDS.md)

## Support & Escalation

**For CI/CD Issues**:

1. Check pipeline logs in GitHub Actions
2. Review this documentation
3. Check recent commits for breaking changes
4. Contact DevOps team: devops@chioma.io
5. Escalate to platform lead if critical

**Emergency Contacts**:

- DevOps Lead: [contact info]
- Platform Lead: [contact info]
- On-Call Engineer: [PagerDuty link]
