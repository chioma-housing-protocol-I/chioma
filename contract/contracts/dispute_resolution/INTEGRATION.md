# Dispute Resolution Contract - Integration Guide

## Overview

This guide explains how to integrate the DisputeResolutionContract with other contracts in the Chioma platform, particularly the escrow contract and property registry.

## Integration Scenarios

### 1. Escrow Contract Integration

The DisputeResolutionContract is designed to work seamlessly with the escrow contract to handle fund release disputes.

#### Integration Flow

```
1. Tenant deposits funds to escrow
2. Dispute arises about fund release
3. Either party raises a dispute in DisputeResolutionContract
4. Arbiters review off-chain evidence and vote
5. Dispute is resolved with outcome
6. Escrow contract releases funds based on outcome
```

#### Implementation Example

```rust
// In the escrow contract
pub fn resolve_with_dispute_outcome(
    env: Env,
    agreement_id: String,
    dispute_contract: Address,
) -> Result<(), EscrowError> {
    // Get dispute outcome from DisputeResolutionContract
    let dispute_client = DisputeResolutionContractClient::new(&env, &dispute_contract);
    let dispute = dispute_client.get_dispute(&agreement_id)
        .ok_or(EscrowError::DisputeNotFound)?;
    
    if !dispute.resolved {
        return Err(EscrowError::DisputeNotResolved);
    }
    
    // Get outcome
    let outcome = dispute.get_outcome()
        .ok_or(EscrowError::InvalidOutcome)?;
    
    // Release funds based on outcome
    match outcome {
        DisputeOutcome::FavorLandlord => {
            // Release funds to landlord
            self.release_to_landlord(env, agreement_id)?;
        },
        DisputeOutcome::FavorTenant => {
            // Refund to tenant
            self.refund_to_tenant(env, agreement_id)?;
        },
    }
    
    Ok(())
}
```

### 2. Property Registry Integration

Verify that disputes are only raised for legitimate agreements.

#### Implementation Example

```rust
pub fn raise_verified_dispute(
    env: Env,
    agreement_id: String,
    details_hash: String,
    property_registry: Address,
) -> Result<(), DisputeError> {
    // Verify agreement exists in property registry
    let registry_client = PropertyRegistryContractClient::new(&env, &property_registry);
    let property = registry_client.get_property(&agreement_id)
        .ok_or(DisputeError::InvalidAgreement)?;
    
    // Raise dispute
    raise_dispute(&env, agreement_id, details_hash)
}
```

### 3. Agent Registry Integration

Allow agents to facilitate dispute resolution for their clients.

#### Implementation Example

```rust
// Agent facilitates dispute raising on behalf of client
pub fn agent_raise_dispute(
    env: Env,
    agent: Address,
    client: Address,
    agreement_id: String,
    details_hash: String,
    agent_registry: Address,
) -> Result<(), DisputeError> {
    // Verify agent is registered and verified
    let agent_client = AgentRegistryContractClient::new(&env, &agent_registry);
    let agent_info = agent_client.get_agent_info(&agent)
        .ok_or(DisputeError::AgentNotFound)?;
    
    if !agent_info.verified {
        return Err(DisputeError::AgentNotVerified);
    }
    
    // Verify agent has authority to act for client
    client.require_auth();
    
    // Raise dispute
    raise_dispute(&env, agreement_id, details_hash)
}
```

## Data Flow

### Raising a Dispute

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Tenant/   │─────>│     Dispute      │<────>│  IPFS/Off-  │
│  Landlord   │      │   Resolution     │      │   chain     │
└─────────────┘      └──────────────────┘      └─────────────┘
                              │
                              │
                              ▼
                     ┌──────────────────┐
                     │   Dispute Data   │
                     │  (on-chain)      │
                     └──────────────────┘
```

### Arbiter Voting

```
┌─────────────┐      ┌──────────────────┐
│  Arbiter 1  │─────>│                  │
└─────────────┘      │                  │
                     │     Dispute      │
