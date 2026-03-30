# Agent Registry Contract Documentation

The Agent Registry contract is a Soroban smart contract designed to manage and verify agents within the Chioma ecosystem. It provides a decentralized way to track agent reputation, verify their identity, and link them to property transactions.

## Purpose

The primary purpose of the Agent Registry is to:
- **Establish Trust**: Verify agents through an administrative process.
- **Track Reputation**: Allow parties involved in a transaction to rate agents, building a transparent reputation system.
- **Ensure Accountability**: Link agents to specific transactions, ensuring ratings are only given for actual work completed.

## Core Features
1. **Agent Self-Registration**: Agents can register themselves with a link to an external profile (e.g., IPFS).
2. **Admin Verification**: Platform admins can verify agents after reviewing their credentials.
3. **Transaction Linking**: Contracts like the Rent Agreement can register transactions involving specific agents.
4. **Rating System**: Verified transaction parties can rate agents (1-5 stars) after a transaction is completed.
5. **Reputation Metrics**: Tracks average rating, total ratings, and completed agreements.

---

## Technical Specifications

### Storage Structure

The contract uses `DataKey` to manage its storage. All keys are stored in either `Instance` or `Persistent` storage.

| Key | Type | Storage Type | Description |
|-----|------|--------------|-------------|
| `Initialized` | `bool` | Persistent | Boolean flag to track if the contract is initialized. |
| `State` | `ContractState` | Instance | Stores contract-wide state, including the admin address. |
| `Agent(Address)` | `AgentInfo` | Persistent | Stores metadata and reputation for a specific agent. |
| `AgentCount` | `u32` | Instance | Tracks the total number of registered agents. |
| `Transaction(String)` | `AgentTransaction` | Persistent | Stores details of a transaction registered with an agent. |
| `AgentRating(Address, Address)` | `Rating` | Persistent | Stores a rating given by a rater to an agent for a specific transaction. |

### Data Structures

#### `ContractState`
```rust
pub struct ContractState {
    pub admin: Address, // Platform administrator address
    pub initialized: bool,
}
```

#### `AgentInfo`
```rust
pub struct AgentInfo {
    pub agent: Address,
    pub external_profile_hash: String, // Link to external profile (e.g., IPFS)
    pub verified: bool,
    pub registered_at: u64,
    pub verified_at: Option<u64>,
    pub total_ratings: u32,
    pub total_score: u32,
    pub completed_agreements: u32,
}
```

#### `AgentTransaction`
```rust
pub struct AgentTransaction {
    pub transaction_id: String,
    pub agent: Address,
    pub parties: Vec<Address>, // List of rater-eligible addresses (e.g., Tenant, Landlord)
    pub completed: bool,
}
```

---

## API Documentation

### Initialization

#### `initialize(env: Env, admin: Address) -> Result<(), AgentError>`
Initializes the contract with an admin address.
- **Auth**: Required for `admin`.
- **Errors**: `AlreadyInitialized`.

### Agent Management

#### `register_agent(env: Env, agent: Address, external_profile_hash: String) -> Result<(), AgentError>`
Allows an agent to register themselves.
- **Auth**: Required for `agent`.
- **Errors**: `NotInitialized`, `AgentAlreadyRegistered`, `InvalidProfileHash`.

#### `verify_agent(env: Env, admin: Address, agent: Address) -> Result<(), AgentError>`
Verifies an existing agent.
- **Auth**: Required for `admin`.
- **Errors**: `NotInitialized`, `Unauthorized`, `AgentNotFound`, `AlreadyVerified`.

#### `get_agent_info(env: Env, agent: Address) -> Option<AgentInfo>`
Retrieves public info and reputation for an agent.

#### `get_agent_count(env: Env) -> u32`
Returns the total number of registered agents.

### Transaction & Rating

#### `register_transaction(env: Env, transaction_id: String, agent: Address, parties: Vec<Address>) -> Result<(), AgentError>`
Registers a transaction involving an agent. This is typically called by other Chioma contracts (e.g., Rent Agreement).
- **Errors**: `NotInitialized`, `AgentNotFound`.

#### `complete_transaction(env: Env, transaction_id: String, agent: Address) -> Result<(), AgentError>`
Marks a transaction as completed, enabling the `parties` to rate the agent.
- **Auth**: Required for `agent`.
- **Errors**: `NotInitialized`, `TransactionNotFound`, `Unauthorized`.

#### `rate_agent(env: Env, rater: Address, agent: Address, score: u32, transaction_id: String) -> Result<(), AgentError>`
Allows a transaction party to rate the agent.
- **Auth**: Required for `rater`.
- **Constraints**: 1-5 score, transaction must be completed, rater must be in `parties`.
- **Errors**: `NotInitialized`, `InvalidRatingScore`, `AgentNotFound`, `AgentNotVerified`, `TransactionNotFound`, `TransactionNotCompleted`, `NotTransactionParty`, `AlreadyRated`.

---

## Events Emitted

| Event | Topics | Data | Description |
|-------|--------|------|-------------|
| `ContractInitialized` | `initialized` | `admin: Address` | Emitted when the contract is first set up. |
| `AgentRegistered` | `agent_reg`, `agent: Address` | `external_profile_hash: String` | Emitted when a new agent registers. |
| `AgentVerified` | `agent_ver`, `admin: Address`, `agent: Address` | - | Emitted when an admin verifies an agent. |
| `AgentRated` | `agent_rated`, `agent: Address`, `rater: Address` | `score: u32` | Emitted when an agent receives a rating. |
| `TransactionRegistered` | `txn_reg`, `transaction_id: String`, `agent: Address` | - | Emitted when a new transaction is linked. |

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `AlreadyInitialized` | Contract is already initialized. |
| 2 | `NotInitialized` | Contract has not been initialized. |
| 3 | `AgentAlreadyRegistered` | This address is already registered as an agent. |
| 4 | `AgentNotFound` | Agent not found in registry. |
| 5 | `Unauthorized` | Caller does not have permission for this action. |
| 6 | `AlreadyVerified` | Agent is already verified. |
| 7 | `InvalidProfileHash` | The provided profile hash is invalid or empty. |
| 8 | `InvalidRatingScore` | Rating score must be between 1 and 5. |
| 9 | `AgentNotVerified` | Agent must be verified to perform this action. |
| 10 | `AlreadyRated` | Rater has already rated this agent for this transaction. |
| 11 | `TransactionNotFound` | Transaction ID not found. |
| 12 | `NotTransactionParty` | Caller is not a party in the specified transaction. |
| 13 | `TransactionNotCompleted` | Transaction must be completed before rating. |

---

## Usage Guide

### Integration Example: Rent Agreement Contract

When a rent agreement is created, it should register the transaction with the Agent Registry:

```rust
// In Rent Agreement Contract
let agent_registry = AgentRegistryClient::new(&env, &registry_id);

// 1. Verify agent is valid/verified
let info = agent_registry.get_agent_info(&agent_address).unwrap();
if !info.verified { panic!("Agent not verified"); }

// 2. Register transaction
let parties = vec![&env, tenant, landlord];
agent_registry.register_transaction(&agreement_id, &agent_address, &parties);
```

### Frontend Integration (JS/SDK)

```javascript
// Fetch Agent Reputation
const agentInfo = await agentRegistryContract.get_agent_info({ agent: agentAddress });
console.log(`Rating: ${agentInfo.total_score / agentInfo.total_ratings} Stars`);

// Rate Agent
await agentRegistryContract.rate_agent({
  rater: userAddress,
  agent: agentAddress,
  score: 5,
  transaction_id: "TXN123"
});
```
