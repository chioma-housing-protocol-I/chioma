# Rate limiting: shared store and failure behaviour

## Distributed counters (Issue #1600)

`RateLimitService.consumePoints` backs its counters with the shared Redis
instance (`REDIS_CLIENT`, provided by `LockModule` — the same client used
for distributed locks) via an atomic `INCRBY` + conditional `EXPIRE` Lua
script (`INCR_AND_EXPIRE_SCRIPT`). The increment and the window's expiry
are set in a single round trip, so concurrent requests hitting different
replicas serialize through Redis itself rather than racing on a
read-then-write pair. This is what makes the configured limit hold
regardless of how many application replicas are running: a per-instance
counter (or a get/set pair, even against a shared store) would let the
effective limit scale with the replica count, defeating the protection on
auth and payment endpoints.

## Failure behaviour (fail open, by design)

If the shared store — Redis for the counter increment, or the
`cache-manager` store used for the block/whitelist reads — is unreachable
or errors, `consumePoints` catches the failure and returns a **successful**
result (`success: true`, full `remainingPoints`, `isBlocked: false`) rather
than throwing or blocking the request.

This is a deliberate choice: an unavailable rate limiter must never itself
become an outage. Failing closed (blocking all traffic when Redis is down)
would turn a caching-layer incident into a full authentication/payment
outage, which is a strictly worse failure mode than temporarily running
without rate limiting.

**Operational implication:** a Redis outage means rate limits are not
enforced for its duration. This is expected and monitored via the error
log line (`Rate limit error for <identifier>: <message>`) rather than
silently swallowed — alerting on a sustained rate of these log lines is
the intended signal that the shared store needs attention.

## No-Redis fallback (test / intentionally single-instance)

When `REDIS_CLIENT` is not available — `NODE_ENV=test` (see
`LockModule`'s factory, which returns `null` in that environment so tests
don't need a live Redis) — `consumePoints` falls back to the previous
`cache-manager` get-then-set behaviour.

**This fallback is only correct for a single instance.** It reintroduces
the exact race the Redis path exists to close: two concurrent requests can
both read the same counter value before either writes back. It exists
purely so the service keeps working in test environments and in a
deliberately single-replica deployment that has not configured Redis at
all — it is not a substitute for Redis under horizontal scaling.
