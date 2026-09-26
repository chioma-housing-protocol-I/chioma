# 0003. Elasticsearch for property search

- **Status**: Accepted
- **Date**: 2026-09-25

## Context

Property discovery needs full-text search, fuzzy matching, faceting (price, bedrooms, amenities), and geo queries, at latencies Postgres `LIKE` queries cannot provide as listings grow.

## Decision

Elasticsearch as a secondary search index (`modules/search`), populated from PostgreSQL, which remains the source of truth. Search degrades to database queries if the index is unavailable.

## Alternatives considered

- **PostgreSQL full-text search (tsvector) + PostGIS** — rejected: workable for small datasets but weaker relevance tuning, faceting, and typo tolerance.
- **Algolia / hosted search** — rejected: per-record pricing and data leaving our infrastructure.
- **Meilisearch / Typesense** — rejected: simpler, but less mature geo and aggregation support at decision time.

## Consequences

- An extra piece of infrastructure to run and monitor.
- Index and database can drift; sync jobs (`data-sync` queue) must be idempotent and re-runnable.
