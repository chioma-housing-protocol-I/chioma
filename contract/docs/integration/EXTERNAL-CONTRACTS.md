# External Contracts Integration Guide

**Status:** Completed  
**Category:** Documentation  
**Type:** Integration Guide  

## Overview

This guide explains how external smart contracts can integrate with Chioma's contracts for payment processing, property registry access, and escrow management.

## 1. Cross-Contract Communication

### 1.1 Contract Call Pattern

External contracts call Chioma contracts using the Stellar contract invocation protocol:

```rust
use soroban_sdk::{
    contract, contractimpl, Address, Env, Symbol, Val
};

#[contract]
pub struct ExternalContractClient;

#[contractimpl]
impl ExternalContractClient {
    pub fn call_chioma_payment(
        env: Env,
        chioma_payment_addr: Address,
        agreement_id: Symbol,
        amount: u128,
    ) -> Result<Val, Val> {
        let client = ChiomaPaymentClient::new(&env, &chioma_payment_addr);
        
        client.process_payment(
            &agreement_id,
            &amount,
        )
    }
}
```

### 1.2 Contract Client Generation

Generated client for Chioma Payment contract:

```rust
pub struct ChiomaPaymentClient {
    env: Env,
    address: Address,
}

impl ChiomaPaymentClient {
    pub fn new(env: &Env, address: &Address) -> Self {
        ChiomaPaymentClient {
            env: env.clone(),
            address: address.clone(),
        }
    }

    pub fn process_payment(
        &self,
        agreement_id: &Symbol,
        amount: &u128,
    ) -> Result<Val, Val> {
        self.env.invoke_contract(
            &self.address,
            &Symbol::short("process_payment"),
            (&agreement_id, &amount),
        )
    }

    pub fn query_balance(&self, account: &Address) -> Result<u128, Val> {
        let result = self.env.invoke_contract(
            &self.address,
            &Symbol::short("query_balance"),
            (&account,),
        )?;
        
        result.try_into()
    }
}
```

## 2. Payment Contract Integration

### 2.1 Calling Payment Processing

External contracts can invoke Chioma's payment contract:

```rust
pub fn execute_deferred_payment(
    env: Env,
    payment_contract: Address,
    agreement_id: Symbol,
    amount: u128,
    from: Address,
) -> Result<Symbol, u32> {
    let payment_client = ChiomaPaymentClient::new(&env, &payment_contract);

    // Process the payment
    let result = payment_client.process_payment(&agreement_id, &amount)
        .map_err(|_| 5001u32)?; // Custom error code

    // Emit event
    env.events().publish(
        (Symbol::short("deferred_payment_executed"),),
        (agreement_id, amount, from),
    );

    Ok(Symbol::short("success"))
}
```

### 2.2 Payment Verification

Verify payment status in external contracts:

```rust
pub fn verify_payment(
    env: Env,
    payment_contract: Address,
    agreement_id: Symbol,
) -> Result<PaymentStatus, u32> {
    let payment_client = ChiomaPaymentClient::new(&env, &payment_contract);

    // Read payment status from storage
    let status = env.storage()
        .persistent()
        .get::<_, u32>(
            &Symbol::short(&format!("payment:record:{}:status", 
                agreement_id.to_string()))
        )
        .map_err(|_| 404u32)?;

    match status {
        0 => Ok(PaymentStatus::Pending),
        1 => Ok(PaymentStatus::Paid),
        2 => Ok(PaymentStatus::Overdue),
        _ => Err(5002u32),
    }
}
```

## 3. Property Registry Integration

### 3.1 Property Verification

Query property information from external contracts:

```rust
pub fn verify_property_ownership(
    env: Env,
    property_registry: Address,
    property_id: Symbol,
    expected_owner: Address,
) -> Result<bool, u32> {
    let registry_client = PropertyRegistryClient::new(&env, &property_registry);

    // Read property owner
    let owner = env.storage()
        .persistent()
        .get::<_, Address>(
            &Symbol::short(&format!("property:registry:{}:owner", property_id))
        )
        .map_err(|_| 404u32)?;

    Ok(owner == expected_owner)
}

pub fn get_property_metadata(
    env: Env,
    property_registry: Address,
    property_id: Symbol,
) -> Result<PropertyMetadata, u32> {
    let metadata = env.storage()
        .persistent()
        .get::<_, Bytes>(
            &Symbol::short(&format!("property:metadata:{}:cid", property_id))
        )
        .map_err(|_| 404u32)?;

    // Return metadata CID for IPFS retrieval
    Ok(PropertyMetadata {
        ipfs_cid: metadata,
    })
}
```

## 4. Escrow Integration

