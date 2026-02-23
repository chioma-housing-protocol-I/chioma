# Agent Registry Contract Integration Guide

This guide explains how to integrate the Agent Registry Contract with the Chioma rent payment ecosystem.

## Overview

The Agent Registry Contract provides on-chain verification and reputation tracking for house agents. It prevents fraudulent addresses from being added as agents in rent agreements and ensures only verified, reputable agents receive automatic commission distributions.

## Integration Points

### 1. Rent Agreement Creation

When creating a new rent agreement that includes an agent commission:

```rust
// Before creating the rent agreement, verify the agent is registered and verified
let agent_info = agent_registry.get_agent_info(&agent_address);

match agent_info {
    Some(info) => {
        if !info.verified {
            return Err(Error::AgentNotVerified);
        }
        // Proceed with rent agreement creation
    }
    None => return Err(Error::AgentNotFound),
}

// Register the transaction with the agent registry
let parties = vec![tenant_address, landlord_address];
agent_registry.register_transaction(
    &agreement_id,
    &agent_address,
    &parties
)?;
```

### 2. Transaction Completion

When a rent agreement or property transaction is successfully completed:

```rust
// Mark the transaction as complete in the agent registry
agent_registry.complete_transaction(&agreement_id, &agent_address)?;

// This enables the parties to rate the agent
```

### 3. Agent Rating

After a transaction is completed, tenants and landlords can rate the agent:

```rust
// Tenant rates the agent
agent_registry.rate_agent(
    &tenant_address,
    &agent_address,
    &5, // Rating: 1-5 stars
    &agreement_id
)?;

// Landlord rates the agent
agent_registry.rate_agent(
    &landlord_address,
    &agent_address,
    &4,
    &agreement_id
)?;
```

### 4. Agent Verification (Frontend)

Display agent reputation information in the UI:

```rust
let agent_info = agent_registry.get_agent_info(&agent_address)?;

// Display:
// - Verified status: agent_info.verified
// - Average rating: agent_info.average_rating()
// - Total ratings: agent_info.total_ratings
// - Completed agreements: agent_info.completed_agreements
```

## Workflow Example

### Complete Flow: From Agent Registration to Rating

```rust
// 1. Admin initializes the contract
agent_registry.initialize(&admin_address);

// 2. Agent self-registers
agent_registry.register_agent(
    &agent_address,
    &"QmProfileHashIPFS..."
);

// 3. Admin verifies the agent
agent_registry.verify_agent(&admin_address, &agent_address);

// 4. Rent agreement is created (in chioma contract)
// Verify agent before including in agreement
let agent_info = agent_registry.get_agent_info(&agent_address)?;
if !agent_info.verified {
    return Err(Error::AgentNotVerified);
}

// 5. Register the transaction
let parties = vec![tenant, landlord];
agent_registry.register_transaction(
    &"RENT-001",
    &agent_address,
    &parties
);

// 6. Transaction completes successfully
agent_registry.complete_transaction(&"RENT-001", &agent_address);

// 7. Parties rate the agent
agent_registry.rate_agent(&tenant, &agent_address, &5, &"RENT-001");
agent_registry.rate_agent(&landlord, &agent_address, &4, &"RENT-001");

// 8. View updated reputation
let updated_info = agent_registry.get_agent_info(&agent_address);
// average_rating() = 4 (average of 5 and 4)
// completed_agreements = 1
// total_ratings = 2
```

## Security Best Practices

### 1. Agent Verification

Always verify an agent before including them in a rent agreement:

```rust
fn validate_agent(registry: &AgentRegistryClient, agent: &Address) -> Result<(), Error> {
    let info = registry.get_agent_info(agent)
        .ok_or(Error::AgentNotFound)?;
    
    if !info.verified {
        return Err(Error::AgentNotVerified);
    }
    
    Ok(())
}
```

### 2. Transaction Registration

Register transactions immediately when created to establish the rating relationship:

```rust
// In rent agreement contract
pub fn create_agreement(
    env: Env,
    tenant: Address,
    landlord: Address,
    agent: Option<Address>,
    // ... other params
) -> Result<String, Error> {
    let agreement_id = generate_agreement_id(&env);
    
    // If agent is included, register the transaction
    if let Some(agent_addr) = agent {
        let parties = vec![&env, tenant.clone(), landlord.clone()];
        
        // Call agent registry contract
        let agent_registry = AgentRegistryClient::new(&env, &registry_contract_id);
        agent_registry.register_transaction(
            &agreement_id,
            &agent_addr,
            &parties
        )?;
    }
    
    // Create the agreement
    // ...
    
    Ok(agreement_id)
}
```

### 3. Rating Access Control

The contract automatically enforces:
- Only transaction parties can rate
- Each party can only rate once per transaction
- Transaction must be completed before rating
- Agent must be verified to receive ratings

## Frontend Integration

### Display Agent Card

