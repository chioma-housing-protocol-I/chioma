# Chioma Deployment Runbook

**Version:** 1.0  
**Last Updated:** 2026-10-19  
**Owner:** Platform & DevOps Team

> This runbook provides comprehensive step-by-step procedures for deploying all components of the Chioma platform (backend, frontend, smart contracts, and infrastructure) across development, staging, and production environments.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Component Deployment Procedures](#component-deployment-procedures)
   - [Backend API Deployment](#backend-api-deployment)
   - [Frontend Deployment](#frontend-deployment)
   - [Smart Contract Deployment](#smart-contract-deployment)
   - [Infrastructure Deployment](#infrastructure-deployment)
5. [Environment-Specific Procedures](#environment-specific-procedures)
6. [Verification & Health Checks](#verification--health-checks)
7. [Rollback Procedures](#rollback-procedures)
8. [Post-Deployment Tasks](#post-deployment-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Emergency Contacts](#emergency-contacts)

---

## Quick Reference

### Deployment Commands Summary

```bash
# Backend (Kubernetes)
kubectl apply -f backend/k8s/ -n production
kubectl rollout status deployment/chioma-backend -n production

# Frontend (Vercel)
cd frontend && npm run build && vercel --prod

# Contracts (Stellar Testnet/Mainnet)
cd contract && ./check-all.sh && soroban contract deploy

# Infrastructure (Terraform)
terraform -chdir=infrastructure plan -var-file=environments/production.tfvars
terraform -chdir=infrastructure apply production.tfplan
```

### Critical Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API Response Time (p95) | > 500ms | > 1000ms | Scale pods, check DB |
| Error Rate | > 1% | > 5% | Rollback immediately |
| Database CPU | > 70% | > 85% | Scale RDS instance |
| Pod Memory | > 80% | > 90% | Increase limits/requests |
| Failed Payment Rate | > 0.5% | > 2% | Emergency rollback |

### Emergency Rollback Commands

```bash
# Backend - revert to previous version
kubectl rollout undo deployment/chioma-backend -n production

# Frontend - revert Vercel deployment
vercel rollback

# Contracts - cannot rollback; pause contract instead
soroban contract invoke --id <CONTRACT_ID> -- pause --reason "emergency rollback"
```

---

## Prerequisites

### Access Requirements

- [ ] **AWS Console Access** - Admin role for target environment
- [ ] **kubectl configured** - `~/.kube/config` with production context
- [ ] **Docker Registry Access** - AWS ECR or Docker Hub write permissions
- [ ] **Terraform Access** - S3 backend read/write permissions
- [ ] **Vercel Account** - Project admin access for frontend deployments
- [ ] **Stellar Accounts** - Signing keys for contract deployments (testnet/mainnet)
- [ ] **VPN/Bastion** - Access to production network (if applicable)
- [ ] **PagerDuty/Alerting** - On-call access configured
- [ ] **Status Page** - Admin access for maintenance announcements

### Required Tools

Install and verify all tools before deployment:

```bash
# Verify tool versions
node --version          # >= 20.x
npm --version           # >= 10.x
docker --version        # >= 24.x
kubectl version --client # >= 1.28
terraform --version     # >= 1.6
aws --version           # >= 2.x
soroban --version       # Latest stable
git --version           # >= 2.x

# Verify AWS access
aws sts get-caller-identity

# Verify Kubernetes access
kubectl get nodes

# Verify Docker access
docker login

# Verify Stellar network access
curl -s https://horizon-testnet.stellar.org/ | jq .
```

### Environment Setup

```bash
# Clone repository
git clone https://github.com/chioma/chioma.git
cd chioma

# Install root dependencies
npm install

# Backend setup
cd backend
npm install
cp .env.production .env

# Frontend setup
cd ../frontend
npm install
cp .env.production.local .env.local

# Contract setup
cd ../contract
cargo build
```

---

## Pre-Deployment Checklist

### Phase 1: Code Quality & Testing

#### Backend

```bash
cd backend

# Run all checks
make ci

# Individual checks
make test                # All tests pass
make test-cov            # Coverage >= 80%
make lint                # No linting errors
make typecheck           # No TypeScript errors
make security-lint       # No vulnerabilities
make format-check        # Code formatted correctly

# Database checks
npm run migration:generate  # No pending schema changes (unless intentional)
npm run migration:run --dry-run  # Verify migrations

# Performance tests
make perf:load           # Load test passes
make perf:comprehensive  # Performance regression tests
```

#### Frontend

```bash
cd frontend

# Run all checks
make ci

# Individual checks
make test                # All tests pass
make lint                # ESLint passes
make format-check        # Prettier check
make build               # Production build succeeds
make audit               # No security vulnerabilities
```

#### Smart Contracts

```bash
cd contract

# Run all checks
./check-all.sh

# Individual checks
cargo test               # All tests pass
cargo clippy -- -D warnings  # No warnings
cargo audit              # No vulnerabilities
cargo build --release    # Release build succeeds

# Integration tests
cargo test -p integration-tests
```

### Phase 2: Infrastructure Readiness

```bash
# Check cluster health
kubectl get nodes
kubectl top nodes
kubectl get pods --all-namespaces | grep -v Running

# Check database status
aws rds describe-db-instances \
  --db-instance-identifier chioma-production-postgres \
  --query 'DBInstances[0].DBInstanceStatus'

# Verify backup recent
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name chioma-production-backup \
  --by-resource-type RDS \
  --query 'RecoveryPoints[0].[RecoveryPointArn,CreationDate]'

# Check Redis health
aws elasticache describe-cache-clusters \
  --cache-cluster-id chioma-production-redis \
  --show-cache-node-info

# Verify monitoring
curl -s http://prometheus:9090/-/healthy
curl -s http://grafana:3000/api/health
```

### Phase 3: Communication & Approvals

- [ ] **Change Request Filed** - Ticket/issue created with deployment plan
- [ ] **Code Review Complete** - All PRs approved and merged
- [ ] **Staging Verification** - Changes tested in staging environment
- [ ] **Stakeholder Approval** - Product owner/tech lead sign-off
- [ ] **Schedule Communication** - Team notified via Slack/email (24h notice for production)
- [ ] **Maintenance Window** - Status page updated if downtime expected
- [ ] **On-Call Coverage** - Engineer available during and 2h after deployment
- [ ] **Rollback Plan** - Documented and tested in staging

### Phase 4: Dependency Verification

```bash
# Check external services
curl -s https://horizon.stellar.org/ | jq '.history_latest_ledger'
curl -s https://api.stellar.org/friendbot | head -n 1

# Check third-party APIs
curl -s https://api.ourprovider.com/health

# Verify secrets exist
kubectl get secrets -n production | grep chioma-backend-secrets

# Check DNS resolution
dig api.chioma.app +short
dig app.chioma.app +short
```

---

## Component Deployment Procedures

### Backend API Deployment

The backend is a Node.js/Express API deployed on Kubernetes (EKS) with auto-scaling, load balancing, and graceful shutdown.

#### Development Environment

```bash
cd backend

# Start local services
docker-compose up -d postgres redis

# Run migrations
npm run migration:run

# Start development server
npm run dev
```

#### Staging Deployment

```bash
# 1. Build and tag Docker image
cd backend
export VERSION=$(git rev-parse --short HEAD)
export REGISTRY="123456789.dkr.ecr.us-east-1.amazonaws.com"
export IMAGE="$REGISTRY/chioma-backend:$VERSION"

docker build -f Dockerfile.production -t $IMAGE .

# 2. Push to registry
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $REGISTRY
docker push $IMAGE

# 3. Update Kubernetes manifests
cd k8s
sed -i "s|image:.*|image: $IMAGE|g" deployment.yaml

# 4. Apply to staging namespace
kubectl apply -f rbac.yaml -n staging
kubectl apply -f deployment.yaml -n staging
kubectl apply -f service.yaml -n staging
kubectl apply -f hpa.yaml -n staging
kubectl apply -f pdb.yaml -n staging

# 5. Watch rollout
kubectl rollout status deployment/chioma-backend -n staging --timeout=10m

# 6. Verify deployment
kubectl get pods -n staging -l app=chioma-backend
kubectl logs -n staging -l app=chioma-backend --tail=50

# 7. Run smoke tests
npm run test:smoke:staging
```

#### Production Deployment

```bash
# 1. Enable maintenance mode (if needed for breaking changes)
kubectl scale deployment/chioma-backend -n production --replicas=0
# Update status page: https://status.chioma.app

# 2. Create database backup (additional to automated)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
kubectl exec -n production deployment/chioma-backend -- \
  npm run db:backup -- --tag "pre-deploy-$TIMESTAMP"

# 3. Run database migrations
kubectl exec -n production deployment/chioma-backend -- \
  npm run migration:run

# 4. Build and push production image
export VERSION=$(git describe --tags --always)
export REGISTRY="123456789.dkr.ecr.us-east-1.amazonaws.com"
export IMAGE="$REGISTRY/chioma-backend:$VERSION"

docker build -f Dockerfile.production -t $IMAGE \
  --build-arg NODE_ENV=production \
  --build-arg VERSION=$VERSION .

aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $REGISTRY
docker push $IMAGE

# 5. Update production manifests
cd k8s
sed -i "s|image:.*|image: $IMAGE|g" deployment.yaml

# 6. Apply changes with zero-downtime rolling update
kubectl apply -f deployment.yaml -n production

# 7. Monitor rollout
kubectl rollout status deployment/chioma-backend -n production --timeout=15m

# Watch pods come up
watch -n 2 'kubectl get pods -n production -l app=chioma-backend'

# Monitor logs for errors
kubectl logs -n production -l app=chioma-backend -f --max-log-requests=10

# 8. Verify health
kubectl port-forward -n production svc/chioma-backend 8080:80 &
curl http://localhost:8080/health
curl http://localhost:8080/health/db
curl http://localhost:8080/health/redis
kill %1

# 9. Run smoke tests
npm run test:smoke:production

# 10. Monitor metrics (first 30 minutes)
# Check Grafana dashboard: Backend API Overview
# Watch error rates, response times, and throughput
# Alert if p95 latency > 500ms or error rate > 1%

# 11. Exit maintenance mode
# Scale back up if scaled down
kubectl scale deployment/chioma-backend -n production --replicas=3
# Update status page: incident resolved
```

#### Post-Deployment Verification

```bash
# Check all pods running
kubectl get pods -n production -l app=chioma-backend -o wide

# Verify HPA functioning
kubectl get hpa -n production chioma-backend-hpa

# Check pod resource usage
kubectl top pods -n production -l app=chioma-backend

# Test critical endpoints
curl -X POST https://api.chioma.app/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

curl https://api.chioma.app/v1/properties?limit=10

# Check payment endpoint (critical path)
curl https://api.chioma.app/v1/payments/health

# Verify graceful shutdown works
POD=$(kubectl get pods -n production -l app=chioma-backend -o name | head -1)
kubectl delete $POD -n production
kubectl logs $POD -n production | grep -i "graceful shutdown"
```

---

### Frontend Deployment

The frontend is a Next.js application deployed on Vercel with automatic preview deployments for PRs.

#### Development Environment

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Open http://localhost:3000
```

#### Staging Deployment (Vercel Preview)

Preview deployments are automatic for every PR. To manually deploy to preview:

```bash
cd frontend

# Build and test locally
npm run build
npm run start

# Deploy to Vercel preview
vercel

# Test preview deployment
# URL provided in console output
```

#### Production Deployment (Vercel)

```bash
cd frontend

# 1. Ensure all checks pass
make ci

# 2. Build production bundle
npm run build

# Verify build output
ls -lh .next/static/

# Check bundle size
npm run analyze

# 3. Deploy to production
vercel --prod

# 4. Verify deployment
# Note the deployment URL from output

# 5. Test critical paths
curl -I https://app.chioma.app
curl -I https://app.chioma.app/properties
curl -I https://app.chioma.app/user/dashboard

# 6. Test Web Vitals dashboard
curl https://app.chioma.app/vitals

# 7. Monitor for errors
# Check Vercel dashboard: https://vercel.com/chioma/frontend
# Watch for increase in error rate or client-side exceptions
```

#### Manual Production Deployment (Self-Hosted)

If deploying to your own infrastructure instead of Vercel:

```bash
cd frontend

# 1. Build production bundle
npm run build

# 2. Create Docker image
docker build -f Dockerfile -t chioma-frontend:$VERSION .

# 3. Push to registry
docker tag chioma-frontend:$VERSION $REGISTRY/chioma-frontend:$VERSION
docker push $REGISTRY/chioma-frontend:$VERSION

# 4. Deploy to Kubernetes
kubectl set image deployment/chioma-frontend \
  frontend=$REGISTRY/chioma-frontend:$VERSION \
  -n production

# 5. Monitor rollout
kubectl rollout status deployment/chioma-frontend -n production
```

#### Frontend Verification

```bash
# Test landing page
curl -s https://app.chioma.app | grep -o "<title>.*</title>"

# Test authentication flow (manual browser test)
# 1. Navigate to https://app.chioma.app/auth/login
# 2. Login with test account
# 3. Verify redirect to dashboard

# Test property listing wizard
# Navigate to: https://app.chioma.app/user/properties/add

# Check API integration
# Monitor browser console for errors
# Check Network tab for failed requests

# Verify Web Vitals
# Open https://app.chioma.app/vitals
# Confirm metrics are being collected
```

---

### Smart Contract Deployment

Soroban smart contracts deployed on Stellar (Testnet for staging, Mainnet for production).

#### Contract Build & Test

```bash
cd contract

# 1. Clean previous builds
cargo clean

# 2. Run all tests
cargo test --all

# 3. Run integration tests
cargo test -p integration-tests

# 4. Build release versions
cargo build --release --target wasm32-unknown-unknown

# 5. Optimize WASM
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/chioma.wasm

# 6. Verify optimized size
ls -lh target/wasm32-unknown-unknown/release/*.optimized.wasm
```

#### Testnet Deployment (Staging)

```bash
cd contract

# 1. Configure Stellar CLI for testnet
soroban config network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# 2. Load deployment account
source .env.testnet
soroban config identity add deployer \
  --secret-key $STELLAR_DEPLOYER_SECRET_KEY

# Fund account if needed
curl "https://friendbot.stellar.org?addr=$(soroban config identity address deployer)"

# 3. Deploy main contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/chioma.optimized.wasm \
  --source deployer \
  --network testnet > deployed-contract-id.txt

export CONTRACT_ID=$(cat deployed-contract-id.txt)
echo "Deployed chioma contract: $CONTRACT_ID"

# 4. Initialize contract
soroban contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  initialize \
  --admin $(soroban config identity address deployer) \
  --platform_fee_bps 250

# 5. Deploy supporting contracts
# Escrow contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow.optimized.wasm \
  --source deployer \
  --network testnet > escrow-contract-id.txt

# Agent registry
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/agent_registry.optimized.wasm \
  --source deployer \
  --network testnet > agent-registry-id.txt

# User profile
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/user_profile.optimized.wasm \
  --source deployer \
  --network testnet > user-profile-id.txt

# Dispute resolution
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/dispute_resolution.optimized.wasm \
  --source deployer \
  --network testnet > dispute-resolution-id.txt

# 6. Save contract addresses
cat > deployed-contracts-testnet.json <<EOF
{
  "network": "testnet",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$(soroban config identity address deployer)",
  "contracts": {
    "chioma": "$(cat deployed-contract-id.txt)",
    "escrow": "$(cat escrow-contract-id.txt)",
    "agent_registry": "$(cat agent-registry-id.txt)",
    "user_profile": "$(cat user-profile-id.txt)",
    "dispute_resolution": "$(cat dispute-resolution-id.txt)"
  }
}
EOF

# 7. Verify deployments
soroban contract invoke \
  --id $(cat deployed-contract-id.txt) \
  --network testnet \
  -- \
  get_platform_fee_bps

# 8. Update backend configuration
# Add contract IDs to backend .env.testnet
```

#### Mainnet Deployment (Production)

**⚠️ CRITICAL: Mainnet deployments are irreversible. Triple-check everything.**

```bash
cd contract

# 1. Final verification
./check-all.sh
cargo audit
cargo test --all --release

# 2. Configure mainnet network
soroban config network add mainnet \
  --rpc-url https://soroban-mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015"

# 3. Load production deployment account
source .env.mainnet.example  # Use real .env.mainnet, not example!
soroban config identity add mainnet-deployer \
  --secret-key $STELLAR_DEPLOYER_SECRET_KEY

# Verify account has sufficient XLM for fees
soroban config identity address mainnet-deployer
# Check balance at: https://stellar.expert/explorer/public

# 4. CHECKPOINT: Manual approval required
echo "⚠️  PRODUCTION DEPLOYMENT"
echo "Account: $(soroban config identity address mainnet-deployer)"
echo "Network: Mainnet"
echo "Press ENTER to continue or Ctrl-C to abort"
read

# 5. Deploy main contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/chioma.optimized.wasm \
  --source mainnet-deployer \
  --network mainnet > mainnet-contract-id.txt

export MAINNET_CONTRACT_ID=$(cat mainnet-contract-id.txt)
echo "🚀 Deployed chioma contract: $MAINNET_CONTRACT_ID"

# 6. Initialize contract
soroban contract invoke \
  --id $MAINNET_CONTRACT_ID \
  --source mainnet-deployer \
  --network mainnet \
  -- \
  initialize \
  --admin $(soroban config identity address mainnet-deployer) \
  --platform_fee_bps 250

# 7. Deploy supporting contracts
echo "Deploying escrow..."
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow.optimized.wasm \
  --source mainnet-deployer \
  --network mainnet > mainnet-escrow-id.txt

echo "Deploying agent_registry..."
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/agent_registry.optimized.wasm \
  --source mainnet-deployer \
  --network mainnet > mainnet-agent-registry-id.txt

echo "Deploying user_profile..."
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/user_profile.optimized.wasm \
  --source mainnet-deployer \
  --network mainnet > mainnet-user-profile-id.txt

echo "Deploying dispute_resolution..."
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/dispute_resolution.optimized.wasm \
  --source mainnet-deployer \
  --network mainnet > mainnet-dispute-resolution-id.txt

# 8. Save production contract addresses
cat > deployed-contracts-mainnet.json <<EOF
{
  "network": "mainnet",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$(soroban config identity address mainnet-deployer)",
  "contracts": {
    "chioma": "$(cat mainnet-contract-id.txt)",
    "escrow": "$(cat mainnet-escrow-id.txt)",
    "agent_registry": "$(cat mainnet-agent-registry-id.txt)",
    "user_profile": "$(cat mainnet-user-profile-id.txt)",
    "dispute_resolution": "$(cat mainnet-dispute-resolution-id.txt)"
  }
}
EOF

# 9. Commit contract addresses to git
git add deployed-contracts-mainnet.json
git commit -m "chore: add mainnet contract addresses"
git push

# 10. Verify all contracts
for contract in chioma escrow agent_registry user_profile dispute_resolution; do
  echo "Testing $contract..."
  CONTRACT_ID=$(jq -r ".contracts.$contract" deployed-contracts-mainnet.json)
  soroban contract invoke \
    --id $CONTRACT_ID \
    --network mainnet \
    -- \
    --help || echo "⚠️  $contract verification failed"
done

# 11. Update production backend config
# Add mainnet contract IDs to backend .env.production
# Deploy backend with new configuration
```

#### Contract Upgrade (If Supported)

If contracts are upgradeable:

```bash
# 1. Build new version
cargo build --release --target wasm32-unknown-unknown
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/chioma.wasm

# 2. Upgrade contract
soroban contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network mainnet \
  -- \
  upgrade \
  --new_wasm_hash $(soroban contract install \
    --wasm target/wasm32-unknown-unknown/release/chioma.optimized.wasm \
    --source admin \
    --network mainnet)

# 3. Verify upgrade
soroban contract invoke --id $CONTRACT_ID --network mainnet -- get_version
```

#### Emergency Contract Pause

If a critical bug is discovered:

```bash
# Pause contract to prevent new interactions
soroban contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network mainnet \
  -- \
  pause \
  --reason "Critical bug discovered in rent calculation"

# Verify paused
soroban contract invoke \
  --id $CONTRACT_ID \
  --network mainnet \
  -- \
  is_paused
# Should return: true

# Unpause after fix is deployed
soroban contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network mainnet \
  -- \
  unpause
```

---

### Infrastructure Deployment

Terraform manages all AWS infrastructure (VPC, EKS, RDS, ElastiCache, S3, backups, monitoring).

#### First-Time Bootstrap (One-time per AWS account)

```bash
# Create Terraform state backend
cd infrastructure/bootstrap

terraform init
terraform plan
terraform apply

# Outputs:
# - state_bucket: chioma-terraform-state
# - lock_table: chioma-terraform-locks
```

#### Infrastructure Changes

**⚠️ Infrastructure changes can cause outages. Test in staging first.**

```bash
cd infrastructure

# 1. Select environment
export ENV=staging  # or production

# 2. Initialize Terraform
terraform init \
  -backend-config=environments/$ENV.s3.tfbackend \
  -reconfigure

# 3. Validate configuration
terraform validate

# 4. Format check
terraform fmt -check -recursive

# 5. Plan changes
terraform plan \
  -var-file=environments/$ENV.tfvars \
  -out=$ENV.tfplan

# Review plan carefully, especially:
# - Any destroy operations (red -)
# - Database changes (could cause downtime)
# - Network changes (could break connectivity)
# - Security group changes (could block traffic)

# 6. Get approval
# For production: require second review of the plan
# Screenshot or save plan output

# 7. Apply changes
terraform apply $ENV.tfplan

# 8. Verify outputs
terraform output

# 9. Test connectivity
# VPC
aws ec2 describe-vpcs --vpc-ids $(terraform output -raw vpc_id)

# EKS
aws eks update-kubeconfig \
  --region $(terraform output -raw aws_region) \
  --name $(terraform output -raw eks_cluster_name)
kubectl get nodes

# RDS
aws rds describe-db-instances \
  --db-instance-identifier $(terraform output -raw rds_instance_id)

# ElastiCache
aws elasticache describe-cache-clusters \
  --cache-cluster-id $(terraform output -raw redis_cluster_id)
```

#### Common Infrastructure Operations

**Scaling EKS Node Group**

```bash
# Scale up
aws eks update-nodegroup-config \
  --cluster-name chioma-production \
  --nodegroup-name chioma-production-default \
  --scaling-config desiredSize=5,minSize=3,maxSize=10

# Verify
kubectl get nodes
```

**Upgrading RDS Instance**

```bash
# Create snapshot first
aws rds create-db-snapshot \
  --db-instance-identifier chioma-production-postgres \
  --db-snapshot-identifier pre-upgrade-$(date +%Y%m%d-%H%M%S)

# Modify instance (applied during maintenance window)
aws rds modify-db-instance \
  --db-instance-identifier chioma-production-postgres \
  --db-instance-class db.r6g.xlarge \
  --apply-immediately  # or leave off for maintenance window

# Monitor status
aws rds describe-db-instances \
  --db-instance-identifier chioma-production-postgres \
  --query 'DBInstances[0].DBInstanceStatus'
```

**Rotating Secrets**

```bash
# Rotate database password
aws secretsmanager rotate-secret \
  --secret-id chioma-production-db-master-password \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789:function:SecretsManagerRotation

# Rotate application JWT secret
# 1. Generate new secret
NEW_JWT_SECRET=$(openssl rand -base64 32)

# 2. Update Kubernetes secret
kubectl create secret generic chioma-backend-secrets \
  --from-literal=jwt_secret=$NEW_JWT_SECRET \
  --dry-run=client -o yaml | kubectl apply -f - -n production

# 3. Rolling restart
kubectl rollout restart deployment/chioma-backend -n production
```

---

## Environment-Specific Procedures

### Development Environment

- **Purpose:** Local development and testing
- **Infrastructure:** Docker Compose
- **Database:** PostgreSQL in Docker
- **Stellar Network:** Testnet
- **Deployment:** Automatic on file save (hot reload)

```bash
# Start full stack
docker-compose up -d

# Access services
# Backend: http://localhost:3000
# Frontend: http://localhost:3001
# Database: localhost:5432
# Redis: localhost:6379
```

### Staging Environment

- **Purpose:** Pre-production testing, QA validation
- **Infrastructure:** AWS EKS (smaller instances)
- **Database:** RDS PostgreSQL (db.t3.medium)
- **Stellar Network:** Testnet
- **Deployment:** Automatic on merge to `develop` branch

```bash
# Staging-specific configuration
export KUBECONFIG=~/.kube/staging-config
export AWS_PROFILE=chioma-staging

# Deploy to staging
kubectl apply -f backend/k8s/ -n staging
vercel --env=preview

# Run staging smoke tests
npm run test:smoke:staging
```

### Production Environment

- **Purpose:** Live customer traffic
- **Infrastructure:** AWS EKS (production-grade instances)
- **Database:** RDS PostgreSQL Multi-AZ (db.r6g.large)
- **Stellar Network:** Mainnet
- **Deployment:** Manual trigger after staging validation

```bash
# Production-specific configuration
export KUBECONFIG=~/.kube/production-config
export AWS_PROFILE=chioma-production

# Enable maintenance mode if needed
kubectl scale deployment/chioma-backend -n production --replicas=0

# Deploy to production (detailed steps in component sections above)

# Disable maintenance mode
kubectl scale deployment/chioma-backend -n production --replicas=3
```

---

## Verification & Health Checks

### Backend Health Checks

```bash
# Basic health endpoint
curl https://api.chioma.app/health
# Expected: {"status":"ok","timestamp":"..."}

# Database health
curl https://api.chioma.app/health/db
# Expected: {"status":"ok","database":"connected"}

# Redis health
curl https://api.chioma.app/health/redis
# Expected: {"status":"ok","redis":"connected"}

# Comprehensive health check
curl https://api.chioma.app/health/detailed
# Expected: Full system health including dependencies

# Check API version
curl https://api.chioma.app/v1/version
# Expected: {"version":"1.2.3","commit":"abc123"}
```

### Frontend Health Checks

```bash
# Homepage loads
curl -I https://app.chioma.app
# Expected: HTTP/2 200

# Critical pages
curl -I https://app.chioma.app/properties
curl -I https://app.chioma.app/auth/login
curl -I https://app.chioma.app/user/dashboard

# Web Vitals dashboard
curl -I https://app.chioma.app/vitals
# Expected: HTTP/2 200

# Check static assets
curl -I https://app.chioma.app/_next/static/css/app.css
# Expected: HTTP/2 200, cache headers present
```

### Smart Contract Health Checks

```bash
# Verify contract deployed
soroban contract invoke \
  --id $CONTRACT_ID \
  --network mainnet \
  -- \
  get_platform_fee_bps
# Expected: 250 (2.5%)

# Check pause status
soroban contract invoke \
  --id $CONTRACT_ID \
  --network mainnet \
  -- \
  is_paused
# Expected: false

# Test read-only query
soroban contract invoke \
  --id $CONTRACT_ID \
  --network mainnet \
  -- \
  get_property \
  --property_id "test-property-id"
```

### Database Health Checks

```bash
# Connection test
kubectl exec -n production deployment/chioma-backend -- \
  npm run db:monitor:health

# Check replication lag (Multi-AZ)
aws rds describe-db-instances \
  --db-instance-identifier chioma-production-postgres \
  --query 'DBInstances[0].SecondaryAvailabilityZone'

# Check storage
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=chioma-production-postgres \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### Monitoring & Metrics

```bash
# Prometheus targets
curl -s http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health!="up")'
# Expected: empty (all targets healthy)

# Check for active alerts
curl -s http://alertmanager:9093/api/v1/alerts | jq '.data[] | select(.status.state=="firing")'
# Expected: empty (no firing alerts)

# Key metrics
curl -s 'http://prometheus:9090/api/v1/query?query=up{job="chioma-backend"}' | jq
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total[5m])' | jq
curl -s 'http://prometheus:9090/api/v1/query?query=http_request_duration_seconds_bucket' | jq
```

### Load Testing (Post-Deployment)

```bash
cd backend

# Quick load test
npm run perf:load

# Comprehensive performance test
npm run perf:comprehensive

# Generate HTML report
npm run perf:local
# Open backend/performance/reports/index.html
```

---

## Rollback Procedures

### Backend Rollback

**Option 1: Kubernetes Rollout Undo (Recommended)**

```bash
# Check rollout history
kubectl rollout history deployment/chioma-backend -n production

# Rollback to previous version
kubectl rollout undo deployment/chioma-backend -n production

# Verify rollback
kubectl rollout status deployment/chioma-backend -n production

# Check pods
kubectl get pods -n production -l app=chioma-backend

# Verify health
curl https://api.chioma.app/health
```

**Option 2: Rollback to Specific Revision**

```bash
# View revision history with details
kubectl rollout history deployment/chioma-backend -n production --revision=5

# Rollback to specific revision
kubectl rollout undo deployment/chioma-backend \
  -n production \
  --to-revision=5

# Verify
kubectl rollout status deployment/chioma-backend -n production
```

**Option 3: Manual Image Rollback**

```bash
# Get previous working image
PREVIOUS_IMAGE="123456789.dkr.ecr.us-east-1.amazonaws.com/chioma-backend:v1.2.3"

# Update deployment
kubectl set image deployment/chioma-backend \
  backend=$PREVIOUS_IMAGE \
  -n production

# Verify rollback
kubectl rollout status deployment/chioma-backend -n production
```

**Database Migration Rollback**

```bash
# If migrations were run, may need to revert
kubectl exec -n production deployment/chioma-backend -- \
  npm run migration:revert

# Verify schema
kubectl exec -n production deployment/chioma-backend -- \
  npm run migration:show
```

### Frontend Rollback

**Vercel Rollback**

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback

# Or rollback to specific deployment
vercel rollback <deployment-url>

# Verify
curl -I https://app.chioma.app
```

**Self-Hosted Kubernetes Rollback**

```bash
kubectl rollout undo deployment/chioma-frontend -n production
kubectl rollout status deployment/chioma-frontend -n production
```

### Smart Contract Rollback

**⚠️ Smart contracts cannot be rolled back once deployed.**

**Option 1: Pause Contract**

```bash
# Emergency pause
soroban contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network mainnet \
  -- \
  pause \
  --reason "Critical bug - rolling back"

# Verify paused
soroban contract invoke \
  --id $CONTRACT_ID \
  --network mainnet \
  -- \
  is_paused
# Expected: true
```

**Option 2: Deploy Fixed Version**

```bash
# Fix the bug
# Build and test thoroughly
# Deploy new version with upgrade mechanism

soroban contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network mainnet \
  -- \
  upgrade \
  --new_wasm_hash $NEW_WASM_HASH
```

**Option 3: Deploy New Contract & Migrate**

```bash
# Deploy fixed contract as new instance
soroban contract deploy \
  --wasm contracts/chioma_fixed.optimized.wasm \
  --source admin \
  --network mainnet > new-contract-id.txt

# Migrate state (if needed)
# Update backend to point to new contract
# Communicate change to users
```

### Infrastructure Rollback

```bash
cd infrastructure

# View Terraform state history
terraform state list

# Rollback to previous Terraform version
git log --oneline infrastructure/
git checkout <previous-commit> infrastructure/

# Plan the rollback
terraform plan \
  -var-file=environments/production.tfvars \
  -out=rollback.tfplan

# Review carefully - ensure no data loss

# Apply rollback
terraform apply rollback.tfplan

# Verify infrastructure
kubectl get nodes
aws rds describe-db-instances
```

---

## Post-Deployment Tasks

### Immediate (Within 1 Hour)

- [ ] **Monitor Error Rates** - Watch for spikes in 5xx errors
- [ ] **Check Latency** - Verify p95 response time < 500ms
- [ ] **Review Logs** - Search for ERROR/WARN patterns
- [ ] **Test Critical Paths** - Manually test login, property search, payment flow
- [ ] **Verify Metrics Collection** - Confirm Prometheus scraping, Grafana dashboards updating
- [ ] **Check Auto-Scaling** - Verify HPA responding to load correctly
- [ ] **Monitor Database** - Check connection pool, query times, replication lag
- [ ] **Update Status Page** - Mark deployment complete, clear maintenance message

### Within 24 Hours

- [ ] **Review Analytics** - Check for drop in user engagement/conversions
- [ ] **Monitor Payment Success Rate** - Ensure no regression in payment completions
- [ ] **Check Contract Interactions** - Verify on-chain transactions completing
- [ ] **Review User Reports** - Check support channels for new issues
- [ ] **Validate Backups** - Confirm automated backups running post-deployment
- [ ] **Update Documentation** - Document any new environment variables, config changes
- [ ] **Team Communication** - Share deployment summary in team channel

### Within 1 Week

- [ ] **Performance Review** - Compare metrics to pre-deployment baseline
- [ ] **Cost Analysis** - Review AWS costs for any unexpected increases
- [ ] **Security Scan** - Run security audit on new code
- [ ] **Update Runbooks** - Document any new procedures discovered
- [ ] **Retrospective** - Team meeting to discuss what went well/poorly
- [ ] **Plan Next Deployment** - Schedule and prepare for next release

---

## Troubleshooting

### Deployment Failures

**Pods Not Starting**

```bash
# Check pod status
kubectl get pods -n production -l app=chioma-backend

# Describe failing pod
kubectl describe pod <pod-name> -n production

# Common issues:
# - Image pull errors: Check registry credentials
# - Crash loop: Check application logs
# - Resource limits: Check node capacity
# - Config errors: Check environment variables/secrets

# Check pod logs
kubectl logs <pod-name> -n production
kubectl logs <pod-name> -n production --previous  # If pod crashed

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'
```

**Database Connection Failures**

```bash
# Test database connectivity from pod
kubectl exec -n production deployment/chioma-backend -- \
  psql $DATABASE_URL -c "SELECT 1;"

# Check database status
aws rds describe-db-instances \
  --db-instance-identifier chioma-production-postgres

# Check security groups
aws ec2 describe-security-groups \
  --group-ids <db-security-group-id>

# Check connection pool
kubectl logs -n production -l app=chioma-backend | grep "pool"
```

**High Error Rates**

```bash
# Check error logs
kubectl logs -n production -l app=chioma-backend | grep ERROR

# Check specific error types
kubectl logs -n production -l app=chioma-backend | grep "StatusCode: 500"

# Check recent deployments
kubectl rollout history deployment/chioma-backend -n production

# If caused by recent deploy: ROLLBACK IMMEDIATELY
kubectl rollout undo deployment/chioma-backend -n production
```

**Slow Response Times**

```bash
# Check pod resource usage
kubectl top pods -n production -l app=chioma-backend

# Check database performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=chioma-production-postgres \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Maximum

# Check slow queries
kubectl exec -n production deployment/chioma-backend -- \
  npm run db:monitor:slow-queries

# Scale up if needed
kubectl scale deployment/chioma-backend -n production --replicas=6
```

**Container Build Failures**

```bash
# Check Docker daemon
docker info

# Verify Dockerfile syntax
docker build -f Dockerfile.production --no-cache .

# Check disk space
df -h

# Clear Docker cache
docker system prune -af

# Check build logs
docker build -f Dockerfile.production -t test:latest . 2>&1 | tee build.log
```

**Contract Deployment Failures**

```bash
# Check Stellar network status
curl https://horizon.stellar.org/

# Check account balance
soroban config identity address deployer
# Verify at: https://stellar.expert/explorer/public

# Check network configuration
soroban config network list

# Increase verbosity
soroban --very-verbose contract deploy \
  --wasm contracts/chioma.wasm \
  --source deployer \
  --network mainnet
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ImagePullBackOff` | Cannot pull Docker image | Check registry credentials, verify image exists |
| `CrashLoopBackOff` | Application crashes on startup | Check logs for startup errors, verify env vars |
| `OOMKilled` | Pod exceeded memory limit | Increase memory limits, check for memory leaks |
| `ErrImagePull` | Image not found | Verify image tag, check registry URL |
| `CreateContainerConfigError` | Invalid container config | Check secret/configmap exists and is valid |
| `FailedScheduling` | Cannot schedule pod | Check node capacity, resource requests |
| `ECONNREFUSED` | Cannot connect to database/redis | Check network, security groups, credentials |
| `Migration failed` | Database migration error | Check migration files, database schema state |
| `RATE_LIMIT_EXCEEDED` | Too many API requests | Check for loops, increase rate limits |
| `STELLAR_TIMEOUT` | Stellar network timeout | Check network status, retry with backoff |

---

## Emergency Contacts

### On-Call Rotation

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| Primary On-Call Engineer | PagerDuty | Immediate |
| Secondary On-Call | PagerDuty +15min | 15 minutes |
| Engineering Lead | Slack + Phone | 30 minutes (SEV1 only) |
| DevOps Lead | Slack + Phone | 30 minutes (infrastructure issues) |
| Product Owner | Slack | 1 hour (customer impact) |

### Team Contacts

```
Backend Team:     #backend-team
Frontend Team:    #frontend-team
Contracts Team:   #blockchain-team
DevOps Team:      #devops-infra
Incident Channel: #incidents
Status Page:      https://status.chioma.app
```

### External Vendors

| Service | Support | SLA |
|---------|---------|-----|
| AWS | AWS Support (Premium) | 15 min response (critical) |
| Vercel | support@vercel.com | 1 hour (Pro plan) |
| Stellar Network | https://status.stellar.org | Community support |
| PagerDuty | support@pagerduty.com | 24/7 |

### Escalation Process

1. **SEV3 (Minor)** - Normal business hours, regular Slack
2. **SEV2 (Major)** - Create #incident channel, page on-call
3. **SEV1 (Critical)** - Page on-call immediately, notify leadership, update status page every 15 min

---

## Appendix

### Related Documentation

- [Backend Deployment Guide](backend/DEPLOYMENT_GUIDE.md) - Detailed backend procedures
- [Infrastructure Setup](backend/INFRASTRUCTURE_SETUP.md) - Initial infrastructure setup
- [Disaster Recovery Plan](docs/disaster-recovery-plan.md) - DR procedures and RPO/RTO targets
- [Incident Response Runbooks](docs/incident-response-runbooks.md) - Incident handling procedures
- [Troubleshooting Guide](docs/troubleshooting-guide.md) - Development troubleshooting
- [API Documentation](backend/API.md) - API reference
- [Contract Documentation](contract/README.md) - Smart contract details

### Deployment Checklist Template

Copy this checklist for each production deployment:

```markdown
## Deployment: [Feature Name] - [Date]

### Pre-Deployment
- [ ] All tests passing
- [ ] Code review approved
- [ ] Staging deployed and tested
- [ ] Database migrations reviewed
- [ ] Secrets updated (if needed)
- [ ] Team notified (24h advance)
- [ ] Rollback plan documented
- [ ] On-call engineer identified

### Deployment
- [ ] Maintenance mode enabled (if needed)
- [ ] Database backup created
- [ ] Backend deployed (image: ______)
- [ ] Frontend deployed
- [ ] Contracts deployed (if applicable)
- [ ] Health checks passed
- [ ] Smoke tests passed
- [ ] Maintenance mode disabled

### Post-Deployment
- [ ] Error rates normal (<1%)
- [ ] Response times normal (<500ms p95)
- [ ] No alerts firing
- [ ] Critical paths tested manually
- [ ] Status page updated
- [ ] Team notified of completion
- [ ] Documentation updated

### Rollback (if needed)
- [ ] Rollback triggered at: _____
- [ ] Rollback method: _____
- [ ] Rollback completed at: _____
- [ ] Incident report filed: _____
```

### Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-10-19 | AI | Initial comprehensive runbook |

---

**End of Deployment Runbook**
