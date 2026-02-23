# Integration Guide: Property Registry with Rental Contract

This guide demonstrates how to integrate the Property Registry Contract with the Chioma Rental Contract to ensure rental agreements are tied to verified properties.

## Overview

The Property Registry Contract provides an on-chain verification layer for properties. Before creating a rental agreement, the Chioma contract can query the registry to ensure:

1. The property exists in the registry
2. The property has been verified by an admin
3. The property belongs to the claimed landlord

## Integration Steps

### 1. Add Property Registry Client Dependency

In the Chioma contract's `Cargo.toml`, add the property registry as a dependency (if building as separate contracts):

```toml
[dependencies]
property_registry = { path = "../property_registry" }
```

Or, if deploying as separate contracts, use the Soroban SDK's contract client generation.

### 2. Update Rental Contract Errors

Add property-related errors to `contracts/chioma/src/errors.rs`:

```rust
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RentalError {
    // ... existing errors ...
    PropertyNotFound = 17,
    PropertyNotVerified = 18,
    PropertyOwnerMismatch = 19,
}
```

### 3. Store Property Registry Address in Contract State

Update `contracts/chioma/src/types.rs` to include the property registry address:

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractState {
    pub admin: Address,
    pub config: Config,
    pub initialized: bool,
    pub property_registry: Option<Address>, // Add this field
}
```

### 4. Add Method to Set Property Registry Address

In `contracts/chioma/src/lib.rs`, add a method to configure the property registry:

```rust
/// Set the property registry contract address.
///
/// # Errors
/// * `InvalidState` - If contract state is missing
pub fn set_property_registry(
    env: Env,
    property_registry: Address,
) -> Result<(), RentalError> {
    let mut state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
    
    state.admin.require_auth();
    
    state.property_registry = Some(property_registry);
    
    env.storage().instance().set(&DataKey::State, &state);
    env.storage().instance().extend_ttl(500000, 500000);
    
    Ok(())
}
```

### 5. Update Create Agreement to Verify Property

Modify the `create_agreement` function in `contracts/chioma/src/agreement.rs`:

```rust
use property_registry::{PropertyRegistryContractClient, PropertyDetails};

pub fn create_agreement(
    env: &Env,
    agreement_id: String,
    landlord: Address,
    tenant: Address,
    agent: Option<Address>,
    monthly_rent: i128,
    security_deposit: i128,
    start_date: u64,
    end_date: u64,
    agent_commission_rate: u32,
    payment_token: Address,
    property_id: String, // Add this parameter
) -> Result<(), RentalError> {
    let state = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(RentalError::InvalidState)?;

    // Verify property if registry is configured
    if let Some(registry_addr) = state.property_registry {
        let registry_client = PropertyRegistryContractClient::new(env, &registry_addr);
        
        // Check if property exists
        let property = registry_client
            .get_property(&property_id)
            .ok_or(RentalError::PropertyNotFound)?;
        
        // Verify property is verified
        if !property.verified {
            return Err(RentalError::PropertyNotVerified);
        }
        
        // Verify landlord owns the property
        if property.landlord != landlord {
            return Err(RentalError::PropertyOwnerMismatch);
        }
    }

    // ... rest of the existing create_agreement logic ...
}
```

### 6. Update RentAgreement Struct

Add the property_id field to the RentAgreement struct in `contracts/chioma/src/types.rs`:

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RentAgreement {
    pub agreement_id: String,
    pub property_id: String, // Add this field
    pub landlord: Address,
    pub tenant: Address,
    // ... rest of fields ...
}
```

## Complete Usage Example

### Step 1: Deploy and Initialize Contracts

```rust
use soroban_sdk::{Env, String};

let env = Env::default();

// Deploy property registry
let property_registry = PropertyRegistryContractClient::new(&env, &property_registry_id);
property_registry.initialize(&admin);

// Deploy rental contract
let rental_contract = ChiomaContractClient::new(&env, &rental_contract_id);
rental_contract.initialize(&admin, &config);

// Configure rental contract to use property registry
rental_contract.set_property_registry(&property_registry_id);
```

### Step 2: Register and Verify Property

```rust
// Landlord registers property
property_registry.register_property(
    &landlord,
    &String::from_str(&env, "PROP-001"),
    &String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco")
);

// Admin verifies property
property_registry.verify_property(
    &admin,
    &String::from_str(&env, "PROP-001")
);
```

### Step 3: Create Rental Agreement