┌─────────────┐      │   Resolution     │
│  Arbiter 2  │─────>│                  │
└─────────────┘      │                  │
                     │                  │
┌─────────────┐      │                  │
│  Arbiter 3  │─────>│                  │
└─────────────┘      └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Vote Tally &    │
                     │  Outcome         │
                     └──────────────────┘
```

### Escrow Resolution

```
┌──────────────────┐      ┌──────────────────┐      ┌─────────────┐
│     Dispute      │─────>│     Escrow       │─────>│   Funds     │
│   Resolution     │      │    Contract      │      │  Released   │
│   (Outcome)      │      │                  │      │             │
└──────────────────┘      └──────────────────┘      └─────────────┘
```

## Storage Patterns

### Efficient Querying

The contract uses optimized storage keys:

```rust
#[contracttype]
pub enum DataKey {
    Arbiter(Address),           // Individual arbiter lookup
    State,                      // Contract state
    Initialized,                // Init flag
    ArbiterCount,              // Total arbiter count
    Dispute(String),           // Individual dispute by agreement_id
    Vote(String, Address),     // Vote by agreement_id and arbiter
}
```

### Storage Lifetime

All persistent storage has extended TTL (500,000 ledgers) for long-term data retention.

## Event Monitoring

### Frontend Integration

Listen to events for real-time updates:

```javascript
// Subscribe to dispute events
contract.on('DisputeRaised', (event) => {
  const { agreement_id, details_hash } = event;
  // Fetch details from IPFS using details_hash
  // Update UI to show new dispute
});

contract.on('VoteCast', (event) => {
  const { agreement_id, arbiter, favor_landlord } = event;
  // Update vote tally in UI
});

contract.on('DisputeResolved', (event) => {
  const { agreement_id, outcome, votes_favor_landlord, votes_favor_tenant } = event;
  // Show resolution result
  // Trigger escrow release if applicable
});
```

## Off-Chain Evidence Management

### IPFS Integration

```javascript
// Upload evidence to IPFS
async function uploadEvidence(evidence) {
  const ipfs = create({ url: 'https://ipfs.infura.io:5001' });
  const { cid } = await ipfs.add(JSON.stringify(evidence));
  return cid.toString();
}

// Raise dispute with IPFS hash
async function raiseDisputeWithEvidence(agreementId, evidence) {
  const detailsHash = await uploadEvidence(evidence);
  await contract.raise_dispute(agreementId, detailsHash);
}

// Retrieve evidence for arbiters
async function getDisputeEvidence(agreementId) {
  const dispute = await contract.get_dispute(agreementId);
  const response = await fetch(`https://ipfs.io/ipfs/${dispute.details_hash}`);
  return await response.json();
}
```

### Evidence Structure

Recommended evidence format:

```json
{
  "version": "1.0",
  "agreement_id": "agreement_001",
  "raised_by": "tenant",
  "timestamp": 1640000000,
  "claim": "Security deposit wrongfully withheld",
  "evidence": [
    {
      "type": "photo",
      "url": "ipfs://Qm...",
      "description": "Property condition at move-out"
    },
    {
      "type": "document",
      "url": "ipfs://Qm...",
      "description": "Signed lease agreement"
    },
    {
      "type": "communication",
      "url": "ipfs://Qm...",
      "description": "Email thread with landlord"
    }
  ],
  "requested_outcome": "full_refund"
}
```

## Best Practices

### 1. Arbiter Selection

- Maintain a diverse pool of arbiters
- Implement arbiter rotation to prevent bias
- Consider implementing arbiter reputation tracking

### 2. Minimum Votes Configuration

- Small arbiter pool (< 10): Set min_votes to 3
- Medium pool (10-30): Set min_votes to 5
- Large pool (> 30): Set min_votes to 7

### 3. Evidence Handling

- Always store evidence off-chain (IPFS, Arweave, etc.)
- Only store content hashes on-chain
- Implement evidence versioning
- Allow evidence updates before voting starts

### 4. Time Constraints

Consider implementing timeouts:
- Maximum voting period (e.g., 7 days)
- Minimum evidence review period (e.g., 48 hours)
- Automatic resolution if timeout expires

### 5. Dispute Categories

Categorize disputes for better arbiter assignment:
- Security deposit disputes
- Property damage claims
- Lease violation disputes
- Early termination disagreements

## Security Considerations

### 1. Access Control

- Only admin can add arbiters
- Only verified arbiters can vote
- Anyone can raise disputes (consider restricting to agreement parties)

### 2. Reentrancy Protection

Soroban contracts are inherently protected against reentrancy, but:
- Validate all inputs
- Check state before external calls
- Update state before emitting events

### 3. Data Validation

```rust
// Always validate inputs
if details_hash.is_empty() {
    return Err(DisputeError::InvalidDetailsHash);
}

