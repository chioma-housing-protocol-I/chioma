# Agent Registry Contract

The Agent Registry Contract is a Soroban smart contract that tracks verified house agents and their reputation scores on the Stellar blockchain. It maintains an immutable registry of approved agents and allows tenants and landlords to rate agents after successful property transactions.

## Overview

This contract enables:
- **Agent Registration**: Agents can self-register with an external profile reference
- **Admin Verification**: Platform administrators can verify registered agents
- **Transaction Tracking**: Links agents to property transactions for accountability
- **Reputation System**: Allows transaction parties to rate agents (1-5 stars) and calculates average ratings
- **Access Control**: Ensures only verified parties can rate agents and only admins can verify them

## Data Structures

### AgentInfo
```rust
pub struct AgentInfo {
    pub agent: Address,
    pub external_profile_hash: String,
    pub verified: bool,
    pub registered_at: u64,
    pub verified_at: Option<u64>,
    pub total_ratings: u32,
    pub total_score: u32,
    pub completed_agreements: u32,
}
```

### AgentTransaction
```rust
pub struct AgentTransaction {
    pub transaction_id: String,
    pub agent: Address,
    pub parties: Vec<Address>,
    pub completed: bool,
}
```

## Methods

### Administrative Functions

#### `initialize(admin: Address) -> Result<(), AgentError>`
Initializes the contract with an admin address who has privileges to verify agents.

**Parameters:**
- `admin`: The address that will have admin privileges

**Errors:**
- `AlreadyInitialized`: If contract has already been initialized

#### `get_state() -> Option<ContractState>`
Returns the current contract state including the admin address.

### Agent Management

#### `register_agent(agent: Address, external_profile_hash: String) -> Result<(), AgentError>`
Allows an agent to self-register with the system.

**Parameters:**
- `agent`: The address of the agent registering
- `external_profile_hash`: Hash reference to agent's external profile (IPFS hash, etc.)

**Errors:**
- `NotInitialized`: Contract hasn't been initialized
- `AgentAlreadyRegistered`: Agent is already registered
- `InvalidProfileHash`: Profile hash is empty

#### `verify_agent(admin: Address, agent: Address) -> Result<(), AgentError>`
Platform admin verifies a registered agent (admin-only function).

**Parameters:**
- `admin`: The admin address performing verification
- `agent`: The address of the agent to verify

**Errors:**
- `NotInitialized`: Contract hasn't been initialized
- `Unauthorized`: Caller is not the admin
- `AgentNotFound`: Agent doesn't exist
- `AlreadyVerified`: Agent is already verified

#### `get_agent_info(agent: Address) -> Option<AgentInfo>`
Retrieves information about a registered agent.

**Parameters:**
- `agent`: The address of the agent

**Returns:**
- `Option<AgentInfo>`: Agent information if they exist

#### `get_agent_count() -> u32`
Returns the total number of registered agents.

### Transaction Management

#### `register_transaction(transaction_id: String, agent: Address, parties: Vec<Address>) -> Result<(), AgentError>`
Registers a transaction involving an agent. Called when a rent agreement or property transaction is created.

**Parameters:**
- `transaction_id`: Unique identifier for the transaction
- `agent`: The agent involved in the transaction
- `parties`: Vector of addresses involved (tenant, landlord, etc.)

**Errors:**
- `NotInitialized`: Contract hasn't been initialized
- `AgentNotFound`: Agent doesn't exist

#### `complete_transaction(transaction_id: String, agent: Address) -> Result<(), AgentError>`
Marks a transaction as completed, enabling parties to rate the agent.

**Parameters:**
- `transaction_id`: The ID of the transaction to complete
- `agent`: The agent address (for verification)

**Errors:**
- `NotInitialized`: Contract hasn't been initialized
- `TransactionNotFound`: Transaction doesn't exist
- `Unauthorized`: Caller is not the agent for this transaction

### Rating System

#### `rate_agent(rater: Address, agent: Address, score: u32, transaction_id: String) -> Result<(), AgentError>`
Allows a transaction party (tenant or landlord) to rate an agent after completing a transaction.

**Parameters:**
- `rater`: The address of the person rating
- `agent`: The address of the agent being rated
- `score`: The rating score (1-5)
- `transaction_id`: The ID of the completed transaction

**Errors:**
- `NotInitialized`: Contract hasn't been initialized
- `InvalidRatingScore`: Score is not between 1 and 5
- `AgentNotFound`: Agent doesn't exist
- `AgentNotVerified`: Agent is not verified
- `TransactionNotFound`: Transaction doesn't exist
- `TransactionNotCompleted`: Transaction is not marked as completed
- `NotTransactionParty`: Rater wasn't part of the transaction
- `AlreadyRated`: Rater has already rated this agent

## Reputation System

The contract calculates reputation based on:
1. **Average Rating**: Total score divided by number of ratings (1-5 scale)
2. **Completed Agreements**: Total number of successfully completed transactions
3. **Total Ratings**: Number of ratings received

Agents can only be rated by verified transaction parties after transaction completion.

## Access Control

- **Agent Registration**: Requires authentication from the agent's address
- **Agent Verification**: Only callable by the admin address
- **Rating**: Only transaction parties can rate, and only for completed transactions
- **One Rating Per Party**: Each party can rate an agent only once per transaction

## Usage Example

```rust
// Initialize contract
contract.initialize(&admin);

// Agent self-registers
contract.register_agent(&agent, &profile_hash);

// Admin verifies the agent
contract.verify_agent(&admin, &agent);

// Register a transaction
let parties = vec![tenant, landlord];
contract.register_transaction(&txn_id, &agent, &parties);

// Complete the transaction
contract.complete_transaction(&txn_id, &agent);

// Parties rate the agent
contract.rate_agent(&tenant, &agent, &5, &txn_id);
contract.rate_agent(&landlord, &agent, &4, &txn_id);

// Get agent info with reputation
let info = contract.get_agent_info(&agent);
// info.average_rating() returns 4 (average of 5 and 4)
```

## Building and Testing

```bash
# Build the contract
make build

# Run tests
make test

# Format code
make fmt
```

## Integration with Chioma Ecosystem

This contract integrates with the Chioma rent payment system by:
1. Preventing fraudulent addresses from being added as agents in rent agreements
2. Tracking agent involvement in property transactions
3. Building verifiable reputation for agents based on completed transactions
4. Ensuring automatic commission distributions go only to verified, reputable agents

## Security Considerations

- Agents must be verified by admin before they can receive ratings
- Only transaction parties can rate agents
- Ratings are immutable once submitted
- Transaction completion is required before rating
- Access control prevents unauthorized verification or rating
