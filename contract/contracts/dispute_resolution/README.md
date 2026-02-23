# Dispute Resolution Contract

## Overview

The DisputeResolutionContract is a decentralized arbitration system designed to handle stalled escrows and complex agreement disputes through verified arbiters. This contract enables a transparent, vote-based resolution process for disputes between landlords and tenants.

## Motivation

While the escrow contract mentions dispute resolution with arbiter involvement, a dedicated contract provides a more robust framework for:
- Mapping verified arbiters
- Managing dispute tickets
- Enabling vote-based resolution
- Providing transparent and decentralized dispute handling

For example, if a landlord and tenant disagree on a security deposit release, verified arbiters can step in to review off-chain evidence and vote on-chain for the funds' release.

## Features

- **Arbiter Management**: Admin can add verified arbiters to the system
- **Dispute Creation**: Anyone can raise a dispute for a specific agreement
- **Voting System**: Verified arbiters can vote on disputes
- **Majority Rule**: Disputes are resolved based on majority votes
- **Minimum Votes Requirement**: Configurable minimum number of votes required for resolution
- **Transparent Outcome**: Clear outcomes (FavorLandlord or FavorTenant)

## Architecture

### Data Structures

#### DisputeOutcome
```rust
pub enum DisputeOutcome {
    FavorLandlord,
    FavorTenant,
}
```

#### ContractState
- `admin`: Address with administrative privileges
- `initialized`: Initialization status
- `min_votes_required`: Minimum votes needed to resolve a dispute (default: 3)

#### Arbiter
- `address`: Arbiter's address
- `added_at`: Timestamp when arbiter was added
- `active`: Whether the arbiter is active

#### Dispute
- `agreement_id`: Unique identifier for the agreement
- `details_hash`: Hash reference to off-chain evidence (IPFS, etc.)
- `raised_at`: Timestamp when dispute was raised
- `resolved`: Whether the dispute has been resolved
- `resolved_at`: Timestamp when dispute was resolved
- `votes_favor_landlord`: Count of votes favoring landlord
- `votes_favor_tenant`: Count of votes favoring tenant

#### Vote
- `arbiter`: Address of the voting arbiter
- `agreement_id`: Agreement being voted on
- `favor_landlord`: Vote direction (true = landlord, false = tenant)
- `voted_at`: Timestamp of the vote

## Contract Methods

### Initialize
```rust
pub fn initialize(env: Env, admin: Address, min_votes_required: u32) -> Result<(), DisputeError>
```
Initializes the contract with an admin and minimum votes requirement.

**Parameters:**
- `admin`: Address with administrative privileges
- `min_votes_required`: Minimum votes needed to resolve disputes

**Errors:**
- `AlreadyInitialized`: Contract already initialized

### Add Arbiter (Admin Only)
```rust
pub fn add_arbiter(env: Env, admin: Address, arbiter: Address) -> Result<(), DisputeError>
```
Adds a verified arbiter to handle disputes.

**Parameters:**
- `admin`: Admin address performing the action
- `arbiter`: Address of the arbiter to add

**Errors:**
- `NotInitialized`: Contract not initialized
- `Unauthorized`: Caller is not the admin
- `ArbiterAlreadyExists`: Arbiter already registered

### Raise Dispute
```rust
pub fn raise_dispute(env: Env, agreement_id: String, details_hash: String) -> Result<(), DisputeError>
```
Raises a dispute for a specific agreement.

**Parameters:**
- `agreement_id`: Unique identifier for the agreement
- `details_hash`: Hash reference to off-chain evidence

**Errors:**
- `NotInitialized`: Contract not initialized
- `DisputeAlreadyExists`: Dispute already exists for this agreement
- `InvalidDetailsHash`: Details hash is empty

### Vote on Dispute (Arbiters Only)
```rust
pub fn vote_on_dispute(env: Env, arbiter: Address, agreement_id: String, favor_landlord: bool) -> Result<(), DisputeError>
```
Allows an arbiter to vote on an existing dispute.

**Parameters:**
- `arbiter`: Address of the voting arbiter
- `agreement_id`: ID of the agreement in dispute
- `favor_landlord`: true = favor landlord, false = favor tenant

**Errors:**
- `NotInitialized`: Contract not initialized
- `ArbiterNotFound`: Arbiter doesn't exist or is inactive
- `DisputeNotFound`: Dispute doesn't exist
- `DisputeAlreadyResolved`: Dispute already resolved
- `AlreadyVoted`: Arbiter already voted on this dispute

