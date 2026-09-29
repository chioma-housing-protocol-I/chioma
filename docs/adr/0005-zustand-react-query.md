# 0005. Zustand + React Query for client state

- **Status**: Accepted
- **Date**: 2026-09-25

## Context

The Next.js frontend has two kinds of state: server state (properties, agreements, payments — fetched, cached, invalidated) and client state (auth session, wallet connection, UI preferences).

## Decision

- **React Query (`@tanstack/react-query`)** owns all server state: fetching, caching, background refetch, and mutation invalidation.
- **Zustand** owns small, global client-only state.
  Server data must not be copied into Zustand stores.

## Alternatives considered

- **Redux Toolkit (+ RTK Query)** — rejected: more boilerplate than the app needs; Zustand + React Query covers the same ground with less code.
- **React Context only** — rejected: re-render cascades and no caching/invalidation for server data.
- **SWR** — rejected: React Query has richer mutation and invalidation APIs.

## Consequences

- Clear rule for where state lives; fewer stale-data bugs.
- Two libraries to learn instead of one.
