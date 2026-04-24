# Chioma Contract Documentation

## Table of Contents

- [Contract Overview](#contract-overview)
- [Initialization](#initialization)
- [Public Functions](#public-functions)
- [Storage Structure](#storage-structure)
- [Events](#events)
- [Error Codes](#error-codes)
- [Usage Examples](#usage-examples)
- [Integration Notes](#integration-notes)
- [Security Considerations](#security-considerations)
- [Testing](#testing)

---

## Contract Overview

The `chioma` contract is the protocol's primary rental-agreement orchestration contract. It manages agreement lifecycle, multi-token payments, escrow release hooks, metadata, extension flows, rate limiting, royalty support, deposit-interest accounting, multi-signature governance, timelock actions, and upgrade/version tracking.

### Core capabilities

- Initialize and administer the protocol configuration.
- Create, submit, sign, approve, and cancel rental agreements.
- Process rent and escrow actions with token-aware helpers.
- Track payment history, metadata, and agreement state.
- Support extensions, upgrades, rate limits, and operational pause controls.
- Provide administrative safety layers through multisig and timelock modules.

### Source layout

```text
contract/contracts/chioma/src/
|- lib.rs               # Public contract entry points
|- agreement.rs         # Agreement lifecycle and payment helpers
|- storage.rs           # Storage keys
|- types.rs             # Shared structs and enums
|- errors.rs            # Error enum and error logging
|- events.rs            # Contract events
|- gas_optimization.rs  # Gas estimates and optimization suggestions
|- multi_sig.rs         # Multisig administration
|- multi_token.rs       # Token support and exchange rates
|- rate_limit.rs        # Per-user and per-block protection
|- royalties.rs         # Royalty support
|- timelock.rs          # Delayed admin actions
```

---

## Initialization

### `initialize`

Initializes the contract once with an admin address and runtime config.

```rust
pub fn initialize(env: Env, admin: Address, config: Config) -> Result<(), RentalError>
```

### Initialization requirements

- Contract must not already be initialized.
- `admin` must authorize the call.
- `config.fee_bps` must be `<= 10_000`.

### Config structure

```rust
pub struct Config {
    pub fee_bps: u32,
    pub fee_collector: Address,
    pub paused: bool,
}
```

### Example

```rust
let config = Config {
    fee_bps: 500,
    fee_collector: fee_collector.clone(),
    paused: false,
};

client.initialize(&admin, &config)?;
```

### Common initialization errors

- `AlreadyInitialized`
- `InvalidConfig`

---

## Public Functions

The contract exposes a large API surface. The tables below group functions by capability and summarize the expected behavior.

### 1. Versioning and upgrade governance

| Function                                                                                | Purpose                                            |
| --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `get_version(env)`                                                                      | Return current deployed version metadata.          |
| `record_version(env, version)`                                                          | Persist a new version record. Admin only.          |
| `update_version_status(env, major, minor, patch, status)`                               | Mark a version as active, deprecated, or archived. |
| `get_version_history(env)`                                                              | Return all recorded versions.                      |
| `propose_contract_upgrade(env, proposer, proposal_id, wasm_hash, notes, delay_seconds)` | Start an upgrade proposal.                         |
| `approve_contract_upgrade(env, approver, proposal_id)`                                  | Add multisig approval to an upgrade.               |
| `execute_contract_upgrade(env, executor, proposal_id, new_version)`                     | Execute an approved upgrade after ETA.             |
| `get_upgrade_proposal(env, proposal_id)`                                                | Fetch one upgrade proposal.                        |
| `get_active_upgrade_proposals(env)`                                                     | List active upgrade proposal IDs.                  |
| `get_upgrade_proposal_count(env)`                                                       | Return total proposal count.                       |

### 2. Contract state and safety controls

| Function                         | Purpose                        |
| -------------------------------- | ------------------------------ |
| `initialize(env, admin, config)` | One-time setup.                |
| `get_state(env)`                 | Return stored `ContractState`. |
| `update_config(env, new_config)` | Update fee and paused state.   |
| `pause(env, reason)`             | Pause write operations.        |
| `unpause(env)`                   | Resume normal operations.      |
| `is_paused(env)`                 | Check current pause state.     |

### 3. Token management and exchange rates

| Function                                                                            | Purpose                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------- |
| `add_supported_token(env, token_address, symbol, decimals, min_amount, max_amount)` | Allow a token for agreement/payment flows.  |
| `remove_supported_token(env, token_address)`                                        | Remove a token from the supported set.      |
| `get_supported_tokens(env)`                                                         | Return supported token metadata.            |
| `is_token_supported(env, token_address)`                                            | Check token support.                        |
| `set_exchange_rate(env, from_token, to_token, rate)`                                | Set a conversion rate.                      |
| `get_exchange_rate(env, from_token, to_token)`                                      | Read a stored conversion rate.              |
| `update_exchange_rates(env, tokens, rates)`                                         | Update multiple exchange rates in one call. |
| `convert_amount(env, amount, from_token, to_token)`                                 | Convert between supported tokens.           |

### 4. Agreement creation, lifecycle, and payments

| Function                                                                                                                               | Purpose                                                |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `create_agreement_with_token(env, input)`                                                                                              | Create a token-aware agreement using `AgreementInput`. |
| `get_agreement_token(env, agreement_id)`                                                                                               | Return the payment token for an agreement.             |
| `make_payment_with_token(env, agreement_id, payer, amount, token)`                                                                     | Process rent payment with token-aware validation.      |
| `release_escrow_with_token(env, agreement_id, admin, amount, token)`                                                                   | Trigger escrow release using the selected token.       |
| `freeze_escrow(env, caller, escrow_id)`                                                                                                | Freeze an escrow path.                                 |
| `unfreeze_escrow(env, caller, escrow_id)`                                                                                              | Unfreeze an escrow path.                               |
| `is_escrow_frozen(env, escrow_id)`                                                                                                     | Check escrow frozen state.                             |
| `create_agreement(env, agreement_id, admin, user, agent, monthly_rent, security_deposit, start_date, end_date, agent_commission_rate)` | Create a rental agreement using primitive fields.      |
| `sign_agreement(env, agreement_id, user)`                                                                                              | Tenant/user signs the agreement.                       |
| `approve_agreement(env, agreement_id, approver)`                                                                                       | Approve a pending agreement.                           |
| `submit_agreement(env, agreement_id, admin)`                                                                                           | Submit an agreement for signing/approval.              |
| `cancel_agreement(env, caller, agreement_id)`                                                                                          | Cancel a draft or pending agreement.                   |
| `get_agreement(env, agreement_id)`                                                                                                     | Read agreement details.                                |
| `has_agreement(env, agreement_id)`                                                                                                     | Check if an agreement exists.                          |
| `get_agreement_count(env)`                                                                                                             | Return total agreements created.                       |
| `get_payment_split(env, agreement_id, month)`                                                                                          | Return one month's payment split.                      |
| `get_payment_history(env, agreement_id)`                                                                                               | Return all payment split records.                      |
| `update_metadata(env, agreement_id, metadata_uri, attributes)`                                                                         | Update metadata URI and typed attributes.              |

### 5. Agreement extension flow

| Function                                                                                | Purpose                                      |
| --------------------------------------------------------------------------------------- | -------------------------------------------- |
| `propose_extension(env, caller, agreement_id, extension_months, new_rent, new_deposit)` | Create an extension proposal.                |
| `accept_extension(env, caller, extension_id)`                                           | Accept an extension.                         |
| `reject_extension(env, caller, extension_id, reason)`                                   | Reject an extension with a reason.           |
| `activate_extension(env, caller, extension_id)`                                         | Activate an accepted extension.              |
| `cancel_extension(env, caller, extension_id, reason)`                                   | Cancel an extension.                         |
| `get_extension(env, extension_id)`                                                      | Read a specific extension.                   |
| `get_extension_history(env, agreement_id)`                                              | Read the extension history for an agreement. |
| `get_current_agreement_end(env, agreement_id)`                                          | Return current effective end date.           |

### 6. Deposit interest and diagnostics

| Function                                                                                                 | Purpose                                        |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `set_deposit_interest_config(env, agreement_id, annual_rate, compounding_frequency, interest_recipient)` | Set interest settings for a deposit.           |
| `get_deposit_interest_config(env, agreement_id)`                                                         | Read interest config.                          |
| `calculate_accrued_interest(env, escrow_id)`                                                             | Calculate accrued interest without persisting. |
| `accrue_interest(env, escrow_id)`                                                                        | Persist an accrual event.                      |
| `get_deposit_interest(env, escrow_id)`                                                                   | Return current deposit-interest state.         |
| `get_accrual_history(env, escrow_id)`                                                                    | Return stored accrual history.                 |
| `distribute_interest(env, escrow_id)`                                                                    | Distribute accrued interest.                   |
| `process_interest_accruals(env)`                                                                         | Batch-process accruals.                        |
| `log_error(env, error, operation, details)`                                                              | Persist a diagnostic error log entry.          |
| `get_error_logs(env, limit)`                                                                             | Return recent error logs.                      |

### 7. Royalties and secondary transfer hooks

| Function                                                            | Purpose                                   |
| ------------------------------------------------------------------- | ----------------------------------------- |
| `set_royalty(env, token_id, royalty_percentage, royalty_recipient)` | Configure royalties.                      |
| `get_royalty(env, token_id)`                                        | Read royalty config.                      |
| `calculate_royalty(env, token_id, sale_price)`                      | Estimate royalty for a sale.              |
| `transfer_with_royalty(env, token_id, to, sale_price)`              | Execute transfer with royalty accounting. |
| `get_royalty_payments(env, token_id)`                               | Return royalty history.                   |

### 8. Rate limiting

| Function                                          | Purpose                                   |
| ------------------------------------------------- | ----------------------------------------- |
| `set_rate_limit_config(env, config)`              | Set rate limiting thresholds.             |
| `get_rate_limit_config(env)`                      | Read current rate limit config.           |
| `get_user_call_count(env, user, function_name)`   | Inspect per-user counters.                |
| `get_block_call_count(env, function_name)`        | Inspect per-block counters.               |
| `reset_user_rate_limit(env, user, function_name)` | Emergency reset for a user/function pair. |

### 9. Multisig governance

| Function                                                   | Purpose                                          |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `initialize_multisig(env, admins, required_signatures)`    | Configure multisig admins and threshold.         |
| `get_multisig_config(env)`                                 | Read multisig configuration.                     |
| `is_admin(env, address)`                                   | Check admin membership.                          |
| `propose_action(env, proposer, action_type, target, data)` | Create a multisig admin proposal.                |
| `approve_action(env, approver, proposal_id)`               | Approve a proposal.                              |
| `execute_action(env, executor, proposal_id)`               | Execute an approved proposal.                    |
| `reject_action(env, caller, proposal_id)`                  | Reject or cancel a proposal.                     |
| `add_admin(env, new_admin)`                                | Add an admin through governance-controlled flow. |
| `remove_admin(env, admin_to_remove)`                       | Remove an admin.                                 |
| `update_required_signatures(env, new_required)`            | Change quorum requirement.                       |
| `get_proposal(env, proposal_id)`                           | Return one proposal.                             |
| `get_active_proposals(env)`                                | List active proposals.                           |
| `get_proposal_count(env)`                                  | Return total proposal count.                     |

### 10. Timelock controls

| Function                                                               | Purpose                       |
| ---------------------------------------------------------------------- | ----------------------------- |
| `queue_timelock_action(env, caller, action_type, target, data, delay)` | Queue a delayed admin action. |
| `execute_timelock_action(env, caller, action_id)`                      | Execute after ETA.            |
| `cancel_timelock_action(env, caller, action_id)`                       | Cancel queued action.         |
| `get_timelock_action(env, action_id)`                                  | Read a timelock action.       |
| `get_active_timelock_actions(env)`                                     | Return active timelock IDs.   |
| `get_timelock_action_count(env)`                                       | Return total queued actions.  |

### 11. Gas estimation helpers

| Function                             | Purpose                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| `estimate_gas_cost(env, operation)`  | Return a conservative gas estimate for a tracked operation. |
| `get_gas_metrics(env)`               | Return persisted gas metrics.                               |
| `optimize_operation(env, operation)` | Return an optimization suggestion.                          |

### Major function examples

#### Create an agreement

```rust
client.create_agreement(
    &agreement_id,
    &admin,
    &tenant,
    &Some(agent),
    &500_000,
    &1_000_000,
    &start_date,
    &end_date,
    &750,
)?;
```

#### Submit and sign an agreement

```rust
client.submit_agreement(&agreement_id, &admin)?;
client.sign_agreement(&agreement_id, &tenant)?;
client.approve_agreement(&agreement_id, &witness)?;
```

#### Process a token payment

```rust
client.make_payment_with_token(
    &agreement_id,
    &tenant,
    &500_000,
    &usdc_token,
)?;
```

#### Propose and activate an extension

```rust
let extension_id = client.propose_extension(
    &tenant,
    &agreement_id,
    &12,
    &Some(550_000),
    &None,
)?;

client.accept_extension(&landlord, &extension_id)?;
client.activate_extension(&landlord, &extension_id)?;
```

#### Happy path vs error path

```rust
match client.try_make_payment_with_token(
    &agreement_id,
    &tenant,
    &amount,
    &usdc_token,
) {
    Ok(Ok(())) => {}
    Ok(Err(RentalError::TokenNotSupported)) => {
        // choose a supported payment token
    }
    Ok(Err(RentalError::AgreementNotFound)) => {
        // agreement id is invalid
    }
    Ok(Err(RentalError::RateLimitExceeded)) => {
        // retry later
    }
    _ => {}
}
```

---

## Storage Structure

### Storage keys

```rust
pub enum DataKey {
    Agreement(String),
    AgreementCount,
    State,
    PauseState,
    Initialized,
    SupportedToken(Address),
    SupportedTokens,
    ExchangeRate(Address, Address),
    AgreementToken(String),
    DepositInterestConfig(String),
    DepositInterest(String),
    ErrorLog(u32),
    ErrorLogCount,
    RoyaltyConfig(String),
    RoyaltyPayments(String),
    RateLimitConfig,
    UserCallCount(Address, String),
    BlockCallCount(u64, String),
    PaymentRecord(String, u32),
    MultiSigConfig,
    AdminProposal(String),
    ProposalCount,
    ActiveProposals,
    TimelockAction(String),
    TimelockActionCount,
    ActiveTimelockActions,
    CurrentVersion,
    VersionHistory,
    AgreementExtension(String),
    ExtensionHistory(String),
    EscrowFrozen(String),
    UpgradeProposal(String),
    UpgradeProposalCount,
    ActiveUpgradeProposals,
    GasMetrics(String),
}
```

### Key records

| Record                                       | Purpose                                            |
| -------------------------------------------- | -------------------------------------------------- |
| `ContractState`                              | Admin, config, and initialization state.           |
| `RentAgreement`                              | Primary rental agreement record.                   |
| `AgreementExtension` / `ExtensionHistory`    | Extension workflow data.                           |
| `SupportedToken` / `TokenExchangeRate`       | Token compatibility and conversion rates.          |
| `PaymentSplit`                               | Persisted rent payment split history.              |
| `DepositInterestConfig` / `DepositInterest`  | Security-deposit interest lifecycle.               |
| `AdminProposal` / `MultiSigConfig`           | Governance proposals and signer thresholds.        |
| `TimelockAction` / `ContractUpgradeProposal` | Delayed admin and upgrade flow state.              |
| `ErrorContext`                               | Diagnostic audit record for contract-level errors. |

### Agreement structure

```rust
pub struct RentAgreement {
    pub agreement_id: String,
    pub admin: Address,
    pub user: Address,
    pub agent: Option<Address>,
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent_commission_rate: u32,
    pub status: AgreementStatus,
    pub total_rent_paid: i128,
    pub payment_count: u32,
    pub signed_at: Option<u64>,
    pub witness_id: Option<Address>,
    pub payment_token: Address,
    pub next_payment_due: u64,
    pub metadata_uri: String,
    pub attributes: Vec<Attribute>,
}
```

---

## Events

The contract emits events for agreement actions, token support, governance, upgrades, rate limits, and diagnostics.

### Agreement and config events

- `initialized`
- `agreement_created`
- `agreement_signed`
- `agreement_submitted`
- `agreement_cancelled`
- `agreement_approved`
- `config_updated`
- `paused`
- `unpaused`

### Token and payment events

- `TokenAdded`
- `TokenRemoved`
- `ExchangeRateUpdated`
- `PaymentMadeWithToken`
- `EscrowReleasedWithToken`

### Deposit interest and diagnostics

- `InterestConfigSet`
- `InterestAccruedEvent`
- `InterestDistributed`
- `ErrorOccurred`

### Governance and safety events

- `rate_limit_exceeded`
- `RateLimitConfigUpdated`
- `multisig_initialized`
- `action_proposed`
- `action_approved`
- `action_executed`
- `action_rejected`
- `admin_added`
- `admin_removed`
- `signatures_updated`
- `timelock_queued`
- `timelock_executed`
- `timelock_cancelled`

### Versioning and extension events

- `version_updated`
- `extension_proposed`
- `extension_accepted`
- `extension_rejected`
- `extension_activated`
- `extension_cancelled`
- `upgrade_proposed`
- `upgrade_approved`
- `upgrade_executed`

### Event consumption example

```ts
const events = await server.getEvents({
  filters: [
    {
      type: "contract",
      contractIds: [chiomaContractId],
    },
  ],
});
```

---

## Error Codes

### Core agreement and admin errors

| Code | Name                         |
| ---- | ---------------------------- |
| 1    | `AlreadyInitialized`         |
| 2    | `InvalidAdmin`               |
| 3    | `InvalidConfig`              |
| 4    | `AgreementAlreadyExists`     |
| 5    | `InvalidAmount`              |
| 6    | `InvalidDate`                |
| 7    | `InvalidCommissionRate`      |
| 10   | `AgreementNotActive`         |
| 13   | `AgreementNotFound`          |
| 14   | `NotTenant`                  |
| 15   | `InvalidState`               |
| 16   | `Expired`                    |
| 17   | `ContractPaused`             |
| 18   | `Unauthorized`               |
| 19   | `TokenNotSupported`          |
| 20   | `RateNotFound`               |
| 21   | `ConversionError`            |
| 22   | `InsufficientPayment`        |
| 23   | `AlreadyPaused`              |
| 24   | `NotPaused`                  |
| 25   | `InterestConfigNotFound`     |
| 26   | `InterestAlreadyInitialized` |
| 27   | `NoPrincipal`                |

### Payment, escrow, and governance errors

| Code | Name                       |
| ---- | -------------------------- |
| 201  | `PaymentInsufficientFunds` |
| 202  | `PaymentAlreadyProcessed`  |
| 203  | `PaymentFailed`            |
| 204  | `PaymentInvalidAmount`     |
| 301  | `TimelockNotFound`         |
| 302  | `TimelockAlreadyExecuted`  |
| 303  | `TimelockAlreadyCancelled` |
| 304  | `TimelockEtaNotReached`    |
| 401  | `EscrowNotFound`           |
| 402  | `EscrowAlreadyReleased`    |
| 403  | `EscrowInsufficientFunds`  |
| 404  | `EscrowTimeoutNotReached`  |
| 501  | `InsufficientPermissions`  |
| 502  | `AdminOnly`                |
| 601  | `InvalidTransition`        |
| 701  | `InvalidInput`             |
| 702  | `InvalidAddress`           |
| 801  | `RateLimitExceeded`        |
| 802  | `CooldownNotMet`           |
| 901  | `InternalError`            |
| 902  | `TimelockDelayTooShort`    |
| 1100 | `MultiSigNotInitialized`   |
| 1101 | `ProposalNotFound`         |
| 1102 | `ProposalAlreadyExecuted`  |
| 1103 | `ProposalExpired`          |
| 1104 | `InsufficientApprovals`    |
| 1105 | `AlreadyApproved`          |

---

## Usage Examples

### Full setup flow

```rust
let env = Env::default();
env.mock_all_auths();

let contract_id = env.register(Contract, ());
let client = ContractClient::new(&env, &contract_id);

client.initialize(&admin, &config)?;
client.add_supported_token(&usdc, &symbol, &7, &1_000, &10_000_000_000)?;

client.create_agreement(
    &agreement_id,
    &admin,
    &tenant,
    &None,
    &500_000,
    &1_000_000,
    &start_date,
    &end_date,
    &500,
)?;

client.submit_agreement(&agreement_id, &admin)?;
client.sign_agreement(&agreement_id, &tenant)?;
```

### Metadata update

```rust
let attrs = vec![
    Attribute {
        trait_type: String::from_str(&env, "propertyId"),
        value: String::from_str(&env, "prop-001"),
    },
];

client.update_metadata(
    &agreement_id,
    &String::from_str(&env, "ipfs://agreement-metadata"),
    &attrs,
)?;
```

### Upgrade workflow

```rust
client.propose_contract_upgrade(
    &proposer,
    &proposal_id,
    &wasm_hash,
    &notes,
    &86_400,
)?;

client.approve_contract_upgrade(&approver, &proposal_id)?;
client.execute_contract_upgrade(&executor, &proposal_id, &new_version)?;
```

---

## Integration Notes

### Property and registry layers

- Use a verified property or off-chain listing record before creating agreements.
- Persist the property identifier in `metadata_uri` or `attributes`.

### Payment and escrow layers

- Keep token configuration synchronized with whichever payment/escrow contracts consume the same assets.
- Use `get_payment_history` for off-chain ledger reconciliation and user dashboards.

### Backend services

- Map `RentalError` codes to backend API error responses instead of exposing raw failures directly.
- Subscribe to contract events for asynchronous read-model updates.

---

## Security Considerations

- `pause` and `unpause` should be reserved for operational emergencies or controlled maintenance.
- All admin paths should be fronted by multisig or backend operational controls.
- Avoid unsupported token additions without rate and amount bounds.
- Rate limiting should be configured before exposing high-frequency methods publicly.
- Upgrade and timelock functions should be monitored because they change protocol behavior.

---

## Testing

The contract includes dedicated unit and module-specific tests:

- `tests.rs`
- `tests_multi_token.rs`
- `tests_deposit_interest.rs`
- `tests_multisig_governance.rs`
- `tests_errors.rs`
- `tests_royalties.rs`
- `tests_rate_limit.rs`
- `tests_multisig.rs`
- `tests_timelock.rs`
- `tests_version_pause.rs`

### Recommended commands

```bash
cd contract
cargo test
cargo build --workspace --target wasm32-unknown-unknown --release
```

### What to verify after contract changes

- initialization and pause state
- agreement lifecycle transitions
- token payment and conversion paths
- extension acceptance and activation
- multisig and timelock authorization
- upgrade proposal lifecycle
- gas estimate helpers for tracked operations