### Resolve Dispute
```rust
pub fn resolve_dispute(env: Env, agreement_id: String) -> Result<DisputeOutcome, DisputeError>
```
Resolves a dispute by evaluating votes and determining the outcome.

**Parameters:**
- `agreement_id`: ID of the agreement in dispute

**Returns:**
- `DisputeOutcome`: The outcome (FavorLandlord or FavorTenant)

**Errors:**
- `NotInitialized`: Contract not initialized
- `DisputeNotFound`: Dispute doesn't exist
- `DisputeAlreadyResolved`: Dispute already resolved
- `InsufficientVotes`: Minimum required votes not met

## Query Methods

### Get State
```rust
pub fn get_state(env: Env) -> Option<ContractState>
```
Returns the current contract state.

### Get Dispute
```rust
pub fn get_dispute(env: Env, agreement_id: String) -> Option<Dispute>
```
Returns information about a specific dispute.

### Get Arbiter
```rust
pub fn get_arbiter(env: Env, arbiter: Address) -> Option<Arbiter>
```
Returns information about a specific arbiter.

### Get Arbiter Count
```rust
pub fn get_arbiter_count(env: Env) -> u32
```
Returns the total number of registered arbiters.

### Get Vote
```rust
pub fn get_vote(env: Env, agreement_id: String, arbiter: Address) -> Option<Vote>
```
Returns a specific vote for a dispute.

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 1 | AlreadyInitialized | Contract already initialized |
| 2 | NotInitialized | Contract not initialized |
| 3 | Unauthorized | Caller not authorized |
| 4 | ArbiterAlreadyExists | Arbiter already registered |
| 5 | ArbiterNotFound | Arbiter doesn't exist or inactive |
| 6 | DisputeNotFound | Dispute doesn't exist |
| 7 | DisputeAlreadyExists | Dispute already exists |
| 8 | DisputeAlreadyResolved | Dispute already resolved |
| 9 | AlreadyVoted | Arbiter already voted |
| 10 | InvalidDetailsHash | Details hash is empty |
| 11 | InsufficientVotes | Not enough votes to resolve |

## Events

### ContractInitialized
Emitted when the contract is initialized.

### ArbiterAdded
Emitted when a new arbiter is added.

### DisputeRaised
Emitted when a new dispute is raised.

### VoteCast
Emitted when an arbiter casts a vote.

### DisputeResolved
Emitted when a dispute is resolved with the outcome.

## Usage Example

```rust
// Initialize the contract
let admin = Address::generate(&env);
contract.initialize(&admin, &3); // Require 3 votes minimum

// Add arbiters
let arbiter1 = Address::generate(&env);
let arbiter2 = Address::generate(&env);
let arbiter3 = Address::generate(&env);
contract.add_arbiter(&admin, &arbiter1);
contract.add_arbiter(&admin, &arbiter2);
contract.add_arbiter(&admin, &arbiter3);

// Raise a dispute
let agreement_id = String::from_str(&env, "agreement_001");
let details_hash = String::from_str(&env, "QmXoypizjW3...");
contract.raise_dispute(&agreement_id, &details_hash);

// Arbiters vote
contract.vote_on_dispute(&arbiter1, &agreement_id, &true);  // Favor landlord
contract.vote_on_dispute(&arbiter2, &agreement_id, &true);  // Favor landlord
contract.vote_on_dispute(&arbiter3, &agreement_id, &false); // Favor tenant

// Resolve dispute
let outcome = contract.resolve_dispute(&agreement_id);
// outcome = DisputeOutcome::FavorLandlord (2-1 vote)
```

## Testing

Run tests with:
```bash
make test
```

Or:
```bash
cargo test
```

## Building

Build the contract with:
```bash
make build
```

Or:
```bash
cargo build --target wasm32-unknown-unknown --release
```

## Integration

This contract is designed to integrate with:
- **Escrow Contract**: For automatic fund release based on dispute outcomes
- **Property Registry**: To verify agreement legitimacy
- **Off-chain Evidence Storage**: IPFS or similar for dispute details

See [INTEGRATION.md](./INTEGRATION.md) for integration guidelines.

## Security Considerations

1. **Arbiter Trust**: Only trusted arbiters should be added by the admin
2. **Off-chain Evidence**: The contract stores only hashes; actual evidence must be stored off-chain
3. **Finality**: Once resolved, disputes cannot be changed
4. **Minimum Votes**: Configure appropriately based on arbiter pool size
5. **One Vote Per Arbiter**: Each arbiter can only vote once per dispute

## License

See the main LICENSE file in the repository root.
