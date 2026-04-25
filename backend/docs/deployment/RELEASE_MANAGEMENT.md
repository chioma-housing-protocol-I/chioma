# Release Management

This document defines release management procedures for the Chioma backend, covering release planning, versioning strategy, release notes creation, deployment, rollback, and communication.

Use this together with:

- [Deployment Runbook](./DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [API Versioning](../api/API-VERSIONING.md)

---

## 1. Overview

Release management ensures:

- predictable and safe software releases
- clear communication of changes
- minimal disruption to users
- rapid rollback capability when needed
- compliance with change management policies

This document is written for release managers, engineering leads, and deployment operators.

---

## 2. Release Planning

### 2.1 Release Types

| Release Type | Frequency | Scope                            | Risk Level |
| ------------ | --------- | -------------------------------- | ---------- |
| Hotfix       | As needed | Critical bug fixes               | Low        |
| Patch        | Weekly    | Bug fixes, minor improvements    | Low        |
| Minor        | Bi-weekly | New features, enhancements       | Medium     |
| Major        | Quarterly | Breaking changes, major features | High       |

### 2.2 Release Cadence

Standard release schedule:

- Patch releases: Every Tuesday at 10:00 AM UTC
- Minor releases: Every other Tuesday at 10:00 AM UTC
- Major releases: Planned quarterly, announced 30 days in advance
- Hotfixes: As needed, with emergency approval

### 2.3 Release Planning Process

1. Feature freeze (T-7 days for minor, T-14 days for major)
2. Code review and testing (T-5 days)
3. Staging deployment and validation (T-3 days)
4. Release notes preparation (T-2 days)
5. Stakeholder communication (T-1 day)
6. Production deployment (T-0)
7. Post-deployment monitoring (T+1 day)
8. Retrospective (T+3 days)

### 2.4 Release Approval

Approval requirements by release type:

| Release Type | Approvers Required                       |
| ------------ | ---------------------------------------- |
| Hotfix       | Engineering Lead + On-call               |
| Patch        | Engineering Lead                         |
| Minor        | Engineering Lead + Product Manager       |
| Major        | Engineering Lead + Product Manager + CTO |

### 2.5 Release Criteria

All releases must meet:

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Staging validation completed
- [ ] Rollback plan documented
- [ ] Monitoring dashboards ready
- [ ] On-call team notified

---

## 3. Versioning Strategy

### 3.1 Semantic Versioning

Chioma follows Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`

- MAJOR: Breaking changes, incompatible API changes
- MINOR: New features, backward-compatible
- PATCH: Bug fixes, backward-compatible

Examples:

- `1.0.0` → `1.0.1`: Patch release (bug fix)
- `1.0.1` → `1.1.0`: Minor release (new feature)
- `1.1.0` → `2.0.0`: Major release (breaking change)

### 3.2 Version Tagging

Git tags for releases:

```bash
# Create release tag
git tag -a v1.2.3 -m "Release version 1.2.3"

# Push tag to remote
git push origin v1.2.3

# List all tags
git tag -l
```

Tag naming convention:

- Release: `v1.2.3`
- Release candidate: `v1.2.3-rc.1`
- Beta: `v1.2.3-beta.1`
- Alpha: `v1.2.3-alpha.1`

### 3.3 Branch Strategy

Branch model:

- `main`: Production-ready code
- `develop`: Integration branch for next release
- `feature/*`: Feature development branches
- `hotfix/*`: Emergency fix branches
- `release/*`: Release preparation branches

Release branch workflow:

```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# Finalize release (version bump, changelog)
npm version minor
git add .
git commit -m "Prepare release v1.2.0"

# Merge to main and tag
git checkout main
git merge release/v1.2.0
git tag -a v1.2.0 -m "Release v1.2.0"

# Merge back to develop
git checkout develop
git merge release/v1.2.0

# Push everything
git push origin main develop v1.2.0

# Delete release branch
git branch -d release/v1.2.0
```

### 3.4 API Versioning

API versions follow the pattern: `/api/v{major}`

- Breaking changes require new major version
- Maintain previous version for deprecation period
- Document deprecation timeline in release notes

See [API Versioning](../api/API-VERSIONING.md) for details.

---

## 4. Release Notes Creation

### 4.1 Release Notes Template

```markdown
# Release v1.2.3

**Release Date:** 2024-03-30
**Release Type:** Minor Release

## Overview

Brief summary of the release and its primary goals.

## New Features

- **Feature Name**: Description of the feature and its benefits
  - Related PR: #123
  - Documentation: [Link]

## Improvements

- **Area**: Description of improvement
  - Related PR: #124

## Bug Fixes

- **Issue**: Description of bug fix
  - Related PR: #125
  - Fixes: #100

## Breaking Changes

⚠️ **BREAKING**: Description of breaking change and migration path

- Migration guide: [Link]
- Deprecation timeline: 90 days

## Deprecations

- **Feature/API**: Deprecated in favor of [alternative]
  - Removal date: 2024-06-30
  - Migration guide: [Link]

## Security Updates

- **CVE-2024-XXXX**: Description of security fix
  - Severity: High
  - Impact: [Description]

## Performance Improvements

- **Area**: Description of performance improvement
  - Benchmark: 50% faster query execution

## Database Migrations

- Migration: `1740500000000-AddPerformanceIndexes`
  - Impact: Adds indexes, ~5 minute downtime
  - Rollback: Supported

## Configuration Changes

- New environment variable: `NEW_CONFIG_VAR`
  - Required: Yes
  - Default: `value`
  - Description: [Purpose]

## Dependencies

- Updated `@nestjs/core` from 9.0.0 to 10.0.0
- Added `new-package` v1.0.0

## Known Issues

- Issue description and workaround
  - Tracking: #200

## Upgrade Instructions

1. Update environment variables
2. Run database migrations
3. Deploy new version
4. Verify health checks

## Rollback Instructions

1. Revert to previous image tag
2. Rollback database migration if needed
3. Restore previous configuration

## Contributors

Thanks to @user1, @user2, @user3 for their contributions!

## Full Changelog

https://github.com/org/chioma/compare/v1.2.2...v1.2.3
```

### 4.2 Changelog Maintenance

Maintain `CHANGELOG.md` in repository root:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New feature in development

### Changed

- Modified behavior

### Deprecated

- Feature scheduled for removal

### Removed

- Deleted feature

### Fixed

- Bug fix

### Security

- Security patch

## [1.2.3] - 2024-03-30

### Added

- User profile customization
- Property search filters

### Fixed

- Login session timeout issue
- Property image upload bug

## [1.2.2] - 2024-03-23

...
```

### 4.3 Automated Changelog Generation

Use conventional commits for automated changelog:

```bash
# Install conventional-changelog
npm install -g conventional-changelog-cli

# Generate changelog
conventional-changelog -p angular -i CHANGELOG.md -s

# Commit types
# feat: New feature
# fix: Bug fix
# docs: Documentation
# style: Formatting
# refactor: Code restructuring
# perf: Performance improvement
# test: Testing
# chore: Maintenance
```

Example commit messages:

```
feat(auth): add OAuth2 authentication
fix(properties): resolve image upload timeout
docs(api): update authentication guide
perf(database): optimize property search query
```

---

## 5. Release Deployment

### 5.1 Pre-Deployment Checklist

Complete before production deployment:

- [ ] Release branch created and finalized
- [ ] Version bumped in `package.json`
- [ ] Release notes completed
- [ ] Changelog updated
- [ ] Git tag created
- [ ] CI/CD pipeline passed
- [ ] Staging deployment successful
- [ ] Smoke tests passed on staging
- [ ] Database migration tested
- [ ] Rollback plan documented
- [ ] Monitoring dashboards prepared
- [ ] On-call team notified
- [ ] Stakeholders informed
- [ ] Deployment window scheduled
- [ ] Approval obtained

### 5.2 Deployment Procedure

Standard deployment steps:

```bash
#!/bin/bash
# deploy-release.sh

set -euo pipefail

VERSION="${1}"
ENVIRONMENT="${2:-production}"

echo "Deploying version ${VERSION} to ${ENVIRONMENT}"

# 1. Verify version tag exists
if ! git rev-parse "v${VERSION}" >/dev/null 2>&1; then
  echo "Error: Tag v${VERSION} does not exist"
  exit 1
fi

# 2. Checkout release tag
git fetch --tags
git checkout "v${VERSION}"

# 3. Build production image
docker build \
  -f backend/Dockerfile.production \
  -t ghcr.io/chioma/backend:${VERSION} \
  -t ghcr.io/chioma/backend:latest \
  backend/

# 4. Push image to registry
docker push ghcr.io/chioma/backend:${VERSION}
docker push ghcr.io/chioma/backend:latest

# 5. Create pre-deployment backup
./scripts/backup-pre-deploy.sh "${VERSION}"

# 6. Run database migrations
./scripts/run-migrations.sh "${ENVIRONMENT}"

# 7. Deploy application
kubectl set image deployment/chioma-backend \
  chioma-backend=ghcr.io/chioma/backend:${VERSION}

# 8. Wait for rollout
kubectl rollout status deployment/chioma-backend

# 9. Run smoke tests
./scripts/smoke-tests.sh "${ENVIRONMENT}"

# 10. Verify health
curl -f https://api.chioma.io/health || exit 1

echo "Deployment completed successfully"
```

### 5.3 Deployment Verification

Post-deployment checks:

```bash
#!/bin/bash
# verify-deployment.sh

set -euo pipefail

API_URL="${1:-https://api.chioma.io}"

echo "Verifying deployment at ${API_URL}"

# Check health endpoint
echo "Checking health..."
curl -f "${API_URL}/health" || exit 1

# Check version endpoint
echo "Checking version..."
VERSION=$(curl -s "${API_URL}/version" | jq -r '.version')
echo "Deployed version: ${VERSION}"

# Check database connectivity
echo "Checking database..."
curl -f "${API_URL}/health/detailed" | jq '.database.status' | grep -q "up" || exit 1

# Check Redis connectivity
echo "Checking Redis..."
curl -f "${API_URL}/health/detailed" | jq '.redis.status' | grep -q "up" || exit 1

# Test authentication
echo "Testing authentication..."
TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  | jq -r '.access_token')

if [ -z "${TOKEN}" ]; then
  echo "Error: Authentication failed"
  exit 1
fi

# Test authenticated endpoint
echo "Testing authenticated endpoint..."
curl -f -H "Authorization: Bearer ${TOKEN}" \
  "${API_URL}/users/me" || exit 1

echo "Deployment verification passed"
```

### 5.4 Blue-Green Deployment

For zero-downtime deployments:

```bash
# Deploy to green environment
kubectl apply -f k8s/deployment-green.yaml

# Wait for green to be ready
kubectl wait --for=condition=available deployment/chioma-backend-green

# Run smoke tests on green
./scripts/smoke-tests.sh green

# Switch traffic to green
kubectl patch service chioma-backend -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for issues
sleep 300

# If successful, scale down blue
kubectl scale deployment/chioma-backend-blue --replicas=0

# If issues, rollback to blue
# kubectl patch service chioma-backend -p '{"spec":{"selector":{"version":"blue"}}}'
```

---

## 6. Release Rollback

### 6.1 Rollback Decision Criteria

Initiate rollback when:

- Critical functionality is broken
- Data integrity is at risk
- Security vulnerability introduced
- Performance degradation >50%
- Error rate >10%
- Unable to mitigate within 30 minutes

### 6.2 Rollback Procedure

```bash
#!/bin/bash
# rollback-release.sh

set -euo pipefail

PREVIOUS_VERSION="${1}"
REASON="${2:-unspecified}"

echo "Rolling back to version ${PREVIOUS_VERSION}"
echo "Reason: ${REASON}"

# 1. Announce rollback
./scripts/notify-team.sh "ROLLBACK: Reverting to v${PREVIOUS_VERSION}. Reason: ${REASON}"

# 2. Deploy previous version
kubectl set image deployment/chioma-backend \
  chioma-backend=ghcr.io/chioma/backend:${PREVIOUS_VERSION}

# 3. Wait for rollout
kubectl rollout status deployment/chioma-backend

# 4. Rollback database migration if needed
read -p "Rollback database migration? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  ./scripts/rollback-migration.sh
fi

# 5. Verify health
curl -f https://api.chioma.io/health || exit 1

# 6. Run smoke tests
./scripts/smoke-tests.sh production

# 7. Monitor metrics
echo "Monitor dashboards for 15 minutes"
echo "Grafana: https://grafana.chioma.io"

# 8. Document rollback
cat > "rollback-$(date +%Y%m%d-%H%M%S).md" <<EOF
# Rollback Report

Date: $(date)
Previous Version: ${PREVIOUS_VERSION}
Reason: ${REASON}
Operator: $(whoami)

## Actions Taken
- Reverted application to v${PREVIOUS_VERSION}
- Database migration rollback: ${REPLY}

## Verification
- Health check: Passed
- Smoke tests: Passed

## Next Steps
- [ ] Root cause analysis
- [ ] Fix and retest
- [ ] Schedule new release
EOF

echo "Rollback completed"
```

### 6.3 Database Migration Rollback

```bash
#!/bin/bash
# rollback-migration.sh

set -euo pipefail

echo "Rolling back last database migration"

# Get last migration
LAST_MIGRATION=$(npm run typeorm migration:show | grep "X" | tail -1 | awk '{print $2}')

echo "Last executed migration: ${LAST_MIGRATION}"

# Confirm rollback
read -p "Rollback migration ${LAST_MIGRATION}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Rollback cancelled"
  exit 1
fi

# Create backup before rollback
./scripts/backup-pre-rollback.sh

# Rollback migration
npm run typeorm migration:revert

# Verify database state
npm run typeorm migration:show

echo "Migration rollback completed"
```

### 6.4 Partial Rollback

For feature-specific issues, use feature flags:

```typescript
// Disable feature without full rollback
await this.featureFlagService.disable('new-feature');

// Or via API
curl -X POST https://api.chioma.io/admin/feature-flags/new-feature/disable \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## 7. Release Communication

### 7.1 Communication Channels

| Audience         | Channel                     | Timing                 |
| ---------------- | --------------------------- | ---------------------- |
| Engineering team | Slack #engineering          | T-1 day, T-0, T+1 hour |
| Product team     | Slack #product              | T-1 day, T+1 hour      |
| Customer support | Email + Slack #support      | T-1 day, T+1 hour      |
| Customers        | Email + In-app notification | T+1 day                |
| Public           | Blog post + Twitter         | T+1 week               |

### 7.2 Pre-Release Communication

Template for engineering team:

```
🚀 Upcoming Release: v1.2.3

**Deployment Window:** Tuesday, March 30, 2024 at 10:00 AM UTC
**Expected Duration:** 30 minutes
**Expected Downtime:** None (rolling deployment)

**What's Changing:**
- New property search filters
- Performance improvements for listing queries
- Bug fixes for image uploads

**Action Required:**
- On-call: Be available during deployment window
- QA: Smoke test checklist ready
- Support: Review release notes for customer-facing changes

**Release Notes:** [Link]
**Rollback Plan:** [Link]

Questions? Reply in thread.
```

### 7.3 Deployment Announcement

Template for deployment start:

```
🚀 Deployment Started: v1.2.3

**Status:** In Progress
**Started:** 10:00 AM UTC
**Dashboard:** https://grafana.chioma.io/deployment

**Progress:**
✅ Pre-deployment backup completed
✅ Database migrations running
⏳ Application deployment in progress
⏳ Smoke tests pending
⏳ Verification pending

Updates will be posted here.
```

### 7.4 Post-Release Communication

Template for successful deployment:

```
✅ Deployment Completed: v1.2.3

**Status:** Success
**Completed:** 10:25 AM UTC
**Duration:** 25 minutes

**Verification:**
✅ Health checks passing
✅ Smoke tests passed
✅ Error rates normal
✅ Performance metrics normal

**What's New:**
- Property search filters now available
- 40% faster listing queries
- Image upload reliability improved

**Release Notes:** [Link]

Monitoring will continue for the next 24 hours.
```

Template for failed deployment:

```
⚠️ Deployment Rolled Back: v1.2.3

**Status:** Rolled back to v1.2.2
**Completed:** 10:15 AM UTC
**Reason:** High error rate detected

**Actions Taken:**
- Reverted to previous version
- Database migration rolled back
- All systems stable

**Next Steps:**
- Root cause analysis in progress
- Fix will be prepared and retested
- New deployment scheduled for [date]

**Incident Report:** [Link]
```

### 7.5 Customer Communication

Template for customer-facing release notes:

```
Subject: New Features and Improvements - March 2024

Hi [Name],

We're excited to announce new features and improvements to Chioma!

**What's New**

🔍 Enhanced Property Search
Find your perfect property faster with new search filters including price range, bedrooms, and amenities.

⚡ Faster Performance
Property listings now load 40% faster, making your browsing experience smoother.

🐛 Bug Fixes
- Resolved image upload issues
- Fixed session timeout problems
- Improved mobile responsiveness

**How to Get Started**

The new features are available now. Simply log in to your account to start using them.

**Need Help?**

Our support team is here to help. Contact us at support@chioma.io or visit our help center.

Thank you for using Chioma!

The Chioma Team
```

---

## 8. Release Checklist

### 8.1 Planning Phase

- [ ] Release scope defined
- [ ] Features prioritized
- [ ] Dependencies identified
- [ ] Risk assessment completed
- [ ] Resource allocation confirmed
- [ ] Timeline established
- [ ] Stakeholders informed

### 8.2 Development Phase

- [ ] Feature development completed
- [ ] Code reviews completed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security scan passed
- [ ] Performance benchmarks met
- [ ] Documentation updated

### 8.3 Pre-Release Phase

- [ ] Feature freeze announced
- [ ] Release branch created
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Release notes drafted
- [ ] Database migrations tested
- [ ] Staging deployment completed
- [ ] Smoke tests passed on staging
- [ ] Load testing completed
- [ ] Rollback plan documented

### 8.4 Approval Phase

- [ ] Engineering lead approval
- [ ] Product manager approval (minor/major)
- [ ] CTO approval (major)
- [ ] Security review (if applicable)
- [ ] Compliance review (if applicable)

### 8.5 Deployment Phase

- [ ] Deployment window scheduled
- [ ] On-call team notified
- [ ] Pre-deployment backup created
- [ ] Monitoring dashboards prepared
- [ ] Communication sent to stakeholders
- [ ] Production deployment executed
- [ ] Database migrations applied
- [ ] Health checks verified
- [ ] Smoke tests passed
- [ ] Metrics monitored

### 8.6 Post-Release Phase

- [ ] Deployment announcement sent
- [ ] Monitoring continued for 24 hours
- [ ] Customer communication sent
- [ ] Release notes published
- [ ] Git tag pushed
- [ ] Release branch merged
- [ ] Retrospective scheduled
- [ ] Lessons learned documented

---

## 9. Release Troubleshooting

### 9.1 Deployment Fails

Symptoms:

- Deployment script exits with error
- Pods failing to start
- Health checks failing

Diagnostics:

```bash
# Check deployment status
kubectl rollout status deployment/chioma-backend

# Check pod logs
kubectl logs -l app=chioma-backend --tail=100

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Check image pull
kubectl describe pod <pod-name>
```

Solutions:

- Verify image tag exists
- Check configuration secrets
- Verify database connectivity
- Review migration logs
- Rollback if unrecoverable

### 9.2 Migration Fails

Symptoms:

- Migration script exits with error
- Database in inconsistent state
- Application fails to start

Diagnostics:

```bash
# Check migration status
npm run typeorm migration:show

# Check database logs
docker logs postgres --tail=100

# Check for locks
psql -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

Solutions:

- Kill blocking queries
- Rollback failed migration
- Fix migration script
- Rerun migration
- Restore from backup if needed

### 9.3 High Error Rate After Deployment

Symptoms:

- Elevated 5xx responses
- Error alerts firing
- Customer complaints

Diagnostics:

```bash
# Check error rate
curl http://localhost:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m])'

# Check recent errors
kubectl logs -l app=chioma-backend --tail=100 | grep ERROR

# Check Sentry
# Visit Sentry dashboard
```

Solutions:

- Identify failing endpoint
- Check recent code changes
- Review configuration changes
- Rollback if widespread
- Fix and redeploy if isolated

### 9.4 Performance Degradation

Symptoms:

- Slow response times
- Timeout errors
- High latency alerts

Diagnostics:

```bash
# Check latency
curl http://localhost:9090/api/v1/query?query='histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'

# Check database performance
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check resource usage
kubectl top pods
```

Solutions:

- Identify slow queries
- Check for missing indexes
- Review new code for N+1 queries
- Scale resources if needed
- Rollback if severe

---

## 10. Release Monitoring

### 10.1 Post-Release Monitoring

**First Hour:**

- Monitor error rate (target: <1%)
- Monitor latency (target: p95 <2s)
- Monitor CPU/memory usage
- Check database connection pool
- Monitor queue depth
- Check external API latency

**First 24 Hours:**

- Continue error rate monitoring
- Monitor for memory leaks
- Check for cascading failures
- Monitor customer support tickets
- Analyze user behavior changes
- Check for performance regressions

**First Week:**

- Analyze release metrics
- Compare with baseline
- Check for edge cases
- Monitor for delayed issues
- Gather user feedback
- Plan follow-up fixes if needed

### 10.2 Release Metrics

Track these metrics for each release:

| Metric                       | Target    | Action             |
| ---------------------------- | --------- | ------------------ |
| Error rate                   | <1%       | Rollback if >5%    |
| P95 latency                  | <2s       | Investigate if >3s |
| Deployment time              | <30min    | Optimize if >45min |
| Rollback time                | <10min    | Improve if >15min  |
| MTTR (mean time to recovery) | <30min    | Improve if >60min  |
| Deployment frequency         | 1-2x/week | Increase if less   |
| Change failure rate          | <15%      | Improve if higher  |
| Lead time for changes        | <1 week   | Reduce if longer   |

### 10.3 Release Retrospective

Conduct retrospective 3 days after release:

**Attendees:**

- Release manager
- Engineering lead
- QA lead
- DevOps engineer
- Product manager

**Agenda:**

1. Review release timeline
2. Discuss what went well
3. Discuss what could improve
4. Review metrics
5. Identify action items
6. Document lessons learned

**Output:**

- Release report
- Lessons learned document
- Action items for next release
- Process improvements

---

## 11. Release Automation

### 11.1 Automated Release Pipeline

**GitHub Actions Workflow:**

```yaml
name: Release Pipeline

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test:cov

      - name: Build
        run: pnpm run build

      - name: Build Docker image
        run: |
          docker build -f backend/Dockerfile.production \
            -t ghcr.io/chioma/backend:${{ github.ref_name }} \
            -t ghcr.io/chioma/backend:latest \
            backend/

      - name: Push Docker image
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/chioma/backend:${{ github.ref_name }}
          docker push ghcr.io/chioma/backend:latest

      - name: Create release notes
        run: |
          conventional-changelog -p angular -r 2 > RELEASE_NOTES.md

      - name: Create GitHub release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref_name }}
          release_name: Release ${{ github.ref_name }}
          body_path: RELEASE_NOTES.md
          draft: false
          prerelease: false

      - name: Deploy to staging
        run: |
          ./scripts/deploy-staging.sh ${{ github.ref_name }}

      - name: Run smoke tests
        run: |
          ./scripts/smoke-tests.sh staging

      - name: Notify team
        run: |
          ./scripts/notify-release.sh ${{ github.ref_name }}
```

### 11.2 Automated Rollback

**Automatic Rollback on Error:**

```bash
#!/bin/bash
# auto-rollback.sh

set -euo pipefail

CURRENT_VERSION="${1}"
PREVIOUS_VERSION="${2}"

# Monitor for 5 minutes
for i in {1..30}; do
    ERROR_RATE=$(curl -s http://localhost:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m])' | jq '.data.result[0].value[1]' | tr -d '"')

    if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
        echo "High error rate detected: ${ERROR_RATE}"
        echo "Initiating automatic rollback"

        # Rollback
        kubectl set image deployment/chioma-backend \
          chioma-backend=ghcr.io/chioma/backend:${PREVIOUS_VERSION}

        # Notify team
        curl -X POST ${SLACK_WEBHOOK} \
          -H 'Content-Type: application/json' \
          -d "{\"text\":\"🚨 Automatic rollback triggered. Reverted from ${CURRENT_VERSION} to ${PREVIOUS_VERSION}\"}"

        exit 1
    fi

    sleep 10
done

echo "Release monitoring completed successfully"
```

---

## 12. References

- [Deployment Runbook](./DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [API Versioning](../api/API-VERSIONING.md)
- [API Changelog](../api/API-CHANGELOG.md)
- [Monitoring and Alerting](./MONITORING_AND_ALERTING.md)
- [Backup and Recovery](./BACKUP_AND_RECOVERY.md)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
