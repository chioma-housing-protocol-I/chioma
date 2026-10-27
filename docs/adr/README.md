# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records (ADRs) for the Chioma project. ADRs document significant architectural and design decisions, along with their context, alternatives considered, and consequences.

---

## What is an ADR?

An Architecture Decision Record captures an important architectural decision made along with its context and consequences. ADRs help:

- **Document the "why"** behind structural decisions
- **Provide context** for future developers and contributors
- **Prevent revisiting settled debates** without new information
- **Track evolution** of the system architecture over time
- **Support onboarding** by explaining design rationale

---

## When to Create an ADR

Create an ADR when making a decision that:

- **Affects system structure** — Choice of frameworks, databases, architecture patterns
- **Has long-term consequences** — Hard to reverse without significant refactoring
- **Involves trade-offs** — Multiple valid options with different costs/benefits
- **Changes existing patterns** — Diverges from established conventions
- **Resolves a recurring debate** — Settles a frequently discussed question

**Examples requiring ADRs:**

- Choosing NestJS over Express
- Adopting PostgreSQL with TypeORM
- Implementing JWT + SEP-0010 dual authentication
- Selecting a caching strategy
- Changing API versioning approach
- Adopting a monorepo vs multi-repo structure

**Examples NOT requiring ADRs:**

- Renaming a variable or function
- Fixing a bug
- Updating a dependency version
- Refactoring without changing behavior
- Adding a new feature using existing patterns

---

## ADR Format

ADRs follow a consistent format:

```markdown
# ADR-NNNN: [Title]

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-XXXX]

## Context

What is the issue we're seeing that motivates this decision or change?
What are the forces at play (technical, business, organizational)?

## Decision

What is the change that we're proposing and/or doing?

## Alternatives Considered

What other options were evaluated?
Why were they not chosen?

| Alternative | Pros | Cons | Reason Not Chosen |
| ----------- | ---- | ---- | ----------------- |
| Option A    | ...  | ...  | ...               |
| Option B    | ...  | ...  | ...               |

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive

- Benefit 1
- Benefit 2

### Negative

- Cost 1
- Cost 2

### Mitigation

- How we address the negative consequences

## Related Decisions

- ADR-XXXX: Related decision
- Links to relevant documentation

## Implementation Notes

Any technical details, links to code, or implementation guidance.

## Date

YYYY-MM-DD
```

---

## ADR Index

| ADR                                               | Title                                          | Status   | Date       |
| ------------------------------------------------- | ---------------------------------------------- | -------- | ---------- |
| [ADR-0001](./ADR-0001-monolithic-architecture.md) | Modular Monolith over Microservices            | Accepted | 2024-01-15 |
| [ADR-0002](./ADR-0002-nestjs-framework.md)        | NestJS as Backend Framework                    | Accepted | 2024-01-15 |
| [ADR-0003](./ADR-0003-postgresql-typeorm.md)      | PostgreSQL with TypeORM                        | Accepted | 2024-01-15 |
| [ADR-0004](./ADR-0004-dual-authentication.md)     | Dual Authentication: JWT + Stellar SEP-0010    | Accepted | 2024-01-18 |
| [ADR-0005](./ADR-0005-bull-queues.md)             | Bull Queues with Redis for Async Processing    | Accepted | 2024-01-20 |
| [ADR-0006](./ADR-0006-redis-caching.md)           | Redis/Upstash for Caching                      | Accepted | 2024-01-22 |
| [ADR-0007](./ADR-0007-monorepo-structure.md)      | Monorepo with pnpm Workspaces                  | Accepted | 2024-01-25 |
| [ADR-0008](./ADR-0008-uri-versioning.md)          | URI-based API Versioning                       | Accepted | 2024-02-01 |
| [ADR-0009](./ADR-0009-field-encryption.md)        | AES-256-GCM Field-Level Encryption             | Accepted | 2024-02-10 |
| [ADR-0010](./ADR-0010-stellar-sdk-integration.md) | Direct Stellar SDK Integration                 | Accepted | 2024-02-15 |
| [ADR-0011](./ADR-0011-global-validation-pipe.md)  | Global ValidationPipe with Whitelisting        | Accepted | 2024-02-20 |
| [ADR-0012](./ADR-0012-audit-logging.md)           | Event-Driven Audit and Security Logging        | Accepted | 2024-03-01 |
| [ADR-0013](./ADR-0013-worker-processes.md)        | Separate Worker Processes for Queue Processing | Accepted | 2024-03-05 |
| [ADR-0014](./ADR-0014-monitoring-stack.md)        | Prometheus + Grafana + Loki Monitoring Stack   | Accepted | 2024-03-10 |
| [ADR-0015](./ADR-0015-nextjs-frontend.md)         | Next.js 14+ with App Router for Frontend       | Accepted | 2024-03-15 |

