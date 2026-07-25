# Infrastructure as Code

Docker, Docker Compose, Kubernetes, Terraform, environment variable management, secrets handling, CI/CD integration, and best practices for the Chioma platform infrastructure.

---

## Table of Contents

1. [Docker](#1-docker)
2. [Docker Compose](#2-docker-compose)
3. [Kubernetes](#3-kubernetes)
4. [Terraform](#4-terraform)
5. [Environment Variables](#5-environment-variables)
6. [Secrets Management](#6-secrets-management)
7. [CI/CD Integration](#7-cicd-integration)
8. [Best Practices](#8-best-practices)
9. [Troubleshooting](#9-troubleshooting)
10. [Examples](#10-examples)

---

## 1. Docker

### 1.1 Image Structure

Chioma uses multi-stage Docker builds to minimize image size and separate build-time from runtime dependencies.

#### Backend Dockerfile

```dockerfile
# backend/Dockerfile

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Security: run as non-root user
RUN addgroup -S chioma && adduser -S chioma -G chioma

WORKDIR /app

# Copy only what the runtime needs
COPY --from=builder --chown=chioma:chioma /app/dist ./dist
COPY --from=builder --chown=chioma:chioma /app/node_modules ./node_modules
COPY --from=builder --chown=chioma:chioma /app/package.json ./package.json

USER chioma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

#### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .

# Build args for public env vars (not secrets)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STELLAR_NETWORK

RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN addgroup -S chioma && adduser -S chioma -G chioma

WORKDIR /app

COPY --from=builder --chown=chioma:chioma /app/.next ./.next
COPY --from=builder --chown=chioma:chioma /app/public ./public
COPY --from=builder --chown=chioma:chioma /app/node_modules ./node_modules
COPY --from=builder --chown=chioma:chioma /app/package.json ./package.json

USER chioma

EXPOSE 5000

CMD ["npm", "start"]
```

### 1.2 Building Images

```bash
# Backend
docker build -t chioma-backend:latest ./backend

# Frontend (with build args)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.chioma.app \
  --build-arg NEXT_PUBLIC_STELLAR_NETWORK=testnet \
  -t chioma-frontend:latest ./frontend

# Tag for a registry
docker tag chioma-backend:latest ghcr.io/chioma-housing-protocol-i/chioma/backend:latest
docker push ghcr.io/chioma-housing-protocol-i/chioma/backend:latest
```

### 1.3 Image Tagging Convention

| Tag           | When to use                          |
| ------------- | ------------------------------------ |
| `latest`      | Most recent stable build from `main` |
| `v1.2.3`      | Semantic version release             |
| `sha-abc1234` | Specific git commit (used in CI)     |
| `staging`     | Current staging deployment           |

Always pin production deployments to a specific tag or SHA — never use `latest` in Kubernetes manifests.

---

## 2. Docker Compose

### 2.1 Local Development Stack

```yaml
# docker-compose.yml (repository root)

version: "3.9"

services:
  backend:
    build:
      context: ./backend
      target: builder # Use builder stage for hot-reload
    command: npm run start:dev
    ports:
      - "3000:3000"
      - "9229:9229" # Node.js inspector
    volumes:
      - ./backend/src:/app/src # Mount source for hot-reload
    env_file:
      - ./backend/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      target: builder
    command: npm run dev
    ports:
      - "5000:5000"
    volumes:
      - ./frontend/app:/app/app
      - ./frontend/components:/app/components
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
      - NEXT_PUBLIC_STELLAR_NETWORK=testnet
    depends_on:
      - backend
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: chioma_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/database/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
```

### 2.2 Common Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Restart a single service
docker compose restart backend

# Run database migrations inside the container
docker compose exec backend npm run migration:run

# Open a PostgreSQL shell
docker compose exec postgres psql -U postgres chioma_db

# Stop and remove containers (keep volumes)
docker compose down

# Stop and remove containers and volumes (full reset)
docker compose down -v
```

### 2.3 Production Override

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  backend:
    image: ghcr.io/chioma-housing-protocol-i/chioma/backend:${IMAGE_TAG}
    command: node dist/main.js
    environment:
      NODE_ENV: production
    restart: always
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 15s
        failure_action: rollback

  frontend:
    image: ghcr.io/chioma-housing-protocol-i/chioma/frontend:${IMAGE_TAG}
    restart: always
```

```bash
# Deploy to production
IMAGE_TAG=v1.2.3 docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 3. Kubernetes

### 3.1 Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: chioma
  labels:
    app.kubernetes.io/name: chioma
```

### 3.2 Backend Deployment

```yaml
# k8s/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chioma-backend
  namespace: chioma
  labels:
    app: chioma-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: chioma-backend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0 # Zero-downtime rolling update
      maxSurge: 1
  template:
    metadata:
      labels:
        app: chioma-backend
    spec:
      serviceAccountName: chioma-backend
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: backend
          image: ghcr.io/chioma-housing-protocol-i/chioma/backend:v1.2.3
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: chioma-backend-config
            - secretRef:
                name: chioma-backend-secrets
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 15
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"] # Drain in-flight requests
```

### 3.3 Service and Ingress

```yaml
# k8s/backend/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: chioma-backend
  namespace: chioma
spec:
  selector:
    app: chioma-backend
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
# k8s/backend/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chioma-backend
  namespace: chioma
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.chioma.app
      secretName: chioma-tls
  rules:
    - host: api.chioma.app
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: chioma-backend
                port:
                  number: 80
```

### 3.4 ConfigMap and Secrets

```yaml
# k8s/backend/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chioma-backend-config
  namespace: chioma
data:
  NODE_ENV: "production"
  PORT: "3000"
  STELLAR_NETWORK: "mainnet"
  SOROBAN_RPC_URL: "https://soroban-rpc.stellar.org"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  METRICS_ENABLED: "true"
```

> Secrets are injected separately — see [Secrets Management](#6-secrets-management).

### 3.5 Database Migrations as a Kubernetes Job

```yaml
# k8s/jobs/migration.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: chioma-migration-v1-2-3
  namespace: chioma
spec:
  backoffLimit: 2
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migration
          image: ghcr.io/chioma-housing-protocol-i/chioma/backend:v1.2.3
          command: ["node", "dist/database/run-migrations.js"]
          envFrom:
            - configMapRef:
                name: chioma-backend-config
            - secretRef:
                name: chioma-backend-secrets
```

```bash
# Apply and wait for completion
kubectl apply -f k8s/jobs/migration.yaml
kubectl wait --for=condition=complete job/chioma-migration-v1-2-3 -n chioma --timeout=120s
kubectl logs job/chioma-migration-v1-2-3 -n chioma
```

### 3.6 Horizontal Pod Autoscaler

```yaml
# k8s/backend/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chioma-backend
  namespace: chioma
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chioma-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## 4. Terraform

### 4.1 Structure

```
infrastructure/
├── main.tf               # Root module
├── variables.tf          # Input variables
├── outputs.tf            # Output values
├── terraform.tfvars      # Variable values (gitignored)
├── versions.tf           # Provider version locks
└── modules/
    ├── networking/       # VPC, subnets, security groups
    ├── database/         # RDS PostgreSQL instance
    ├── cache/            # ElastiCache Redis cluster
    ├── kubernetes/       # EKS cluster
    └── storage/          # S3 buckets, IAM policies
```

### 4.2 Provider Configuration

```hcl
# infrastructure/versions.tf
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket         = "chioma-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "chioma-terraform-locks"
  }
}
```

### 4.3 RDS Module Example

```hcl
# infrastructure/modules/database/main.tf
resource "aws_db_instance" "chioma_postgres" {
  identifier        = "chioma-${var.environment}-postgres"
  engine            = "postgres"
  engine_version    = "16.2"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_storage_gb
  storage_encrypted = true

  db_name  = "chioma_db"
  username = var.db_username
  password = var.db_password  # Injected from AWS Secrets Manager

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection      = var.environment == "production"
  skip_final_snapshot      = var.environment != "production"
  final_snapshot_identifier = "chioma-${var.environment}-final"

  performance_insights_enabled = true

  tags = local.common_tags
}
```

### 4.4 Terraform Workflow

```bash
# Initialize (first time or after provider changes)
terraform -chdir=infrastructure init

# Preview changes
terraform -chdir=infrastructure plan -var-file=terraform.tfvars

# Apply changes
terraform -chdir=infrastructure apply -var-file=terraform.tfvars

# Destroy (non-production only)
terraform -chdir=infrastructure destroy -var-file=terraform.tfvars

# Show current state
terraform -chdir=infrastructure show

# Import existing resource
terraform -chdir=infrastructure import aws_s3_bucket.assets chioma-prod-assets
```

### 4.5 State Management

- Remote state is stored in an S3 bucket with versioning enabled.
- DynamoDB table `chioma-terraform-locks` prevents concurrent applies.
- Never commit `terraform.tfstate` or `terraform.tfvars` to git.

---

## 5. Environment Variables

### 5.1 Variable Categories

| Category           | Prefix                        | Example                                            |
| ------------------ | ----------------------------- | -------------------------------------------------- |
| Database           | `DB_`                         | `DB_HOST`, `DB_PORT`                               |
| Authentication     | `JWT_`                        | `JWT_SECRET`, `JWT_EXPIRATION`                     |
| Stellar/Blockchain | `STELLAR_`, `SOROBAN_`        | `STELLAR_NETWORK`, `CHIOMA_CONTRACT_ID`            |
| Storage            | `AWS_`                        | `AWS_S3_BUCKET`, `AWS_REGION`                      |
| Cache / Queue      | `REDIS_`, `BULL_`             | `REDIS_HOST`, `BULL_QUEUE_EMAIL_ATTEMPTS`          |
| Payment Gateways   | `PAYSTACK_`, `FLUTTERWAVE_`   | `PAYSTACK_SECRET_KEY`                              |
| Monitoring         | `SENTRY_`, `LOG_`, `METRICS_` | `SENTRY_DSN`, `LOG_LEVEL`                          |
| Security           | `SECURITY_`                   | `SECURITY_ENCRYPTION_KEY`, `SECURITY_CSRF_ENABLED` |
| Frontend Public    | `NEXT_PUBLIC_`                | `NEXT_PUBLIC_API_URL`                              |

### 5.2 Environment Tiers

| Tier               | File                          | Committed to Git         |
| ------------------ | ----------------------------- | ------------------------ |
| Local development  | `.env`                        | No — gitignored          |
| Template           | `.env.example`                | Yes — sanitized defaults |
| CI/CD              | Repository secrets            | No                       |
| Staging/Production | Kubernetes Secrets or AWS SSM | No                       |

### 5.3 Validation at Startup

Validate required variables at application start so failures are immediate and clear:

```typescript
// backend/src/config/env.validation.ts
import { plainToClass } from "class-transformer";
import { IsString, IsNumber, IsIn, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsIn(["development", "staging", "production", "test"])
  NODE_ENV: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  SECURITY_ENCRYPTION_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated);
  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n${errors.toString()}`);
  }
  return validated;
}
```

Register in `AppModule`:

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  validate,
  envFilePath: ".env",
});
```

---

## 6. Secrets Management

### 6.1 Principles

- Secrets are **never committed to git** (not even in example files with real values).
- Secrets are **never logged** — mask them in Winston and Sentry configurations.
- Secrets are **rotated** on suspected compromise and on a regular schedule.
- Access to production secrets is **audited**.

### 6.2 Local Development

Use a `.env` file (gitignored). Copy from the sanitized template:

```bash
cp backend/.env.example backend/.env
# Fill in real values for local dev
```

For team-shared secrets (e.g., a shared dev database), use a secrets manager like **1Password CLI** or **Doppler**:

```bash
# Doppler example
doppler setup
doppler run -- npm run start:dev
```

### 6.3 Kubernetes Secrets

```bash
# Create a secret from literal values
kubectl create secret generic chioma-backend-secrets \
  --namespace chioma \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --from-literal=SECURITY_ENCRYPTION_KEY="$ENCRYPTION_KEY"

# Or from a .env file (do NOT commit this file)
kubectl create secret generic chioma-backend-secrets \
  --namespace chioma \
  --from-env-file=./secrets.env
```

**Best practice:** Use [External Secrets Operator](https://external-secrets.io/) to sync secrets from AWS Secrets Manager or HashiCorp Vault into Kubernetes Secrets automatically.

```yaml
# k8s/backend/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: chioma-backend-secrets
  namespace: chioma
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: chioma-backend-secrets
  data:
    - secretKey: JWT_SECRET
      remoteRef:
        key: chioma/production/backend
        property: jwt_secret
    - secretKey: DB_PASSWORD
      remoteRef:
        key: chioma/production/database
        property: password
```

### 6.4 AWS Secrets Manager

```bash
# Create a secret
aws secretsmanager create-secret \
  --name chioma/production/backend \
  --secret-string '{"jwt_secret":"...","db_password":"..."}'

# Retrieve in application (preferred: inject via ExternalSecret)
aws secretsmanager get-secret-value \
  --secret-id chioma/production/backend \
  --query SecretString \
  --output text | jq .
```

### 6.5 Secret Rotation

1. Generate a new secret value.
2. Update the secret in the secrets manager.
3. Restart application pods to pick up the new value (or use live reload if supported).
4. Confirm application health after rotation.
5. Invalidate old sessions / tokens if rotating JWT secrets.

---

## 7. CI/CD Integration

### 7.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: chioma-housing-protocol-i/chioma

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: chioma_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run migrations
        working-directory: backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: password
          DB_NAME: chioma_test
        run: npm run migration:run

      - name: Run tests
        working-directory: backend
        run: npm run test:cov

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBECONFIG }}

      - name: Run database migrations
        run: |
          kubectl apply -f k8s/jobs/migration.yaml
          kubectl wait --for=condition=complete job/chioma-migration \
            -n chioma --timeout=120s

      - name: Deploy backend
        run: |
          kubectl set image deployment/chioma-backend \
            backend=${{ needs.build-and-push.outputs.image-tag }} \
            -n chioma
          kubectl rollout status deployment/chioma-backend -n chioma
```

### 7.2 IaC Changes in CI

```yaml
terraform:
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: infrastructure
  steps:
    - uses: actions/checkout@v4

    - uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: "1.6"

    - name: Terraform Init
      run: terraform init

    - name: Terraform Plan
      run: terraform plan -no-color -out=tfplan
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

    - name: Post plan to PR
      uses: actions/github-script@v7
      with:
        script: |
          const plan = require('fs').readFileSync('infrastructure/tfplan.txt', 'utf8');
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `\`\`\`terraform\n${plan}\n\`\`\``
          });
```

---

## 8. Best Practices

### 8.1 Immutable Infrastructure

- Never modify a running container or instance in place — always redeploy.
- Pin image tags to specific SHAs in production manifests; use `latest` only in development.
- Store all infrastructure state in version control; no manual console changes.

### 8.2 Least-Privilege IAM

```json
// IAM policy for the backend service account (S3 only)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::chioma-prod-assets/*"
    }
  ]
}
```

Use IRSA (IAM Roles for Service Accounts) in EKS so pods get credentials automatically without static keys.

### 8.3 Resource Limits

Always set `requests` and `limits` on Kubernetes containers. Missing limits lead to noisy-neighbor problems:

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
```

### 8.4 Health Checks

Every service must expose:

- `GET /health` — liveness probe (is the process alive?)
- `GET /health/detailed` — readiness probe (is it ready to serve traffic?)

### 8.5 Graceful Shutdown

```typescript
// backend/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Handle SIGTERM from Kubernetes
  process.on("SIGTERM", async () => {
    await app.close();
    process.exit(0);
  });

  await app.listen(process.env.PORT ?? 3000);
}
```

### 8.6 Avoid Storing Secrets in Environment Variables Directly in Manifests

```yaml
# ❌ Secret value visible in manifest
env:
  - name: JWT_SECRET
    value: "my-secret-value"

# ✅ Reference from a Kubernetes Secret
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: chioma-backend-secrets
        key: JWT_SECRET
```

### 8.7 Use `.dockerignore`

```dockerignore
node_modules
.git
.env
*.env.local
dist
coverage
logs
*.log
.DS_Store
```

---

## 9. Troubleshooting

### Container Fails to Start

```bash
# Check pod status and events
kubectl describe pod <pod-name> -n chioma

# View container logs (including crash logs)
kubectl logs <pod-name> -n chioma --previous

# Common causes:
# - Missing required environment variable → check ConfigMap and Secret
# - Image pull failure → verify registry credentials and tag
# - OOMKilled → increase memory limit
# - CrashLoopBackOff → application error at startup (check logs)
```

### Migration Job Fails

```bash
# Get job logs
kubectl logs job/chioma-migration -n chioma

# Delete job and re-apply
kubectl delete job chioma-migration -n chioma
kubectl apply -f k8s/jobs/migration.yaml
```

### Docker Build Fails

```bash
# Build with verbose output
docker build --progress=plain -t chioma-backend:debug ./backend 2>&1 | tee build.log

# Common causes:
# - npm ci fails → delete node_modules locally and retry
# - TypeScript errors → run npm run build locally first
# - COPY target not found → check Dockerfile paths and .dockerignore
```

### Terraform Plan Shows Unexpected Destroy

```bash
# Inspect state
terraform state list
terraform state show aws_db_instance.chioma_postgres

# Import if resource exists but is not in state
terraform import aws_db_instance.chioma_postgres chioma-prod-postgres

# Use -target to apply selectively
terraform apply -target=aws_db_instance.chioma_postgres
```

### Redis Connection Refused in Kubernetes

```bash
# Test connectivity from the backend pod
kubectl exec -it <backend-pod> -n chioma -- redis-cli -h $REDIS_HOST ping

# If using Upstash, verify REDIS_URL and REDIS_TOKEN are set in secrets
kubectl get secret chioma-backend-secrets -n chioma -o jsonpath='{.data.REDIS_URL}' | base64 -d
```

---

## 10. Examples

### Example: Full Local Setup from Scratch

```bash
# 1. Clone and install
git clone https://github.com/chioma-housing-protocol-i/chioma.git
cd chioma
cp backend/.env.example backend/.env
# Edit backend/.env with local values

# 2. Start infrastructure
docker compose up -d postgres redis elasticsearch

# 3. Run migrations
cd backend
npm ci
npm run migration:run

# 4. Seed admin user
npm run seed:admin

# 5. Start services
npm run start:dev &
cd ../frontend && npm run dev
```

### Example: Kubernetes Rolling Deployment

```bash
# Tag and push new image
docker build -t ghcr.io/chioma-housing-protocol-i/chioma/backend:v1.3.0 ./backend
docker push ghcr.io/chioma-housing-protocol-i/chioma/backend:v1.3.0

# Run migration job first
kubectl apply -f k8s/jobs/migration-v1-3-0.yaml
kubectl wait --for=condition=complete job/chioma-migration-v1-3-0 -n chioma --timeout=120s

# Roll out new deployment
kubectl set image deployment/chioma-backend \
  backend=ghcr.io/chioma-housing-protocol-i/chioma/backend:v1.3.0 \
  -n chioma

# Monitor rollout
kubectl rollout status deployment/chioma-backend -n chioma

# Rollback if needed
kubectl rollout undo deployment/chioma-backend -n chioma
```

### Example: Adding a New Environment Variable

1. Add to `backend/.env.example` with a placeholder value and comment.
2. Add validation to `env.validation.ts`.
3. Add to the Kubernetes ConfigMap (non-sensitive) or create/update the Secret (sensitive).
4. Update the Terraform `variables.tf` if it affects infrastructure provisioning.
5. Document the variable in this file under [Environment Variables](#5-environment-variables).

---

## Related Documentation

- [Database Migration Standards](database-migration-standards.md)
- [Database Performance Optimization](database-performance-optimization.md)
- [Debugging Guide](debugging-guide.md)