### 4.1 Creating Cross-Contract Escrows

External contracts can create escrows:

```rust
pub fn create_cross_contract_escrow(
    env: Env,
    escrow_contract: Address,
    payer: Address,
    payee: Address,
    amount: u128,
    timeout_days: u32,
) -> Result<Symbol, u32> {
    let escrow_client = EscrowClient::new(&env, &escrow_contract);

    let escrow_id = Symbol::short(&generate_escrow_id(&env, &payer, &payee));

    escrow_client.create_escrow(
        &escrow_id,
        &payer,
        &payee,
        &amount,
        &timeout_days,
    )
    .map_err(|_| 5003u32)?;

    Ok(escrow_id)
}

fn generate_escrow_id(env: &Env, payer: &Address, payee: &Address) -> String {
    use sha2::{Sha256, Digest};
    
    let mut hasher = Sha256::new();
    hasher.update(payer.to_string().as_bytes());
    hasher.update(payee.to_string().as_bytes());
    hasher.update(env.ledger().sequence().to_string().as_bytes());
    
    format!("{:x}", hasher.finalize())
}
```

### 4.2 Escrow Release Control

Control escrow releases from external contracts:

```rust
pub fn conditional_escrow_release(
    env: Env,
    escrow_contract: Address,
    escrow_id: Symbol,
    condition_met: bool,
) -> Result<Symbol, u32> {
    if !condition_met {
        return Err(5004u32); // Condition not met
    }

    let escrow_client = EscrowClient::new(&env, &escrow_contract);

    escrow_client.release_escrow(&escrow_id)
        .map_err(|_| 5005u32)
}
```

## 5. Event Integration

### 5.1 Emitting Events

External contracts should emit events for integration:

```rust
pub fn emit_integration_event(
    env: Env,
    event_type: Symbol,
    data: (Address, Symbol, u128),
) {
    env.events().publish(
        (
            Symbol::short("integration_event"),
            event_type,
        ),
        data,
    );
}
```

### 5.2 Listening to Chioma Events

Backend systems monitor contract events:

```typescript
// services/contractEventService.ts
import * as StellarSdk from '@stellar/stellar-sdk';

export async function listenToContractEvents(
  contractId: string,
  eventType: string
): Promise<void> {
  const server = new StellarSdk.Horizon.Server(horizonUrl);

  server.operations()
    .forAccount(contractId)
    .stream({
      onmessage: (operation) => {
        if (operation.type === 'invoke_host_function') {
          handleContractEvent(operation, eventType);
        }
      }
    });
}

function handleContractEvent(operation: any, expectedType: string): void {
  const topics = operation.function_data?.topics || [];
  
  if (topics.some(t => t.includes(expectedType))) {
    console.log('Contract event detected:', operation);
  }
}
```

## 6. Authorization and Access Control

### 6.1 Inter-Contract Authorization

```rust
pub fn authorize_external_call(
    env: Env,
    caller: Address,
    permission: Symbol,
) -> Result<bool, u32> {
    // Check if caller has permission
    let has_permission = env.storage()
        .persistent()
        .get::<_, u32>(
            &Symbol::short(&format!("auth:{}:{}",
                caller.to_string(),
                permission.to_string()))
        )
        .unwrap_or(0);

    Ok(has_permission == 1)
}

pub fn grant_contract_permission(
    env: Env,
    admin: Address,
    target_contract: Address,
    permission: Symbol,
) -> Result<(), u32> {
    // Verify caller is admin
    let is_admin = check_admin(&env, &admin)?;
    if !is_admin {
        return Err(5006u32); // Unauthorized
    }

    // Grant permission
    env.storage()
        .persistent()
        .set(
            &Symbol::short(&format!("auth:{}:{}",
                target_contract.to_string(),
                permission.to_string())),
            &1u32,
        );

    Ok(())
}
```

## 7. Error Handling in External Contracts

### 7.1 Custom Error Codes

```rust
pub enum IntegrationError {
    PaymentFailed = 5001,
    PropertyNotFound = 5002,
    EscrowCreationFailed = 5003,
    ConditionNotMet = 5004,
    EscrowReleaseFailed = 5005,
    Unauthorized = 5006,
    InvalidInput = 5007,
    ContractCallFailed = 5008,
}

pub fn handle_integration_error(error: IntegrationError) -> u32 {
    error as u32
}
```

### 7.2 Recovery Strategies

