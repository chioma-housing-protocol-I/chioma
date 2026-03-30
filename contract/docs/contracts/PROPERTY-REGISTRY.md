# Property Registry Contract Documentation

## Table of Contents

- [Contract Overview](#contract-overview)
- [Public Functions](#public-functions)
- [Storage Structure](#storage-structure)
- [Events](#events)
- [Error Codes](#error-codes)
- [Property Registration](#property-registration)
- [Property Updates](#property-updates)
- [Property Verification](#property-verification)
- [Usage Examples](#usage-examples)
- [Integration](#integration)

---

## Contract Overview

The **Property Registry** contract provides an on-chain property verification layer for the Chioma housing protocol. It enables landlords to register properties with metadata hashes and allows administrators to verify property authenticity before they can be used in rental agreements.

### Purpose

- Maintain a decentralized registry of rental properties on the Stellar blockchain
- Enable landlords to register properties with verifiable metadata
- Provide admin-controlled verification of property authenticity
- Support property queries for integration with other Chioma contracts (e.g., rental agreements, escrow)

### Key Features

| Feature | Description |
|---|---|
| **Property Registration** | Landlords register properties with unique IDs and metadata hashes |
| **Admin Verification** | Admin-only verification of registered properties |
| **Property Queries** | Query property details, existence, and total count |
| **Event Emission** | All state changes emit events for off-chain indexing |
| **Access Control** | Role-based authorization (admin, landlord) |

### Architecture

The contract follows a modular architecture with separation of concerns:

```
property_registry/
├── src/
│   ├── lib.rs        # Contract entry point and public API
│   ├── property.rs   # Core property management logic
│   ├── storage.rs    # Storage key definitions
│   ├── types.rs      # Data structures (PropertyDetails, ContractState)
│   ├── errors.rs     # Error codes
│   ├── events.rs     # Event definitions and emission helpers
│   └── tests.rs      # Comprehensive test suite
```

---

## Public Functions

### Administrative Functions

#### `initialize`

Initialize the contract with an admin address. Must be called once before any other operations.

```rust
pub fn initialize(env: Env, admin: Address) -> Result<(), PropertyError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `admin` | `Address` | Admin address for contract management |

**Returns:** `Result<(), PropertyError>`

**Errors:**
- `AlreadyInitialized` (1) — Contract is already initialized

**Example:**

```rust
let admin = Address::generate(&env);
client.initialize(&admin);
```

#### `get_state`

Retrieve the current contract state including the admin address.

```rust
pub fn get_state(env: Env) -> Option<ContractState>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |

**Returns:** `Option<ContractState>` — `None` if contract is not initialized

**Example:**

```rust
let state = client.get_state();
assert_eq!(state.unwrap().admin, admin);
```

---

### Property Management Functions

#### `register_property`

Register a new property on-chain. Only the landlord can register their own property.

```rust
pub fn register_property(
    env: Env,
    landlord: Address,
    property_id: String,
    metadata_hash: String,
) -> Result<(), PropertyError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `landlord` | `Address` | Landlord's Stellar address (requires auth) |
| `property_id` | `String` | Unique property identifier |
| `metadata_hash` | `String` | Hash of off-chain property metadata |

**Returns:** `Result<(), PropertyError>`

**Errors:**
- `NotInitialized` (2) — Contract not initialized
- `InvalidPropertyId` (7) — Empty property ID
- `InvalidMetadata` (8) — Empty metadata hash
- `PropertyAlreadyExists` (3) — Property ID already registered

**Authorization:** Requires `landlord.require_auth()`

**Example:**

```rust
let landlord = Address::generate(&env);
client.register_property(
    &landlord,
    &String::from_str(&env, "PROP-001"),
    &String::from_str(&env, "QmHash123abc"),
);
```

#### `verify_property`

Verify a registered property. Only the admin can verify properties.

```rust
pub fn verify_property(
    env: Env,
    admin: Address,
    property_id: String,
) -> Result<(), PropertyError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `admin` | `Address` | Admin address (requires auth) |
| `property_id` | `String` | Property ID to verify |

**Returns:** `Result<(), PropertyError>`

**Errors:**
- `NotInitialized` (2) — Contract not initialized
- `Unauthorized` (5) — Caller is not the admin
- `PropertyNotFound` (4) — Property does not exist
- `AlreadyVerified` (6) — Property already verified

**Authorization:** Requires `admin.require_auth()`

**Example:**

```rust
client.verify_property(
    &admin,
    &String::from_str(&env, "PROP-001"),
);
```

---

### Query Functions

#### `get_property`

Retrieve full details of a registered property.

```rust
pub fn get_property(env: Env, property_id: String) -> Option<PropertyDetails>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `property_id` | `String` | Property ID to look up |

**Returns:** `Option<PropertyDetails>` — `None` if property does not exist

**Example:**

```rust
let property = client.get_property(&String::from_str(&env, "PROP-001"));
if let Some(details) = property {
    assert_eq!(details.verified, true);
}
```

#### `has_property`

Check if a property exists in the registry.

```rust
pub fn has_property(env: Env, property_id: String) -> bool
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `property_id` | `String` | Property ID to check |

**Returns:** `bool` — `true` if property exists

**Example:**

```rust
let exists = client.has_property(&String::from_str(&env, "PROP-001"));
assert!(exists);
```

#### `get_property_count`

Get the total number of registered properties.

```rust
pub fn get_property_count(env: Env) -> u32
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |

**Returns:** `u32` — Total property count

**Example:**

```rust
let count = client.get_property_count();
assert_eq!(count, 3);
```

---

## Storage Structure

The contract uses Soroban's persistent storage with the following key structure:

### Storage Keys

```rust
#[contracttype]
pub enum DataKey {
    /// Contract state (admin address)
    State,
    /// Initialization flag
    Initialized,
    /// Property details by ID: DataKey::Property(property_id)
    Property(String),
    /// Total registered property count
    PropertyCount,
}
```

### Storage Layout

| Key | Storage Type | Value Type | Description |
|---|---|---|---|
| `DataKey::State` | Persistent | `ContractState` | Admin address and contract state |
| `DataKey::Initialized` | Persistent | `bool` | Whether contract has been initialized |
| `DataKey::Property(id)` | Persistent | `PropertyDetails` | Property details keyed by property ID |
| `DataKey::PropertyCount` | Persistent | `u32` | Running count of registered properties |

### Data Structures

#### `ContractState`

```rust
#[contracttype]
pub struct ContractState {
    /// Administrator address with verification privileges
    pub admin: Address,
}
```

#### `PropertyDetails`

```rust
#[contracttype]
pub struct PropertyDetails {
    /// Landlord who registered the property
    pub landlord: Address,
    /// Unique property identifier
    pub property_id: String,
    /// Hash of off-chain property metadata (e.g., IPFS hash)
    pub metadata_hash: String,
    /// Whether the property has been verified by admin
    pub verified: bool,
    /// Timestamp when the property was registered
    pub registered_at: u64,
    /// Timestamp when the property was verified (0 if not verified)
    pub verified_at: u64,
}
```

---

## Events

The contract emits events for all significant state changes, enabling off-chain indexing and monitoring.

### `ContractInitialized`

Emitted when the contract is initialized.

```rust
#[contractevent]
pub struct ContractInitialized {
    pub admin: Address,
}
```

**Topics:** `["contract_initialized"]`

**When:** Called during `initialize()`

### `PropertyRegistered`

Emitted when a new property is registered.

```rust
#[contractevent]
pub struct PropertyRegistered {
    pub landlord: Address,
    pub property_id: String,
}
```

**Topics:** `["property_registered"]`

**When:** Called during `register_property()`

### `PropertyVerified`

Emitted when a property is verified by admin.

```rust
#[contractevent]
pub struct PropertyVerified {
    pub property_id: String,
}
```

**Topics:** `["property_verified"]`

**When:** Called during `verify_property()`

### Listening for Events

```typescript
// Off-chain event listener example (JavaScript/Stellar SDK)
const events = await server.getEvents({
  startLedger: ledgerNumber,
  filters: [{
    type: "contract",
    contractIds: [propertyRegistryContractId],
    topics: [["property_registered"]]
  }]
});

for (const event of events.events) {
  console.log("New property registered:", event.value);
}
```

---

## Error Codes

| Code | Name | Description |
|---|---|---|
| 1 | `AlreadyInitialized` | Contract has already been initialized |
| 2 | `NotInitialized` | Contract has not been initialized yet |
| 3 | `PropertyAlreadyExists` | Property with this ID is already registered |
| 4 | `PropertyNotFound` | No property found with the given ID |
| 5 | `Unauthorized` | Caller is not authorized for this action |
| 6 | `AlreadyVerified` | Property has already been verified |
| 7 | `InvalidPropertyId` | Property ID is empty or invalid |
| 8 | `InvalidMetadata` | Metadata hash is empty or invalid |

### Error Handling Example

```rust
match client.try_register_property(&landlord, &property_id, &metadata_hash) {
    Ok(Ok(())) => {
        // Property registered successfully
    }
    Ok(Err(PropertyError::PropertyAlreadyExists)) => {
        // Property ID already taken, use a different ID
    }
    Ok(Err(PropertyError::InvalidPropertyId)) => {
        // Property ID is empty
    }
    Ok(Err(PropertyError::NotInitialized)) => {
        // Contract not initialized, call initialize() first
    }
    Err(e) => {
        // Invocation error
    }
    _ => {}
}
```

---

## Property Registration

### Registration Flow

```
┌──────────┐     ┌──────────────────┐     ┌─────────────┐
│ Landlord  │────▶│ register_property│────▶│  Storage     │
│           │     │                  │     │  (Pending)   │
└──────────┘     └──────────────────┘     └─────────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ PropertyRegistered│
                 │ Event Emitted     │
                 └──────────────────┘
```

### Step-by-Step Registration

1. **Prerequisites:**
   - Contract must be initialized (`initialize()` called)
   - Landlord must have a valid Stellar address

2. **Register the property:**

```rust
// Landlord registers a property with metadata hash
let property_id = String::from_str(&env, "PROP-LAGOS-001");
let metadata_hash = String::from_str(&env, "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG");

client.register_property(&landlord, &property_id, &metadata_hash);
```

3. **Verify registration:**

```rust
// Confirm the property exists
assert!(client.has_property(&property_id));

// Retrieve property details
let details = client.get_property(&property_id).unwrap();
assert_eq!(details.landlord, landlord);
assert_eq!(details.verified, false); // Not yet verified
assert!(details.registered_at > 0);
```

### Registering Multiple Properties

```rust
let properties = vec![
    ("PROP-001", "QmHash001"),
    ("PROP-002", "QmHash002"),
    ("PROP-003", "QmHash003"),
];

for (id, hash) in properties {
    client.register_property(
        &landlord,
        &String::from_str(&env, id),
        &String::from_str(&env, hash),
    );
}

assert_eq!(client.get_property_count(), 3);
```

---

## Property Updates

The current Property Registry contract does not support direct property updates (metadata changes) after registration. This is a design decision to maintain data integrity.

### Recommended Approach for Property Updates

To update property information:

1. **Off-chain metadata updates:** Update the off-chain metadata and compute a new hash
2. **Re-registration:** Register a new property entry with the updated metadata hash and a new property ID
3. **Verification:** Request admin verification for the new property entry

> **Note:** Future versions of the contract may include a `update_property_metadata()` function. See the [INTEGRATION.md](../../contracts/property_registry/INTEGRATION.md) file for optional extension patterns including property metadata updates.

---

## Property Verification

### Verification Flow

```
┌──────────┐     ┌──────────────────┐     ┌─────────────┐
│   Admin   │────▶│ verify_property  │────▶│  Storage     │
│           │     │                  │     │  (Verified)  │
└──────────┘     └──────────────────┘     └─────────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ PropertyVerified  │
                 │ Event Emitted     │
                 └──────────────────┘
```

### Step-by-Step Verification

1. **Admin verifies a registered property:**

```rust
// Only admin can verify properties
client.verify_property(&admin, &String::from_str(&env, "PROP-001"));
```

2. **Confirm verification:**

```rust
let details = client.get_property(&String::from_str(&env, "PROP-001")).unwrap();
assert_eq!(details.verified, true);
assert!(details.verified_at > 0);
```

### Verification Requirements

- Only the admin address (set during `initialize()`) can verify properties
- A property must be registered before it can be verified
- A property can only be verified once (calling again returns `AlreadyVerified`)
- Verification is permanent and cannot be revoked in the current contract version

---

## Usage Examples

### Complete Registration and Verification Flow

```rust
use soroban_sdk::{testutils::Address as _, Address, Env, String};

// Setup
let env = Env::default();
env.mock_all_auths();
let contract_id = env.register(PropertyRegistryContract, ());
let client = PropertyRegistryContractClient::new(&env, &contract_id);

let admin = Address::generate(&env);
let landlord = Address::generate(&env);

// 1. Initialize the contract
client.initialize(&admin);

// 2. Register a property
let property_id = String::from_str(&env, "PROP-LAGOS-001");
let metadata_hash = String::from_str(&env, "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG");
client.register_property(&landlord, &property_id, &metadata_hash);

// 3. Query the property (unverified)
let details = client.get_property(&property_id).unwrap();
assert_eq!(details.landlord, landlord);
assert_eq!(details.verified, false);

// 4. Admin verifies the property
client.verify_property(&admin, &property_id);

// 5. Query the property (verified)
let verified_details = client.get_property(&property_id).unwrap();
assert_eq!(verified_details.verified, true);

// 6. Check counts
assert_eq!(client.get_property_count(), 1);
```

### Querying Properties

```rust
// Check if a property exists before proceeding
if client.has_property(&property_id) {
    let details = client.get_property(&property_id).unwrap();

    if details.verified {
        // Property is verified, safe to use in rental agreements
        println!("Property {} is verified", property_id);
    } else {
        // Property exists but not yet verified
        println!("Property {} is pending verification", property_id);
    }
} else {
    // Property not registered
    println!("Property {} not found in registry", property_id);
}
```

### Error Handling

```rust
// Attempting to register a duplicate property
let result = client.try_register_property(
    &landlord,
    &String::from_str(&env, "PROP-001"), // Already exists
    &String::from_str(&env, "QmNewHash"),
);
assert!(result.is_err()); // Returns PropertyAlreadyExists

// Attempting to verify with non-admin address
let non_admin = Address::generate(&env);
let result = client.try_verify_property(
    &non_admin,
    &String::from_str(&env, "PROP-001"),
);
assert!(result.is_err()); // Returns Unauthorized
```

---

## Integration

### Integration with Rental Agreement Contract

The Property Registry is designed to be used as a verification layer before creating rental agreements.

```rust
// In the rental agreement contract, verify property before creating agreement
fn create_rental_agreement(
    env: Env,
    property_registry: Address,
    property_id: String,
    landlord: Address,
    tenant: Address,
) -> Result<(), RentalError> {
    // Cross-contract call to verify property exists and is verified
    let registry_client = PropertyRegistryContractClient::new(&env, &property_registry);

    let property = registry_client
        .get_property(&property_id)
        .ok_or(RentalError::PropertyNotFound)?;

    // Ensure property is verified
    if !property.verified {
        return Err(RentalError::PropertyNotVerified);
    }

    // Ensure the landlord owns the property
    if property.landlord != landlord {
        return Err(RentalError::NotPropertyOwner);
    }

    // Proceed with rental agreement creation...
    Ok(())
}
```

### Integration with Escrow Contract

```rust
// Verify property before creating escrow for security deposit
fn create_property_escrow(
    env: Env,
    property_registry: Address,
    property_id: String,
    escrow_contract: Address,
    tenant: Address,
    landlord: Address,
    deposit_amount: i128,
    token: Address,
) -> Result<BytesN<32>, Error> {
    // Verify property is registered and verified
    let registry_client = PropertyRegistryContractClient::new(&env, &property_registry);
    let property = registry_client
        .get_property(&property_id)
        .ok_or(Error::PropertyNotFound)?;

    if !property.verified {
        return Err(Error::PropertyNotVerified);
    }

    // Create escrow for the verified property
    let escrow_client = EscrowContractClient::new(&env, &escrow_contract);
    let escrow_id = escrow_client.create(
        &tenant,
        &landlord,
        &admin,
        &deposit_amount,
        &token,
    )?;

    Ok(escrow_id)
}
```

### Integration Checklist

- [ ] Verify property exists using `has_property()` before referencing
- [ ] Check verification status using `get_property().verified` before creating agreements
- [ ] Validate landlord ownership using `get_property().landlord` matches expected address
- [ ] Listen for `PropertyRegistered` and `PropertyVerified` events for off-chain updates
- [ ] Handle all potential error codes when calling registry functions

---

## Related Documentation

- [Contract Architecture Overview](../architecture/DESIGN-PATTERNS.md) — Design patterns used across contracts
- [Stellar Integration Guide](../integration/STELLAR-INTEGRATION.md) — How to integrate with Stellar SDK
- [Emergency Procedures](../security/EMERGENCY-PROCEDURES.md) — Emergency pause and recovery procedures
- [User Profile Contract](./USER-PROFILE.md) — User profile management
- [Agent Registry Contract](./AGENT-REGISTRY.md) — Agent registration and reputation
