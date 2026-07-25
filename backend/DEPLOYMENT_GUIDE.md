# Deployment Guide: Load Balancing, Auto-Scaling & Graceful Shutdown

This guide provides step-by-step instructions for deploying the Chioma backend with load balancing, auto-scaling, and graceful shutdown capabilities.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Development Setup](#local-development-setup)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Verification](#verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Deployment Monitoring](#post-deployment-monitoring)

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests pass: `make test`
- [ ] Linting passes: `make lint`
- [ ] Type checking passes: `make typecheck`
- [ ] Code formatting verified: `make format-check`
- [ ] No security vulnerabilities: `make security-lint`
- [ ] Coverage meets threshold: `make test-cov`

### Infrastructure

- [ ] Kubernetes cluster available and accessible
- [ ] kubectl configured and authenticated
- [ ] Docker registry accessible
- [ ] Prometheus and AlertManager running
- [ ] Grafana configured
- [ ] Database backups created
- [ ] Redis backups created

### Configuration

- [ ] Environment variables documented
- [ ] Secrets created in Kubernetes
- [ ] ConfigMaps created in Kubernetes
- [ ] SSL/TLS certificates valid
- [ ] DNS records updated
- [ ] Load balancer configured

### Documentation

- [ ] Runbooks created for all alerts
- [ ] Team trained on new infrastructure
- [ ] Monitoring dashboards configured
- [ ] Incident response plan updated
- [ ] Rollback procedures documented

## Local Development Setup

### 1. Build Docker Image

```bash
cd backend

# Build production image
docker build -f Dockerfile.production -t chioma-backend:latest .

# Verify image
docker images | grep chioma-backend
```

### 2. Start Services with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f backend
```

### 3. Test Load Balancing

```bash
# Check Nginx upstream
curl -v http://localhost/health

# Check backend directly
curl -v http://localhost:3000/health

# Test rate limiting
for i in {1..30}; do curl http://localhost/api/test; done
```

### 4. Test Graceful Shutdown

```bash
# Get container ID
CONTAINER_ID=$(docker-compose ps -q backend)

# Send SIGTERM
docker kill --signal=SIGTERM $CONTAINER_ID

# Watch logs for graceful shutdown
docker-compose logs backend | grep -i shutdown
```

### 5. Stop Services

```bash
docker-compose -f docker-compose.production.yml down
```

## Staging Deployment

### 1. Create Namespace

```bash
kubectl create namespace staging
```

### 2. Create Secrets

```bash
# Load environment variables
source .env.staging

# Create secrets
kubectl create secret generic chioma-backend-secrets \
  --from-literal=database_url=$DATABASE_URL \
  --from-literal=redis_url=$REDIS_URL \
  --from-literal=jwt_secret=$JWT_SECRET \
  --from-literal=jwt_refresh_secret=$JWT_REFRESH_SECRET \
  --from-literal=sentry_dsn=$SENTRY_DSN \
  --from-literal=stellar_admin_secret_key=$STELLAR_ADMIN_SECRET_KEY \
  --from-literal=aws_access_key_id=$AWS_ACCESS_KEY_ID \
  --from-literal=aws_secret_access_key=$AWS_SECRET_ACCESS_KEY \
  -n staging

# Verify secrets
kubectl get secrets -n staging
```

### 3. Create ConfigMap

```bash
kubectl create configmap chioma-backend-config \
  --from-literal=db_host=postgres.staging.svc.cluster.local \
  --from-literal=db_port=5432 \
  --from-literal=db_name=chioma_staging \
  --from-literal=aws_region=us-east-1 \
  --from-literal=aws_s3_bucket=chioma-staging \
  -n staging

# Verify ConfigMap
kubectl get configmap -n staging
```

### 4. Deploy RBAC

```bash
# Update namespace in rbac.yaml
sed -i 's/namespace: production/namespace: staging/g' backend/k8s/rbac.yaml

# Apply RBAC
kubectl apply -f backend/k8s/rbac.yaml

# Verify RBAC
kubectl get serviceaccount -n staging
kubectl get role -n staging
kubectl get rolebinding -n staging
```

### 5. Deploy Application

```bash
# Update namespace in deployment.yaml
sed -i 's/namespace: production/namespace: staging/g' backend/k8s/deployment.yaml

# Apply deployment
kubectl apply -f backend/k8s/deployment.yaml

# Watch deployment
kubectl rollout status deployment/chioma-backend -n staging

# Verify pods
kubectl get pods -n staging
```

### 6. Deploy Service

```bash
# Update namespace in service.yaml
sed -i 's/namespace: production/namespace: staging/g' backend/k8s/service.yaml

# Apply service
kubectl apply -f backend/k8s/service.yaml

# Verify service
kubectl get svc -n staging
```

### 7. Deploy HPA

```bash
# Update namespace in hpa.yaml
sed -i 's/namespace: production/namespace: staging/g' backend/k8s/hpa.yaml

# Apply HPA
kubectl apply -f backend/k8s/hpa.yaml

# Verify HPA
kubectl get hpa -n staging
```

### 8. Deploy PDB

```bash
# Update namespace in pdb.yaml
sed -i 's/namespace: production/namespace: staging/g' backend/k8s/pdb.yaml

# Apply PDB
kubectl apply -f backend/k8s/pdb.yaml

# Verify PDB
kubectl get pdb -n staging
```

### 9. Verify Deployment

```bash
# Check pod status
kubectl get pods -n staging -o wide

# Check pod logs
kubectl logs -n staging -l app=chioma-backend --tail=50

# Check service endpoints
kubectl get endpoints -n staging

# Test health endpoint
kubectl port-forward -n staging svc/chioma-backend 8080:80 &
curl http://localhost:8080/health
kill %1
```

## Production Deployment

### 1. Create Namespace

```bash
kubectl create namespace production
```

### 2. Create Secrets

```bash
# Load environment variables
source .env.production

# Create secrets
kubectl create secret generic chioma-backend-secrets \
  --from-literal=database_url=$DATABASE_URL \
  --from-literal=redis_url=$REDIS_URL \
  --from-literal=jwt_secret=$JWT_SECRET \
  --from-literal=jwt_refresh_secret=$JWT_REFRESH_SECRET \
  --from-literal=sentry_dsn=$SENTRY_DSN \
  --from-literal=stellar_admin_secret_key=$STELLAR_ADMIN_SECRET_KEY \
  --from-literal=aws_access_key_id=$AWS_ACCESS_KEY_ID \
  --from-literal=aws_secret_access_key=$AWS_SECRET_ACCESS_KEY \
  -n production

# Verify secrets
kubectl get secrets -n production
```

### 3. Create ConfigMap

```bash
kubectl create configmap chioma-backend-config \
  --from-literal=db_host=postgres.production.svc.cluster.local \
  --from-literal=db_port=5432 \
  --from-literal=db_name=chioma_production \
  --from-literal=aws_region=us-east-1 \
  --from-literal=aws_s3_bucket=chioma-production \
  -n production

# Verify ConfigMap
kubectl get configmap -n production
```

### 4. Deploy RBAC

```bash
kubectl apply -f backend/k8s/rbac.yaml

# Verify RBAC
kubectl get serviceaccount -n production
kubectl get role -n production
kubectl get rolebinding -n production
```

### 5. Deploy Application

```bash
# Apply deployment
kubectl apply -f backend/k8s/deployment.yaml

# Watch deployment
kubectl rollout status deployment/chioma-backend -n production

# Verify pods
kubectl get pods -n production -o wide
```

### 6. Deploy Service

```bash
kubectl apply -f backend/k8s/service.yaml

# Verify service
kubectl get svc -n production
```

### 7. Deploy HPA

```bash
kubectl apply -f backend/k8s/hpa.yaml

# Verify HPA
kubectl get hpa -n production
```

### 8. Deploy PDB

```bash
kubectl apply -f backend/k8s/pdb.yaml

# Verify PDB
kubectl get pdb -n production
```

### 9. Configure Ingress (Optional)

```bash
# Create ingress for external access
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chioma-backend-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
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
EOF

# Verify ingress
kubectl get ingress -n production
```

## Verification

### 1. Pod Health

```bash
# Check pod status
kubectl get pods -n production -o wide

# Check pod events
kubectl describe pod <pod-name> -n production

# Check pod logs
kubectl logs <pod-name> -n production --tail=100

# Check previous logs (if pod crashed)
kubectl logs <pod-name> -n production --previous
```

### 2. Service Health

```bash
# Check service endpoints
kubectl get endpoints -n production

# Test service connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
# Inside pod:
wget -O- http://chioma-backend/health
exit
```

### 3. Load Balancing

```bash
# Check HPA status
kubectl get hpa -n production -o wide

# Check HPA events
kubectl describe hpa chioma-backend-hpa -n production

# Check metrics
kubectl top pods -n production
```

### 4. Graceful Shutdown

```bash
# Delete a pod to trigger graceful shutdown
kubectl delete pod <pod-name> -n production

# Watch pod termination
kubectl get pods -n production -w

# Check logs for graceful shutdown
kubectl logs <pod-name> -n production | grep -i shutdown
```

### 5. Monitoring

```bash
# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Check AlertManager alerts
curl http://alertmanager:9093/api/v1/alerts

# Check Grafana dashboards
open http://grafana:3000
```

## Rollback Procedures

### Rollback to Previous Version

```bash
# Check rollout history
kubectl rollout history deployment/chioma-backend -n production

# Rollback to previous version
kubectl rollout undo deployment/chioma-backend -n production

# Verify rollback
kubectl rollout status deployment/chioma-backend -n production

# Check pods
kubectl get pods -n production
```

### Rollback to Specific Revision

```bash
# Rollback to specific revision
kubectl rollout undo deployment/chioma-backend -n production --to-revision=<revision>

# Verify rollback
kubectl rollout status deployment/chioma-backend -n production
```

### Manual Rollback

```bash
# Get previous image
PREVIOUS_IMAGE=$(kubectl get deployment chioma-backend -n production -o jsonpath='{.spec.template.spec.containers[0].image}')

# Update deployment with previous image
kubectl set image deployment/chioma-backend \
  backend=$PREVIOUS_IMAGE \
  -n production

# Verify rollback
kubectl rollout status deployment/chioma-backend -n production
```

## Post-Deployment Monitoring

### 1. Monitor Metrics

```bash
# Watch metrics in real-time
watch -n 5 'kubectl top pods -n production'

# Check HPA scaling
watch -n 5 'kubectl get hpa -n production'

# Check pod status
watch -n 5 'kubectl get pods -n production'
```

### 2. Check Alerts

```bash
# Watch for alerts
watch -n 10 'curl -s http://alertmanager:9093/api/v1/alerts | jq ".data[] | select(.status==\"firing\")"'

# Check alert history
curl http://alertmanager:9093/api/v1/alerts?filter=status%3Dfiring
```

### 3. Review Logs

```bash
# Stream logs from all pods
kubectl logs -n production -l app=chioma-backend -f

# Search for errors
kubectl logs -n production -l app=chioma-backend | grep ERROR

# Search for warnings
kubectl logs -n production -l app=chioma-backend | grep WARN
```

### 4. Performance Testing

```bash
# Run load test
npm run perf:load

# Run comprehensive performance test
npm run perf:comprehensive

# Generate HTML report
npm run perf:local
```

### 5. Incident Response

If issues occur:

1. **Check Alerts**: Review AlertManager for active alerts
2. **Check Logs**: Review application logs for errors
3. **Check Metrics**: Review Prometheus metrics
4. **Check Events**: Review Kubernetes events
5. **Escalate**: Contact on-call engineer if needed
6. **Document**: Create incident report

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n production

# Check pod logs
kubectl logs <pod-name> -n production

# Check resource availability
kubectl describe nodes

# Check resource requests
kubectl get pod <pod-name> -n production -o yaml | grep -A 5 resources
```

### High Error Rate

```bash
# Check error logs
kubectl logs -n production -l app=chioma-backend | grep ERROR

# Check database connectivity
kubectl exec -it <pod-name> -n production -- npm run db:monitor:health

# Check external services
curl https://horizon.stellar.org/
```

### High Memory Usage

```bash
# Check memory trend
kubectl top pods -n production

# Check for memory leaks
kubectl exec -it <pod-name> -n production -- npm run test:leaks

# Restart pod
kubectl delete pod <pod-name> -n production
```

### Pod Not Scaling

```bash
# Check HPA status
kubectl describe hpa chioma-backend-hpa -n production

# Check metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second

# Check HPA events
kubectl get events -n production | grep HPA
```

## Maintenance

### Regular Tasks

- **Daily**: Monitor alerts and metrics
- **Weekly**: Review performance trends
- **Monthly**: Analyze alert effectiveness
- **Quarterly**: Review and update alert thresholds
- **Annually**: Capacity planning and optimization

### Backup and Recovery

```bash
# Backup database
kubectl exec -it <pod-name> -n production -- npm run db:backup

# Restore database
kubectl exec -it <pod-name> -n production -- npm run db:restore

# Backup Redis
kubectl exec -it <pod-name> -n production -- redis-cli BGSAVE

# Restore Redis
kubectl exec -it <pod-name> -n production -- redis-cli BGREWRITEAOF
```

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the relevant documentation
3. Check application logs
4. Contact the DevOps team

## References

- [Infrastructure Setup Guide](./INFRASTRUCTURE_SETUP.md)
- [Load Balancing and Auto-Scaling](./docs/LOAD_BALANCING_AND_AUTO_SCALING.md)
- [Graceful Shutdown](./docs/GRACEFUL_SHUTDOWN.md)
- [Alerting Rules](./docs/ALERTING_RULES.md)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
