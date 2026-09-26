# Emergency Procedures

**Priority:** HIGH
**Category:** Documentation
**Type:** Documentation
**Status:** Completed
**Related Issues:** #750, #03, #14, #16

## Introduction

This document outlines the emergency procedures for the Chioma Housing Protocol. It provides clear, actionable steps for managing incidents, pausing contracts, and recovering from failures.

## 1. Pause Mechanism

The Chioma protocol includes a global pause mechanism to halt sensitive operations during an emergency.

### 1.1 How to Pause

The contract administrator can pause the contract using the `pause` function.

**Parameters:**

- `reason`: A string describing the reason for the pause (emitted in the `Paused` event).

**Example (Soroban CLI):**

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_SECRET> \
  --network <NETWORK> \
  -- \
  pause \
  --reason "Investigating suspicious transaction pattern"
```

### 1.2 How to Unpause

The contract can be unpaused using the `unpause` function.

**Example (Soroban CLI):**

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_SECRET> \
  --network <NETWORK> \
  -- \
  unpause
```

### 1.3 Restricted Functions

When the contract is paused, the following operations are blocked:

- `create_agreement`
- `sign_agreement`
- `submit_agreement`
- `cancel_agreement`
- `make_payment_with_token`
- `release_escrow_with_token`
- `add_supported_token`
- `remove_supported_token`
- `set_exchange_rate`
- `accrue_interest`
- `distribute_interest`
- `process_interest_accruals`
- `transfer_with_royalty`

## 2. Circuit Breaker Implementation

Chioma implements a rate-limiting system that acts as a circuit breaker to prevent spam and Denial of Service (DoS) attacks.

### 2.1 Rate Limiting Parameters

- **Per-Block limit:** Maximum calls allowed per ledger.
- **Per-User daily limit:** Maximum calls a single address can make in 24 hours.
- **Cooldown period:** Mandatory wait time between calls for specific functions.

### 2.2 Monitoring Circuit Breakers

Circuit breaker events are logged via `events::rate_limit_exceeded`. Monitor these events to identify potential attacks.

### 2.3 Emergency Reset

In case of a false positive, the admin can reset a user's rate limit using `reset_user_rate_limit(user, function_name)`.

## 3. Recovery Procedures

### 3.1 State Corruption

If contract state becomes inconsistent:

1. **Pause** the contract immediately.
2. **Audit** the ledger state using a block explorer or Horizon API.
3. **Identify** the affected agreements or balances.
4. **Deploy** a fix if necessary using the versioning system.

### 3.2 Upgrade/Migration

Chioma supports contract versioning. In case of a critical bug:

1. Implement the fix in a new contract version.
2. Record the new version using `record_version`.
3. Update the status of the old version to `Deprecated` or `Revoked` using `update_version_status`.

## 4. Incident Response

### 4.1 Response Levels

- **Level 1 (Low):** Minor UI bugs or documentation errors. (No pause required)
- **Level 2 (Medium):** Functionality issues not affecting funds. (Investigation required, potential pause)
- **Level 3 (High):** Real-time exploit or fund risk. (Immediate pause required)

### 4.2 Incident Checklist

- [ ] Detect anomaly (via monitoring or community report).
- [ ] Verify the incident severity.
- [ ] Halt operations (Pause Contract).
- [ ] Notify stakeholders (Discord/Twitter/Email).
- [ ] Identify root cause.
- [ ] Develop and test fix.
- [ ] Deploy fix/upgrade.
- [ ] Unpause and monitor.

## 5. Escalation Procedures

1. **Detection:** On-call engineer identifies issue.
2. **Notification:** Notify Lead Developer and Security Officer.
3. **Decision:** Lead Developer decides whether to Pause.
4. **Execution:** Admin executes Pause.
5. **Resolution:** Dev team works on fix.

## 6. Communication Procedures

- **Internal:** Use dedicated incident channel in Slack/Discord.
- **External:**
  - Post an initial "We are investigating" message within 15 minutes of a Level 3 incident.
  - Provide hourly updates until resolution.
  - Publish a post-mortem report within 48 hours.

## 7. Emergency Best Practices

- **Multi-Sig Admin:** Ensure the admin address is a Multi-Sig for production deployments.
- **Offline Keys:** Keep admin keys offline or in a secure Hardware Security Module (HSM).
- **Regular Drills:** Conduct a "Pause/Unpause" drill on Testnet every quarter.
- **Monitoring:** Implement automated alerts for `ContractPaused` and `RateLimitExceeded` events.

## 8. Emergency Checklist

- [ ] Admin keys accessible?
- [ ] Pause script ready?
- [ ] Monitoring dashboard active?
- [ ] Escalation contact list up-to-date?
- [ ] Communication templates ready?
