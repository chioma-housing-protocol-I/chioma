# ADR-0001: Modular Monolith over Microservices

## Status

Accepted

## Context

The Chioma platform manages rental agreements, payments, property listings, blockchain transactions, and user management. These domains are highly interdependent:

- Rental agreements reference properties, users, and payment schedules
- Payments trigger blockchain transactions and update agreement state
- Disputes link to agreements, payments, and blockchain escrow records
- User authentication and authorization span all features

We needed to choose an architecture that:
- Supports rapid development with a small team (2-5 developers)
- Enables clear domain boundaries without excessive operational overhead
- Maintains strong consistency for financial transactions
- Allows scaling as the platform grows

**Forces:**
- **Team size**: Small team, limited DevOps resources
- **Domain coupling**: High degree of transactional interdependence
- **Development speed**: Need to iterate quickly
- **Operational complexity**: Must be manageable without dedicated SRE team
- **Future scaling**: Architecture should not preclude future decomposition

## Decision

We will build Chioma as a **modular monolith** — a single deployable NestJS application with clearly separated domain modules.

**Key characteristics:**
- Single codebase and deployment unit
- Domain modules separated by bounded contexts (auth, properties, payments, stellar, disputes)
- Shared database with clear ownership boundaries
- Module imports restricted to prevent circular dependencies
- Asynchronous operations offloaded to Bull queues backed by Redis

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│              API Gateway (NestJS)               │
├─────────────────────────────────────────────────┤
│  Auth  │ Properties │ Payments │ Stellar │ ... │
├─────────────────────────────────────────────────┤
│         Shared: DB, Cache, Queues, Logging      │
└─────────────────────────────────────────────────┘
```

## Alternatives Considered

### Alternative 1: Microservices

**Pros:**
- Independent scaling per service
- Technology polyglot (different stacks per service)
- Fault isolation
- Team autonomy (each owns a service)

**Cons:**
- Distributed transactions and eventual consistency complexity
- Network latency between services
- Operational overhead (service discovery, API gateways, distributed tracing)
- Requires mature DevOps practices and tooling
- Overkill for team size and current scale

**Reason Not Chosen:**
Premature complexity. Microservices excel when you have:
- Multiple independent teams
- Different scaling requirements per domain
- Mature DevOps infrastructure

We have none of these. The added complexity would slow development velocity without clear benefits.

### Alternative 2: Serverless Functions (AWS Lambda, Vercel Functions)

**Pros:**
- No infrastructure management
- Auto-scaling
- Pay-per-invocation pricing

**Cons:**
- Cold start latency (critical for payment processing)
- Stateful blockchain operations are awkward in serverless
- Distributed state management complexity
- Vendor lock-in
- Difficult to test and debug locally
- Limits on execution time and connection pooling

**Reason Not Chosen:**
Poor fit for blockchain operations (long-running, stateful). Cold starts are unacceptable for payment flows. Connection pooling challenges with PostgreSQL.

### Alternative 3: Monolithic (No Module Boundaries)

**Pros:**
- Simplest possible structure
- No module boundary enforcement
- Maximum flexibility

**Cons:**
- High risk of coupling and tight integration
- Difficult to evolve as codebase grows
- No enforcement of domain separation
- Hard to extract services later if needed

**Reason Not Chosen:**
While simpler short-term, lack of boundaries leads to maintenance nightmares as the codebase grows. NestJS modules provide structure without the operational overhead of microservices.

## Consequences

### Positive

✅ **Simpler deployment**: Single Docker image, single deployment pipeline

✅ **ACID transactions**: Database transactions span multiple domains without distributed transaction complexity

✅ **Easier debugging**: Single codebase, unified logging, no inter-service call tracing

✅ **Faster development**: No inter-service API contracts, no service versioning coordination

✅ **Lower operational overhead**: One service to monitor, one database to manage, simpler infrastructure

✅ **Easier testing**: End-to-end tests run in a single process, no service orchestration

✅ **Shared code**: Common utilities, DTOs, and entities can be reused without duplication

### Negative

❌ **Scaling granularity**: Must scale entire service even if only one domain is under load

❌ **Deployment coupling**: All features deploy together (higher risk of deployment impact)

❌ **Technology lock-in**: Harder to use different tech stacks per domain

❌ **Potential for coupling**: Requires discipline to maintain module boundaries

❌ **Single point of failure**: One service down means all features unavailable

### Mitigation

**For scaling concerns:**
- Stateless design allows horizontal scaling behind a load balancer
- Background jobs offloaded to Bull queues for independent scaling
- Database connection pooling and query optimization for high read throughput
- Cache layer (Redis/Upstash) reduces database load
- If specific domains become bottlenecks, we can extract them to separate services later

**For deployment coupling:**
- Comprehensive test suite (unit, integration, E2E) before deployment
- Canary deployments and gradual rollouts in production
- Feature flags to decouple deployment from release
- Fast rollback via Docker image versioning

**For module coupling:**
- NestJS module system enforces explicit imports
- CI checks for circular dependencies (fail build if detected)
- Code review standards require justification for cross-module calls
- Dependency graph visualization (see [DEPENDENCY_GRAPH.md](../../backend/docs/architecture/DEPENDENCY_GRAPH.md))

**For single point of failure:**
- Multi-instance deployment behind load balancer
- Health checks and auto-restart on failure
- Database replication for read scaling and failover
- Redis clustering for cache availability
- Comprehensive monitoring and alerting (Prometheus, Grafana, Sentry)

## Related Decisions

- ADR-0002: NestJS Framework — Framework choice supports modular architecture
- ADR-0005: Bull Queues — Async processing offloaded to queues
- ADR-0013: Separate Worker Processes — Workers scale independently

## Implementation Notes

**Module structure:**
```
backend/src/modules/
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── strategies/
├── properties/
│   ├── properties.module.ts
│   ├── properties.service.ts
│   ├── properties.controller.ts
│   └── entities/
└── payments/
    ├── payments.module.ts
    ├── payments.service.ts
    ├── payments.controller.ts
    └── entities/
```

**Module dependency rules:**
- Core modules (auth, users) can be imported by any module
- Feature modules can import core modules but not each other directly
- Cross-feature communication via events or shared services (carefully reviewed)

**Future migration path:**
If a domain becomes a scaling bottleneck:
1. Extract to separate NestJS microservice
2. Use message queue for async communication
3. Duplicate or share database based on coupling

The modular structure makes this extraction straightforward.

## Date

2024-01-15

## Author(s)

- Architecture Team (@chioma-core)