---

## Creating a New ADR

### 1. Choose a Number

Use the next sequential number (e.g., if the last ADR is ADR-0015, use ADR-0016).

### 2. Create the File

```bash
# Format: ADR-NNNN-kebab-case-title.md
touch docs/adr/ADR-0016-your-decision-title.md
```

### 3. Fill in the Template

Copy the template from above or use an existing ADR as a reference.

### 4. Submit for Review

- Include the ADR in your pull request
- Link the ADR in the PR description
- Discuss in PR comments and/or team meetings
- Update based on feedback

### 5. Update the Index

Add your ADR to the index table in this README.

### 6. Set Initial Status

New ADRs start with status `Proposed`. After team consensus and merge, update to `Accepted`.

---

## ADR Lifecycle

```
Proposed → Accepted → [Active]
                 ↓
              Deprecated / Superseded
```

- **Proposed** — Under discussion, not yet decided
- **Accepted** — Decision has been made and is active
- **Deprecated** — No longer recommended, but not replaced
- **Superseded** — Replaced by a newer ADR (link to the new one)

**Never delete old ADRs.** They provide historical context. Mark them as deprecated or superseded instead.

---

## Best Practices

### Writing ADRs

- **Be concise** — Aim for clarity, not length
- **Focus on "why"** — The code shows "what" and "how"
- **Include alternatives** — Show you considered other options
- **Be honest about trade-offs** — No solution is perfect
- **Link to resources** — Reference external docs, RFCs, articles
- **Use tables** — Comparison tables make alternatives clear

### Maintaining ADRs

- **Review periodically** — Are old ADRs still accurate?
- **Update status** — Mark superseded ADRs and link to replacements
- **Keep the index current** — Add new ADRs to the table

### Using ADRs

- **Reference in code** — Link to relevant ADRs in complex code
- **Reference in PRs** — Cite ADRs to justify design choices
- **Reference in discussions** — "We decided this in ADR-0007"
- **Reference in onboarding** — Point new contributors to ADRs

---

## ADR Template

```markdown
# ADR-NNNN: [Decision Title]

## Status

Proposed

## Context

[Describe the context and problem statement]

- What forces are at play?
- What constraints do we have?
- What are we trying to optimize for?

## Decision

[State the decision clearly and concisely]

## Alternatives Considered

### Alternative 1: [Name]

**Pros:**

- Advantage 1
- Advantage 2

**Cons:**

- Disadvantage 1
- Disadvantage 2

**Reason Not Chosen:**
[Why we didn't select this option]

### Alternative 2: [Name]

[Repeat structure]

## Consequences

### Positive

- Benefit 1
- Benefit 2

### Negative

- Cost or limitation 1
- Cost or limitation 2

### Mitigation

- How we'll address negative consequences
- Monitoring or review plans

## Related Decisions

- ADR-XXXX: [Related decision]
- [External link to RFC, article, etc.]

## Implementation Notes

[Optional: Technical details, code examples, configuration]

## Date

YYYY-MM-DD

## Author(s)

- [Name] (@github-handle)
```

---

## Example ADR (Short Form)

See full ADRs in individual files. Here's a minimal example:

**ADR-0007: Monorepo with pnpm Workspaces**

**Status:** Accepted

**Context:** We need to manage backend, frontend, and smart contracts in a coordinated way. Changes often span multiple packages.

**Decision:** Use a monorepo with pnpm workspaces.

**Alternatives:**

- Multi-repo: Requires multiple PRs, version coordination, harder onboarding
- Lerna: Additional tooling, less active maintenance

**Consequences:**

- ✅ Single clone, atomic commits, shared CI
- ❌ Larger repo size, requires discipline for boundaries
- Mitigation: Use workspace filters in CI, enforce import boundaries

**Date:** 2024-01-25

---

## Questions?

If you have questions about ADRs:

- Review existing ADRs in this directory
- Ask in GitHub Discussions
- Discuss in team meetings
- Contact maintainers

---

## References

- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) by Michael Nygard
- [ADR GitHub Organization](https://adr.github.io/)
- [Markdown Architectural Decision Records (MADR)](https://adr.github.io/madr/)

---

**Last Updated:** 2025-01-17