```typescript
interface AgentInfo {
  agent: string;
  externalProfileHash: string;
  verified: boolean;
  registeredAt: number;
  verifiedAt?: number;
  totalRatings: number;
  totalScore: number;
  completedAgreements: number;
}

function AgentCard({ agentAddress }: { agentAddress: string }) {
  const agentInfo = useAgentInfo(agentAddress);
  
  if (!agentInfo) return <div>Agent not found</div>;
  
  const averageRating = agentInfo.totalRatings > 0 
    ? agentInfo.totalScore / agentInfo.totalRatings 
    : 0;
  
  return (
    <div className="agent-card">
      <h3>Agent Information</h3>
      <div>
        {agentInfo.verified ? (
          <span className="verified-badge">✓ Verified</span>
        ) : (
          <span className="unverified-badge">Not Verified</span>
        )}
      </div>
      <div>Rating: {averageRating.toFixed(1)} / 5.0 ({agentInfo.totalRatings} reviews)</div>
      <div>Completed Agreements: {agentInfo.completedAgreements}</div>
    </div>
  );
}
```

### Rating Form

```typescript
function RateAgentForm({ 
  agentAddress, 
  transactionId 
}: { 
  agentAddress: string; 
  transactionId: string;
}) {
  const [rating, setRating] = useState(5);
  
  const handleSubmit = async () => {
    try {
      await agentRegistry.rateAgent({
        rater: currentUserAddress,
        agent: agentAddress,
        score: rating,
        transactionId,
      });
      
      showSuccess("Agent rated successfully!");
    } catch (error) {
      showError("Failed to rate agent: " + error.message);
    }
  };
  
  return (
    <div>
      <h3>Rate Agent</h3>
      <StarRating value={rating} onChange={setRating} max={5} />
      <button onClick={handleSubmit}>Submit Rating</button>
    </div>
  );
}
```

## Error Handling

Common errors and how to handle them:

```rust
match agent_registry.rate_agent(&rater, &agent, &score, &txn_id) {
    Ok(_) => {
        log::info!("Agent rated successfully");
    }
    Err(AgentError::AgentNotVerified) => {
        // Agent hasn't been verified by admin yet
        log::error!("Cannot rate unverified agent");
    }
    Err(AgentError::TransactionNotCompleted) => {
        // Transaction must be completed first
        log::error!("Complete the transaction before rating");
    }
    Err(AgentError::NotTransactionParty) => {
        // Only transaction parties can rate
        log::error!("You must be part of the transaction to rate");
    }
    Err(AgentError::AlreadyRated) => {
        // Each party can only rate once
        log::error!("You have already rated this agent");
    }
    Err(AgentError::InvalidRatingScore) => {
        // Score must be 1-5
        log::error!("Rating must be between 1 and 5");
    }
    Err(e) => {
        log::error!("Unexpected error: {:?}", e);
    }
}
```

## Admin Operations

### Agent Verification Workflow

```rust
// Admin dashboard: View pending agent registrations
let total_agents = agent_registry.get_agent_count();

// For each agent, check verification status
for agent_addr in pending_agents {
    let info = agent_registry.get_agent_info(&agent_addr);
    
    if let Some(agent_info) = info {
        if !agent_info.verified {
            // Admin can verify after reviewing external profile
            // Fetch and verify external profile from IPFS
            let profile = fetch_ipfs(&agent_info.external_profile_hash);
            
            // After manual verification
            agent_registry.verify_agent(&admin_address, &agent_addr)?;
        }
    }
}
```

## Testing Integration

When testing the integration:

```rust
#[test]
fn test_complete_agent_flow() {
    let env = Env::default();
    let agent_registry = create_agent_registry(&env);
    let rent_contract = create_rent_contract(&env);
    
    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    
    env.mock_all_auths();
    
    // Setup
    agent_registry.initialize(&admin);
    agent_registry.register_agent(&agent, &"profile_hash");
    agent_registry.verify_agent(&admin, &agent);
    
    // Create rent agreement with verified agent
    let agreement_id = rent_contract.create_agreement(
        &tenant,
        &landlord,
        &Some(agent.clone()),
        // ... other params
    ).unwrap();
    
    // Register transaction
    let parties = vec![&env, tenant.clone(), landlord.clone()];
    agent_registry.register_transaction(&agreement_id, &agent, &parties).unwrap();
    
    // Complete transaction
    rent_contract.complete_agreement(&agreement_id).unwrap();
    agent_registry.complete_transaction(&agreement_id, &agent).unwrap();
    
    // Rate agent
    agent_registry.rate_agent(&tenant, &agent, &5, &agreement_id).unwrap();
    agent_registry.rate_agent(&landlord, &agent, &4, &agreement_id).unwrap();
    
    // Verify reputation
    let info = agent_registry.get_agent_info(&agent).unwrap();
    assert_eq!(info.average_rating(), 4);
    assert_eq!(info.completed_agreements, 1);
}
```

## Deployment

1. Deploy the Agent Registry Contract
2. Initialize with admin address
3. Update rent agreement contract to reference agent registry contract ID
4. Deploy updated frontend with agent verification UI

## Contract Addresses

After deployment, update your environment configuration:

```env
AGENT_REGISTRY_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

And use in your contracts:

```rust
const AGENT_REGISTRY_ID: Address = Address::from_string(
    &String::from_str(&env, env!("AGENT_REGISTRY_CONTRACT_ID"))
);
```
