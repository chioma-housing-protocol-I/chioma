# Documentation Standards

This document defines practical documentation standards for the Chioma backend repository, covering READMEs, code comments, API documentation, and architecture documentation. It also provides templates, recommended tools, and a checklist.

---

## README Files

### When a README is required

- the repository root must have a `README.md`
- `backend/` must have a `README.md`
- `backend/docs/` must have a `README.md` that acts as the documentation index
- a feature/module should have a `README.md` when it has:
  - non-trivial setup
  - operational runbooks
  - integration requirements
  - background jobs / workers
  - non-obvious constraints or invariants

### README content standards

A good README should answer:

- what is this component and what problem does it solve?
- how do I run it locally?
- how do I configure it?
- how do I test it?
- where is the authoritative reference documentation?

### README structure (recommended)

- `# <Name>`
- `## Overview`
- `## Quick Start`
- `## Configuration`
- `## Development`
- `## Testing`
- `## Troubleshooting`
- `## References`

### README rules

- keep commands copy-pastable
- prefer small examples over long narratives
- avoid duplicating large content that is already maintained elsewhere; link to it instead
- keep environment variable lists accurate and complete

---

## Code Comments

### General principles

- comments should explain **why** a piece of code exists, not restate what the code already says
- prefer self-documenting naming and small functions over excessive comments
- keep comments current; stale comments are worse than no comments

### What to comment

- security-sensitive logic and threat mitigations
- non-obvious business rules and invariants
- performance tradeoffs and complexity constraints
- workarounds for third-party service behavior
- concurrency and ordering assumptions

### What not to comment

- obvious control flow (e.g. “increment i”)
- duplicate of types or function names
- commented-out code (remove it instead of keeping it)

### Comment style

- keep comments short and specific
- include links to source material when relevant (specs, tickets, provider docs)
- avoid TODOs without context; a TODO should describe the intent and include a tracking reference

---

## API Documentation

### Source of truth

- Swagger/OpenAPI generated from NestJS decorators is the canonical API reference.
- Supporting docs live in `backend/docs/api/`.

### Required standards

All backend engineers must follow:

- `backend/docs/api/API-STANDARDS.md`

In particular:

- every public endpoint must be documented with `@nestjs/swagger` decorators
- every DTO property must have `@ApiProperty` / `@ApiPropertyOptional` with examples
- all error responses must follow the documented error response shape and stable error codes

### Documentation expectations for new/changed endpoints

When you add or change an endpoint, update documentation in one of these ways:

- the OpenAPI decorators (always required)
- the relevant file in `backend/docs/api/` if it changes cross-cutting behavior (auth, pagination, rate limiting, versioning)

### Examples

Every non-trivial endpoint should include examples:

- request example
- success response example
- at least one error response example

---

## Architecture

### What qualifies as architecture documentation

Architecture docs describe system structure and design decisions that are stable across features:

- module boundaries and dependency direction
- key integration points (queues, caching, external services)
- data flows (high level)
- non-functional constraints (scalability, security)

### Where architecture docs live

- `backend/docs/architecture/`

### Architecture documentation standards

- document decisions as guidance and constraints, not a code walkthrough
- show dependency direction and allowed coupling
- include operational and scaling implications
- keep diagrams simple and text-first

---

## Templates

Templates are intended to be copied into new files and filled in.

### README template

```markdown
# <Project/Module Name>

## Overview

What this is and who it’s for.

## Quick Start

```bash
# install

# run

# test
n```

## Configuration

| Variable | Required | Default | Description |
|---|---:|---:|---|
| `EXAMPLE_VAR` | yes | - | What it does |

## Development

Key workflows and local tooling.

## Testing

How to run unit/e2e tests.

## Troubleshooting

Common failure modes and fixes.

## References

Links to deeper docs.
```

### ADR (Architecture Decision Record) template

```markdown
# ADR: <Title>

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

What problem are we solving?

## Decision

What did we decide?

## Consequences

What are the tradeoffs and implications?

## Alternatives considered

What else did we consider and why was it rejected?
```

### API endpoint documentation template

```markdown
# <Feature> API

## Endpoint

`<METHOD> /api/v1/<path>`

## Authentication

- Required: yes/no
- Mechanism: JWT/API key/etc.

## Request

Headers:

- `Content-Type: application/json`

Body:

```json
{}
```

## Response

Success (`200`):

```json
{}
```

Error examples:

- `400` (validation)
- `401`/`403` (auth)
- `404` (not found)
- `422` (business rule)

## Notes

Idempotency, rate limits, pagination, etc.
```

### Runbook template

```markdown
# Runbook: <Service/Feature>

## Purpose

What this runbook covers.

## Owners

Team / on-call rotation.

## Dashboards

Links to dashboards.

## Alerts

- Alert name → expected causes → first steps

## Common operations

- deploy
- rollback
- config changes

## Incident response checklist

- scope impact
- check logs/metrics
- mitigate
- follow up
```

### Troubleshooting guide template

```markdown
# Troubleshooting: <Area>

## Symptoms

Describe symptoms.

## Likely causes

List common root causes.

## Diagnostics

Commands, logs, metrics to inspect.

## Fix

How to resolve.

## Prevention

How to avoid recurrence.
```

---

## Tools

Recommended documentation tools and how they are used in this repository:

- Markdown (`.md`) as the default format for docs
- Swagger UI (`/api/docs`) generated from NestJS `@nestjs/swagger`
- Diagrams: keep text-first; use simple markdown diagrams where possible

---

## Organization

### Where to put documentation

- product / system overview: repository `README.md`
- backend service docs: `backend/README.md`
- authoritative backend docs index: `backend/docs/README.md`
- API reference and standards: `backend/docs/api/`
- architecture: `backend/docs/architecture/`
- operational runbooks: `backend/docs/deployment/` and feature-level runbooks near the feature docs

### Avoiding duplication

- prefer linking to canonical docs rather than copying
- do not maintain parallel specs in multiple places

---

## Maintenance

### Keep docs accurate

- update docs in the same PR as the code change
- prefer small, frequent updates
- remove outdated docs instead of letting them drift

### Review expectations

PR reviewers should verify:

- docs are updated when behavior changes
- examples match the current API
- links are valid and point to the canonical document

---

## Versioning

### API versioning

Follow:

- `backend/docs/api/API-VERSIONING.md`

### Documentation versioning

- docs should reflect the current `main` branch behavior
- for breaking changes, update `API-CHANGELOG.md` and adjust any affected examples
- avoid embedding version numbers in filenames unless there is a strong reason

---

## Best Practices

- write for the reader who is new to the codebase
- keep instructions executable and environment-specific
- include examples for anything non-trivial
- document failure modes and troubleshooting steps
- ensure security-sensitive sections describe controls without exposing secrets

---

## Documentation Checklist

- [ ] README exists at the appropriate level and contains Quick Start + Testing
- [ ] Code comments explain non-obvious “why” decisions
- [ ] New/changed endpoints follow `API-STANDARDS.md` and include examples
- [ ] Architecture docs updated when module boundaries or dependencies change
- [ ] Templates used for new docs where applicable
- [ ] Links validated and point to canonical docs
- [ ] Docs updated in the same PR as behavior changes
