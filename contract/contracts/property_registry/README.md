# Property Registry Contract

The Property Registry Contract is a Soroban smart contract for managing verified properties on the Stellar blockchain. It provides an on-chain verification layer for properties, ensuring that rental agreements reference legitimate, verified properties.

## Overview

This contract allows landlords to register their properties on-chain with associated metadata (stored via IPFS hashes), and enables administrators to verify the authenticity of registered properties. This creates an immutable record of property ownership and verification status.

## Features

- **Property Registration**: Landlords can register properties with unique IDs and metadata
- **Admin Verification**: Designated administrators can verify registered properties
- **Property Queries**: Anyone can query property details and verification status
- **Event Emission**: All major actions emit events for off-chain tracking
- **Access Control**: Proper authentication and authorization checks

## Contract Methods

### Administrative Methods

#### `initialize(env: Env, admin: Address) -> Result<(), PropertyError>`

Initialize the contract with an admin address who will have privileges to verify properties.

**Arguments:**
- `admin`: The address that will have admin privileges

**Errors:**
- `AlreadyInitialized` - If the contract has already been initialized

**Example:**
```rust
contract.initialize(&admin);
```

#### `get_state(env: Env) -> Option<ContractState>`

Get the current contract state including the admin address.

**Returns:**
- `Option<ContractState>` - The contract state if initialized

---

### Property Management Methods

#### `register_property(env: Env, landlord: Address, property_id: String, metadata_hash: String) -> Result<(), PropertyError>`

Register a new property on-chain. The landlord must authorize this transaction.

**Arguments:**
- `landlord`: The address of the property owner
- `property_id`: A unique identifier for the property (e.g., "PROP-001")
- `metadata_hash`: IPFS hash or other reference to property metadata (e.g., "QmXoy...")

**Errors:**
- `NotInitialized` - If the contract hasn't been initialized
- `PropertyAlreadyExists` - If a property with this ID already exists
- `InvalidPropertyId` - If the property ID is empty
- `InvalidMetadata` - If the metadata hash is empty

**Example:**
```rust
contract.register_property(
    &landlord,
    &String::from_str(&env, "PROP-001"),
    &String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco")
);
```

#### `verify_property(env: Env, admin: Address, property_id: String) -> Result<(), PropertyError>`

Verify a registered property. Only the admin can perform this action.

**Arguments:**
- `admin`: The admin address performing the verification
- `property_id`: The ID of the property to verify

**Errors:**
- `NotInitialized` - If the contract hasn't been initialized
- `Unauthorized` - If the caller is not the admin
- `PropertyNotFound` - If the property doesn't exist
- `AlreadyVerified` - If the property is already verified

**Example:**
```rust
contract.verify_property(&admin, &String::from_str(&env, "PROP-001"));
```

---

### Query Methods

#### `get_property(env: Env, property_id: String) -> Option<PropertyDetails>`

Get details of a registered property.

**Arguments:**
- `property_id`: The ID of the property to retrieve

**Returns:**
- `Option<PropertyDetails>` - The property details if it exists

**PropertyDetails Structure:**
```rust
pub struct PropertyDetails {
    pub property_id: String,
    pub landlord: Address,
    pub metadata_hash: String,
    pub verified: bool,
    pub registered_at: u64,
    pub verified_at: Option<u64>,
}
```

**Example:**
```rust
if let Some(property) = contract.get_property(&String::from_str(&env, "PROP-001")) {
    assert!(property.verified);
}
```

#### `has_property(env: Env, property_id: String) -> bool`

Check if a property exists in the registry.

**Arguments:**
- `property_id`: The ID of the property to check

**Returns:**
- `bool` - True if the property exists

**Example:**
```rust
if contract.has_property(&String::from_str(&env, "PROP-001")) {
    // Property exists
}
```

#### `get_property_count(env: Env) -> u32`

Get the total count of registered properties.

**Returns:**
- `u32` - The total number of properties registered

**Example:**
```rust
let count = contract.get_property_count();
```

---

## Events

The contract emits the following events:

### ContractInitialized
Emitted when the contract is initialized.
- **Topics**: `["initialized", admin: Address]`

### PropertyRegistered
Emitted when a new property is registered.
- **Topics**: `["prop_reg", landlord: Address, property_id: String]`
- **Data**: `metadata_hash: String`

### PropertyVerified
Emitted when a property is verified.
- **Topics**: `["prop_ver", admin: Address, property_id: String]`

---

## Error Codes

| Error | Code | Description |
|-------|------|-------------|
| `AlreadyInitialized` | 1 | Contract has already been initialized |
| `NotInitialized` | 2 | Contract has not been initialized |
| `PropertyAlreadyExists` | 3 | Property with this ID already exists |
| `PropertyNotFound` | 4 | Property does not exist |
| `Unauthorized` | 5 | Caller is not authorized for this action |
| `AlreadyVerified` | 6 | Property is already verified |
| `InvalidPropertyId` | 7 | Property ID is empty or invalid |
| `InvalidMetadata` | 8 | Metadata hash is empty or invalid |

---

## Integration with Rental Contract

The Chioma rental contract can be updated to query this registry before creating rental agreements:

```rust
// In the rental contract
pub fn create_agreement(
    env: Env,
    property_id: String,
    // ... other parameters
) -> Result<(), RentalError> {
    // Query property registry
    let property_registry = PropertyRegistryClient::new(&env, &property_registry_addr);
    
    if let Some(property) = property_registry.get_property(&property_id) {
        if !property.verified {
            return Err(RentalError::PropertyNotVerified);
        }
        // Continue with agreement creation
    } else {
        return Err(RentalError::PropertyNotFound);
    }
}
```

---

## Building and Testing

### Build the contract
```bash
make build
# or
cargo build --package property_registry
```

### Run tests
```bash
make test
# or
cargo test --package property_registry
```

### Format code
```bash
make fmt
```

### Clean build artifacts
```bash
make clean
```

---

## Usage Example

```rust
use soroban_sdk::{Env, String};

let env = Env::default();
let contract = PropertyRegistryContractClient::new(&env, &contract_id);

// Initialize contract
contract.initialize(&admin);

// Landlord registers a property
contract.register_property(
    &landlord,
    &String::from_str(&env, "PROP-001"),
    &String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco")
);

// Admin verifies the property
contract.verify_property(&admin, &String::from_str(&env, "PROP-001"));

// Query property details
let property = contract.get_property(&String::from_str(&env, "PROP-001")).unwrap();
assert!(property.verified);
```

---

## Storage

The contract uses the following storage keys:

- `DataKey::State` - Contract state (admin, initialized status)
- `DataKey::Initialized` - Initialization flag
- `DataKey::Property(String)` - Individual property details
- `DataKey::PropertyCount` - Total count of registered properties

All persistent storage entries have a TTL of 500,000 ledgers.

---

## Security Considerations

1. **Authentication**: All state-changing methods require proper authentication via `require_auth()`
2. **Authorization**: Only the admin can verify properties
3. **Immutability**: Once a property is verified, its verification cannot be reversed
4. **Uniqueness**: Property IDs must be unique across the entire registry
5. **Validation**: Empty property IDs and metadata hashes are rejected

---

## License

This contract is part of the Chioma project.