```rust
// Create rental agreement - now with property verification
rental_contract.create_agreement(
    &String::from_str(&env, "AGREEMENT-001"),
    &landlord,
    &tenant,
    &None, // no agent
    &1000_0000000, // monthly rent
    &2000_0000000, // security deposit
    &start_date,
    &end_date,
    &0, // agent commission
    &token_address,
    &String::from_str(&env, "PROP-001") // verified property ID
);
```

## Benefits of Integration

1. **Trust & Verification**: Tenants can verify that the property they're renting is registered and verified on-chain
2. **Fraud Prevention**: Prevents unauthorized individuals from creating rental agreements for properties they don't own
3. **Immutable Record**: Property ownership and verification status is permanently recorded on-chain
4. **Metadata Reference**: Property details (photos, descriptions, etc.) can be referenced via IPFS hashes
5. **Audit Trail**: All property registrations and verifications emit events for tracking

## Testing Integration

Create integration tests that verify the interaction between both contracts:

```rust
#[test]
fn test_create_agreement_with_verified_property() {
    let env = Env::default();
    env.mock_all_auths();
    
    // Setup contracts
    let property_registry = create_property_registry(&env);
    let rental_contract = create_rental_contract(&env);
    
    property_registry.initialize(&admin);
    rental_contract.initialize(&admin, &config);
    rental_contract.set_property_registry(&property_registry_id);
    
    // Register and verify property
    let property_id = String::from_str(&env, "PROP-001");
    property_registry.register_property(&landlord, &property_id, &metadata_hash);
    property_registry.verify_property(&admin, &property_id);
    
    // Create agreement should succeed
    let result = rental_contract.try_create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &monthly_rent,
        &security_deposit,
        &start_date,
        &end_date,
        &0,
        &token_address,
        &property_id,
    );
    
    assert!(result.is_ok());
}

#[test]
#[should_panic(expected = "Error(Contract, #18)")] // PropertyNotVerified
fn test_create_agreement_fails_with_unverified_property() {
    let env = Env::default();
    env.mock_all_auths();
    
    // Setup contracts
    let property_registry = create_property_registry(&env);
    let rental_contract = create_rental_contract(&env);
    
    property_registry.initialize(&admin);
    rental_contract.initialize(&admin, &config);
    rental_contract.set_property_registry(&property_registry_id);
    
    // Register property but DON'T verify it
    let property_id = String::from_str(&env, "PROP-001");
    property_registry.register_property(&landlord, &property_id, &metadata_hash);
    
    // Create agreement should fail - property not verified
    rental_contract.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &monthly_rent,
        &security_deposit,
        &start_date,
        &end_date,
        &0,
        &token_address,
        &property_id,
    );
}
```

## Optional Features

### Property Transfer

Add functionality to transfer property ownership:

```rust
/// Transfer property ownership to a new landlord
pub fn transfer_property(
    env: Env,
    current_landlord: Address,
    new_landlord: Address,
    property_id: String,
) -> Result<(), PropertyError> {
    current_landlord.require_auth();
    
    let key = DataKey::Property(property_id.clone());
    let mut property: PropertyDetails = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(PropertyError::PropertyNotFound)?;
    
    if property.landlord != current_landlord {
        return Err(PropertyError::Unauthorized);
    }
    
    property.landlord = new_landlord.clone();
    
    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);
    
    events::property_transferred(&env, property_id, current_landlord, new_landlord);
    
    Ok(())
}
```

### Property Metadata Updates

Allow landlords to update property metadata (with re-verification requirement):

```rust
/// Update property metadata (requires re-verification)
pub fn update_property_metadata(
    env: Env,
    landlord: Address,
    property_id: String,
    new_metadata_hash: String,
) -> Result<(), PropertyError> {
    landlord.require_auth();
    
    if new_metadata_hash.is_empty() {
        return Err(PropertyError::InvalidMetadata);
    }
    
    let key = DataKey::Property(property_id.clone());
    let mut property: PropertyDetails = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(PropertyError::PropertyNotFound)?;
    
    if property.landlord != landlord {
        return Err(PropertyError::Unauthorized);
    }
    
    property.metadata_hash = new_metadata_hash.clone();
    property.verified = false; // Requires re-verification
    property.verified_at = None;
    
    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);
    
    events::property_metadata_updated(&env, property_id, landlord, new_metadata_hash);
    
    Ok(())
}
```

## Migration Strategy

For existing deployments:

1. Deploy the Property Registry Contract
2. Update the Rental Contract with new methods (backward compatible)
3. Set the property registry address in the rental contract
4. Property verification becomes mandatory for new agreements
5. Existing agreements continue to work without property verification

## Conclusion

This integration provides a robust foundation for property verification while maintaining flexibility for future enhancements. The modular design allows both contracts to be deployed and updated independently.
