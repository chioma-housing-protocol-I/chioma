# Incident Response Runbooks

Production runbooks for the highest-impact failure modes. For development issues see `troubleshooting-guide.md` and `debugging-guide.md`.

## General process

1. **Acknowledge** the alert in the on-call channel (`#incidents`) within 5 minutes.
2. **Assess severity**: SEV1 (payments/funds impacted or full outage), SEV2 (degraded, workaround exists), SEV3 (minor).
3. **Mitigate first**, root-cause later.
4. **Communicate**: status update every 30 min for SEV1, 60 min for SEV2.
5. **Post-mortem** within 5 business days for SEV1/SEV2.

| Role               | Owner                               |
| ------------------ | ----------------------------------- |
| Incident commander | On-call backend engineer (rotation) |
| Escalation         | Engineering lead                    |
| Customer comms     | Product/support lead                |

---

## 1. Payment failures

**Owner:** Payments team (backend on-call as primary)

**Detection signals**

- Spike in payment error rate / 5xx on `/v1/payments*` endpoints
- Failed payment jobs or webhook delivery failures in logs
- User reports of rent payments stuck in `pending`

**Immediate mitigation**

1. Check error logs for the failing payment path and the provider/Stellar error code.
2. If the failure is external (provider or Horizon), pause automated payment retries to avoid duplicate attempts; idempotency keys must remain intact.
3. If caused by a recent deploy, roll back.
4. Enable a maintenance banner for payments if failures persist > 15 min.
5. Record affected payment IDs for reconciliation once service recovers — never manually re-submit without checking on-chain/provider status first.

**Escalation path**
On-call engineer → Payments owner (15 min) → Engineering lead (30 min, or immediately if funds may be lost/duplicated) → Provider support.

---

## 2. Blockchain (Stellar) connectivity

**Owner:** Blockchain/contracts team

**Detection signals**

- Timeouts or connection errors to Horizon / Soroban RPC
- Health check reporting chain dependency down
- Transactions stuck unsubmitted; escrow/agreement operations failing

**Immediate mitigation**

1. Check Stellar network status (status.stellar.org) and the configured RPC/Horizon endpoint.
2. Fail over to the secondary Horizon/RPC endpoint via environment config and restart.
3. Queue outgoing transactions rather than dropping them; confirm retry backoff is active.
4. Verify signing account balance (fees) and sequence number are not the cause.
5. Communicate delayed on-chain confirmations to users.

**Escalation path**
On-call engineer → Blockchain owner (15 min) → Engineering lead (30 min) → RPC provider support.

---

## 3. Queue backlog

**Owner:** Platform/infrastructure team

**Detection signals**

- Queue depth / waiting job count above threshold, or job age growing
- Redis memory or connection alerts
- Delayed notifications, emails, or scheduled jobs

**Immediate mitigation**

1. Check worker health — are workers running and consuming? Restart crashed workers.
2. Identify the job type causing the backlog; look for a poison message repeatedly failing and move it to the failed/dead-letter set.
3. Scale workers horizontally if throughput-bound.
4. Check Redis memory; if near limit, clear completed jobs and raise capacity.
5. Pause non-critical producers (e.g. analytics, bulk notifications) to let critical jobs drain.

**Escalation path**
On-call engineer → Platform owner (15 min) → Engineering lead (30 min).

---

## Post-incident checklist

- [ ] Timeline recorded
- [ ] Root cause identified
- [ ] Data reconciled (payments / on-chain state)
- [ ] Action items filed as issues with owners
