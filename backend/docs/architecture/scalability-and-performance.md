# Scalability and Performance

This document outlines the scalability strategies, performance optimization techniques, capacity planning, and load testing procedures for the Chioma backend.

## 1. Horizontal Scaling

Horizontal scaling involves adding more instances of the API or services to distribute the load.

*   **Stateless Services**: All NestJS API endpoints must be stateless. Session data should be stored in Redis or encoded in JWTs.
*   **Auto-Scaling Groups**: The backend is deployed in container orchestration environments (e.g., Kubernetes or AWS ECS) configured to auto-scale based on CPU utilization > 70% or unusually high HTTP request queue lengths.
*   **Message Queues (Bull/Redis)**: Background jobs (e.g., blockchain submission, email notifications) are decoupled from the main HTTP API using Bull queues. We can horizontally scale worker nodes independently of API nodes.

## 2. Vertical Scaling

Vertical scaling involves increasing the CPU or Memory resources of existing nodes. 

*   **Triggers**: Vertical scaling should be considered when response times degrade consistently across all instances due to memory limits or CPU saturation despite horizontal scaling.
*   **Database instances**: The primary PostgreSQL database and Redis clusters are prime candidates for vertical scaling when the dataset size or connection limits exceed current capacities.
*   **Limits**: Ensure that container resource limits (memory and CPU) in `docker-compose.yml` or Kubernetes manifests are updated accordingly.

## 3. Load Balancing

*   **Configuration**: Traffic is routed through an Nginx reverse proxy or cloud-native Load Balancer (e.g., AWS ALB).
*   **Algorithms**: We use Round Robin by default. For specific persistent connections (like WebSockets when implemented), IP Hash or sticky sessions might be required.
*   **Health Checks**: Load balancers must continually poll the `/health` endpoint to ensure traffic is only routed to healthy nodes.

## 4. Caching

Caching reduces database load and speeds up response times.

*   **Redis**: Used for common, read-heavy operations where data doesn't change frequently (e.g., static property metadata, geographic hierarchies).
*   **Cache Invalidation**: Implement event-driven cache invalidation (e.g., clear property cache when a property is updated).
*   **TTL (Time To Live)**: Always set reasonable TTLs on cached items to prevent stale data.

## 5. Database Scaling

*   **Connection Pooling**: We use PgBouncer or TypeORM's built-in connection pooling to manage concurrent database connections efficiently.
*   **Read Replicas**: For read-heavy endpoints, queries can be routed to PostgreSQL read replicas to relieve the primary writer instance.
*   **Indexing**: Continuously monitor and optimize queries using `EXPLAIN ANALYZE`. Ensure high-cardinality queried fields have approriate indices (B-Tree or GiST for geographic searches).

## 6. Capacity Planning

*   **Metrics**: Track Daily Active Users (DAU), API Requests per Second (RPS), and Database Storage Growth.
*   **Projections**: Project resource needs quarterly based on the current growth rate mapping metrics to infrastructure costs.
*   **Provisioning**: Maintain a buffer of at least 30% overhead on average utilization to handle unexpected traffic spikes (e.g., viral marketing campaigns).

## 7. Load Testing

Load testing ensures systems can handle expected usage and identifies thresholds.

*   **Tools**: Use `k6` or `Artillery` for executing load tests.
*   **Scenarios**: Test critical paths (authentication, property search, payment initiation).
*   **Environment**: Run load tests against the Staging environment matching Production specifications.
*   **Frequency**: Run extensive load tests before major releases or expected high-traffic events.

## 8. Performance Baselines

We define minimum performance expectations for the API SLAs:

*   **API Response Time (P95)**: < 200ms
*   **Database Query Time (P95)**: < 50ms
*   **Job Processing Latency**: < 2 seconds for critical jobs (e.g., payment webhook processing)
*   **Error Rate**: < 0.1%

## 9. Bottleneck Analysis

Identifying bottlenecks proactively:

*   **APM (Application Performance Monitoring)**: Use New Relic, Datadog, or OpenTelemetry to trace requests across the stack.
*   **Logs**: Monitor structured application logs for `Slow Query` warnings.
*   **Infrastructure Metrics**: Monitor Memory/CPU/Network IO on all containers. Node.js memory leaks should be tracked by monitoring V8 heap size.

## 10. Optimization

*   **Payload Size**: Use GZIP/Brotli compression for API responses. Paginate list endpoints strictly.
*   **N+1 Queries**: Use TypeORM QueryBuilder or dataloaders to aggressively avoid N+1 query problems in nested entity retrieval.

## Scalability Checklist

- [ ] All API endpoints are stateless.
- [ ] Database connection limits are configured properly.
- [ ] Read-heavy and complex queries are cached.
- [ ] Proper indices are present on all querying fields.
- [ ] Auto-scaling policies are defined and tested.
- [ ] Health checks are accurately reporting status to the Load Balancer.

## Troubleshooting Scaling Issues

1. **High API Latency**: Check APM traces. Is it the DB or the Node Event Loop? If CPU is 100%, consider scaling horizontally. If DB wait is high, check active queries.
2. **Out of Memory (OOM) Kills**: Analyze Node.js heap dumps. Verify memory limits in container orchestrator aren't too low.
3. **Database Connection Exhaustion**: Ensure connections are being released. Check for long-running uncommitted transactions.