```rust
pub fn retry_payment_with_backoff(
    env: Env,
    payment_contract: Address,
    agreement_id: Symbol,
    amount: u128,
    max_retries: u32,
) -> Result<Symbol, u32> {
    let mut retries = 0;

    loop {
        match call_payment_contract(&env, &payment_contract, &agreement_id, &amount) {
            Ok(result) => return Ok(result),
            Err(err) if retries < max_retries => {
                retries += 1;
                // Exponential backoff
                let delay = 2u32.pow(retries);
                sleep_ms(delay * 1000);
                continue;
            }
            Err(err) => return Err(err),
        }
    }
}
```

## 8. Integration Testing

### 8.1 Mock Chioma Contract

```typescript
// test/mocks/mockChiomaContract.ts
import { mockContractClient } from '@stellar/soroban-test-utils';

export const mockPaymentContract = mockContractClient({
  process_payment: async (agreementId, amount) => {
    return Symbol.short('payment_processed');
  },
  query_balance: async (account) => {
    return BigInt(1000000000); // 10 XLM in stroops
  }
});

export const mockEscrowContract = mockContractClient({
  create_escrow: async (id, payer, payee, amount, timeout) => {
    return id;
  },
  release_escrow: async (id) => {
    return Symbol.short('released');
  }
});
```

### 8.2 Integration Test Example

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Env};

    #[test]
    fn test_cross_contract_payment() {
        let env = Env::default();
        let contract_id = env.register_contract(None, Contract);

        let payment_contract = Address::generate(&env);
        let agreement_id = Symbol::short("agreement_123");
        let amount = 1000000u128;

        let result = execute_deferred_payment(
            env.clone(),
            payment_contract,
            agreement_id,
            amount,
            Address::generate(&env),
        );

        assert!(result.is_ok());
    }
}
```

## 9. Common Integration Patterns

### 9.1 Payment Pipeline Pattern

```rust
pub fn execute_payment_pipeline(
    env: Env,
    contracts: PaymentPipeline,
    agreement_id: Symbol,
    amount: u128,
) -> Result<(), u32> {
    // Step 1: Verify property
    verify_property_ownership(
        env.clone(),
        contracts.property_registry,
        &agreement_id,
        contracts.owner,
    )?;

    // Step 2: Create escrow
    let escrow_id = create_cross_contract_escrow(
        env.clone(),
        contracts.escrow,
        contracts.tenant,
        contracts.landlord,
        amount,
        30, // 30-day timeout
    )?;

    // Step 3: Process payment
    execute_deferred_payment(
        env,
        contracts.payment,
        agreement_id,
        amount,
        contracts.tenant,
    )?;

    // Step 4: Release escrow
    conditional_escrow_release(
        env,
        contracts.escrow,
        escrow_id,
        true,
    )?;

    Ok(())
}

struct PaymentPipeline {
    payment: Address,
    property_registry: Address,
    escrow: Address,
    tenant: Address,
    landlord: Address,
    owner: Address,
}
```

### 9.2 Event-Driven Pattern

```rust
pub fn listen_and_react(
    env: Env,
    event_type: Symbol,
) {
    env.events().subscribe(&Symbol::short("contract_event"), |event| {
        match event_type {
            Symbol::short("payment_completed") => {
                handle_payment_completion(&env);
            }
            Symbol::short("escrow_released") => {
                handle_escrow_release(&env);
            }
            _ => {}
        }
    });
}
```

## 10. Deployment and Configuration

### 10.1 Contract Configuration

```typescript
// config/contracts.ts
export const contractConfig = {
  payment: {
    id: process.env.CHIOMA_PAYMENT_CONTRACT_ID || '',
    network: 'testnet',
    timeout: 30000
  },
  property: {
    id: process.env.CHIOMA_PROPERTY_CONTRACT_ID || '',
    network: 'testnet',
    timeout: 30000
  },
  escrow: {
    id: process.env.CHIOMA_ESCROW_CONTRACT_ID || '',
    network: 'testnet',
    timeout: 30000
  }
};
```

### 10.2 Contract Deployment

```bash
#!/bin/bash
# Deploy external contract with Chioma integration

CONTRACT_NAME="external_integration"
CHIOMA_PAYMENT=$(cat chioma_payment_id.txt)
CHIOMA_ESCROW=$(cat chioma_escrow_id.txt)

soroban contract deploy \
  --network testnet \
  --source-account funding-account \
  --wasm target/wasm32-unknown-unknown/release/${CONTRACT_NAME}.wasm \
  --init-fn initialize \
  --init-args payment=$CHIOMA_PAYMENT escrow=$CHIOMA_ESCROW
```

## Related Documentation

- [Backend Integration](./BACKEND-INTEGRATION.md)
- [Frontend Integration](./FRONTEND-INTEGRATION.md)
- [Stellar Integration](./STELLAR-INTEGRATION.md)
- [Storage Keys Reference](../reference/STORAGE-KEYS.md)