// Check arbiter status
if !arbiter_info.active {
    return Err(DisputeError::ArbiterNotFound);
}

// Verify dispute exists and is not resolved
if dispute.resolved {
    return Err(DisputeError::DisputeAlreadyResolved);
}
```

### 4. Economic Attacks

Consider implementing:
- Dispute fees to prevent spam
- Arbiter staking requirements
- Penalties for incorrect votes (requires appeal mechanism)

## Testing Integration

### Integration Test Example

```rust
#[test]
fn test_full_dispute_resolution_flow() {
    let env = Env::default();
    
    // Deploy contracts
    let dispute_contract = create_dispute_contract(&env);
    let escrow_contract = create_escrow_contract(&env);
    
    // Setup
    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let arbiter2 = Address::generate(&env);
    let arbiter3 = Address::generate(&env);
    
    env.mock_all_auths();
    
    // Initialize
    dispute_contract.initialize(&admin, &3);
    dispute_contract.add_arbiter(&admin, &arbiter1);
    dispute_contract.add_arbiter(&admin, &arbiter2);
    dispute_contract.add_arbiter(&admin, &arbiter3);
    
    // Create escrow
    let agreement_id = String::from_str(&env, "test_agreement");
    escrow_contract.create_escrow(&agreement_id, &landlord, &tenant, &1000);
    
    // Raise dispute
    let details_hash = String::from_str(&env, "QmTest...");
    dispute_contract.raise_dispute(&agreement_id, &details_hash);
    
    // Vote
    dispute_contract.vote_on_dispute(&arbiter1, &agreement_id, &true);
    dispute_contract.vote_on_dispute(&arbiter2, &agreement_id, &true);
    dispute_contract.vote_on_dispute(&arbiter3, &agreement_id, &false);
    
    // Resolve
    let outcome = dispute_contract.resolve_dispute(&agreement_id);
    assert_eq!(outcome, DisputeOutcome::FavorLandlord);
    
    // Release escrow based on outcome
    escrow_contract.resolve_with_dispute(
        &agreement_id,
        &dispute_contract.address
    );
    
    // Verify funds released to landlord
    let escrow_state = escrow_contract.get_escrow(&agreement_id).unwrap();
    assert!(escrow_state.released_to_landlord);
}
```

## Future Enhancements

1. **Appeal Mechanism**: Allow parties to appeal resolved disputes
2. **Arbiter Specialization**: Match arbiters based on dispute type
3. **Partial Resolutions**: Support split outcomes (e.g., 60% landlord, 40% tenant)
4. **Time-based Auto-resolution**: Automatic resolution if minimum votes not reached
5. **Reputation System**: Track arbiter accuracy and reliability
6. **Multi-tier Arbitration**: Escalation path for high-value disputes

## Support

For questions or issues:
- GitHub Issues: [repository link]
- Documentation: [docs link]
- Community: [Discord/Telegram link]
