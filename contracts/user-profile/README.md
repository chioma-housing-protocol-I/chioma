# User Profile Smart Contract

A minimal, gas-optimized Stellar Soroban smart contract for managing user profiles with SEP-29 compliance.

## Overview

This contract implements on-chain user profile storage using Stellar's Soroban platform. It stores minimal essential data on-chain while maintaining references to complete off-chain profile data through cryptographic hashes.

## Features

- **Minimal On-Chain Storage**: Only essential data stored on-chain (~100 bytes per profile)
- **SEP-29 Compliant**: Follows Stellar's account memo requirements
- **Gas Optimized**: Efficient storage and operations
- **Access Control**: Owner-only updates, admin verification
- **Data Integrity**: Cryptographic hash verification for off-chain data
- **Account Types**: Support for Landlord, Tenant, and Agent roles

## Data Structure

### On-Chain Profile

```rust
pub struct UserProfile {
    pub account_id: Address,      // Stellar public key (32 bytes)
    pub version: String,           // Data structure version (8 bytes)
    pub account_type: AccountType, // User role (1 byte)
    pub last_updated: u64,         // Unix timestamp (8 bytes)
    pub data_hash: Bytes,          // SHA-256 or IPFS CID (32-46 bytes)
    pub is_verified: bool,         // KYC status (1 byte)
}
```

### Account Types

```rust
pub enum AccountType {
    Landlord = 1,  // Property owners
    Tenant = 2,    // Property renters
    Agent = 3,     // Real estate agents
}
```

## Contract Methods

### Administrative

#### `initialize(admin: Address)`
Initialize the contract with an admin address. Can only be called once.

**Parameters:**
- `admin`: Address with verification privileges

**Authorization:** Requires admin signature

**Example:**
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source $ADMIN_SECRET \
  --network testnet \
  -- initialize \
  --admin $ADMIN_ADDRESS
```

#### `get_admin() -> Address`
Get the contract admin address.

**Returns:** Admin address

**Authorization:** Public read

### Profile Management

#### `create_profile(account_id: Address, account_type: AccountType, data_hash: Bytes) -> UserProfile`
Create a new user profile.

**Parameters:**
- `account_id`: User's Stellar address
- `account_type`: Landlord (1), Tenant (2), or Agent (3)
- `data_hash`: SHA-256 hash (32 bytes) or IPFS CID (46 bytes)

**Returns:** Created profile

**Authorization:** Requires account owner signature

**Panics:**
- If profile already exists
- If data hash length is invalid

**Example:**
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source $USER_SECRET \
  --network testnet \
  -- create_profile \
  --account_id $USER_ADDRESS \
  --account_type '{"Tenant":[]}' \
  --data_hash $DATA_HASH
```

#### `update_profile(account_id: Address, account_type: Option<AccountType>, data_hash: Option<Bytes>) -> UserProfile`
Update an existing profile. Only provided fields are updated.

**Parameters:**
- `account_id`: User's Stellar address
- `account_type`: Optional new account type
- `data_hash`: Optional new data hash

**Returns:** Updated profile

**Authorization:** Requires account owner signature

**Panics:**
- If profile doesn't exist
- If data hash length is invalid

**Example:**
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source $USER_SECRET \
  --network testnet \
  -- update_profile \
  --account_id $USER_ADDRESS \
  --account_type '{"Landlord":[]}' \
  --data_hash $NEW_HASH
```

#### `get_profile(account_id: Address) -> Option<UserProfile>`
Retrieve a user profile.

**Parameters:**
- `account_id`: User's Stellar address

**Returns:** `Some(UserProfile)` if exists, `None` otherwise

**Authorization:** Public read

**Example:**
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- get_profile \
  --account_id $USER_ADDRESS
```

#### `has_profile(account_id: Address) -> bool`
Check if a profile exists.

**Parameters:**
- `account_id`: User's Stellar address

**Returns:** `true` if profile exists, `false` otherwise

**Authorization:** Public read

#### `delete_profile(account_id: Address)`
Delete a user profile.

**Parameters:**
- `account_id`: User's Stellar address

**Authorization:** Requires account owner signature

**Panics:** If profile doesn't exist

### Verification

#### `verify_profile(admin: Address, account_id: Address) -> UserProfile`
Mark a profile as verified (KYC completed).

**Parameters:**
- `admin`: Admin address
- `account_id`: User's Stellar address

**Returns:** Updated profile with `is_verified = true`

**Authorization:** Requires admin signature

**Panics:**
- If caller is not admin
- If profile doesn't exist

#### `unverify_profile(admin: Address, account_id: Address) -> UserProfile`
Remove verification status from a profile.

**Parameters:**
- `admin`: Admin address
- `account_id`: User's Stellar address

**Returns:** Updated profile with `is_verified = false`

**Authorization:** Requires admin signature

## Installation

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban CLI
cargo install --locked soroban-cli

# Add WASM target
rustup target add wasm32-unknown-unknown
```

### Build

```bash
# Make scripts executable
chmod +x build.sh deploy.sh test.sh

# Build the contract
./build.sh
```

### Test

```bash
# Run all tests
./test.sh

# Or use cargo directly
cargo test

# Run specific test
cargo test test_create_profile -- --nocapture
```

## Deployment

### Testnet

```bash
# Set admin secret key
export STELLAR_ADMIN_SECRET="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Deploy and initialize
./deploy.sh testnet
```

### Mainnet

```bash
# Deploy to mainnet (use with caution!)
./deploy.sh mainnet
```

## Gas Costs

Estimated gas costs on Stellar testnet:

| Operation | Estimated Gas | Notes |
|-----------|--------------|-------|
| initialize | ~30,000 | One-time setup |
| create_profile | ~50,000 | Initial storage allocation |
| update_profile (single field) | ~20,000 | Modify one field |
| update_profile (both fields) | ~25,000 | Modify multiple fields |
| get_profile | ~5,000 | Read operation |
| has_profile | ~3,000 | Existence check |
| verify_profile | ~15,000 | Admin operation |
| delete_profile | ~10,000 | Remove storage |

## Storage Strategy

### On-Chain (Soroban Contract)
- Minimal identity data
- Data integrity hash
- Account type and verification status
- ~100 bytes per profile

### Off-Chain (IPFS/Database)
- Complete profile data (name, email, bio, etc.)
- Media files (avatars, documents)
- Queryable metadata
- Cost-effective storage

### Data Integrity Flow

```
1. User submits complete profile data
2. Backend computes SHA-256 hash
3. Backend uploads data to IPFS (optional)
4. Backend calls create_profile with hash
5. Contract stores minimal data + hash
6. To verify: recompute hash and compare with on-chain value
```

## Security Considerations

### Access Control
- Profile creation/updates require owner signature
- Verification requires admin signature
- Read operations are public
- Delete requires owner signature

### Data Validation
- Profile uniqueness enforced
- Account type enum validation
- Data hash length validation (32 or 46 bytes)
- Timestamp tracking for all changes

### Best Practices
1. Always verify data hash matches off-chain data
2. Use HTTPS for off-chain data retrieval
3. Implement rate limiting on backend
4. Monitor for unusual activity
5. Keep admin keys secure
6. Regular security audits

## Integration Example

### TypeScript/JavaScript

```typescript
import { Contract, SorobanRpc } from '@stellar/stellar-sdk';

// Initialize contract
const contract = new Contract(contractId);

// Create profile
const tx = await contract.call(
  'create_profile',
  accountId,
  { Tenant: [] },
  Buffer.from(dataHash, 'hex')
);

// Get profile
const profile = await contract.call('get_profile', accountId);

// Update profile
const updateTx = await contract.call(
  'update_profile',
  accountId,
  { Landlord: [] },
  Buffer.from(newHash, 'hex')
);
```

### Rust

```rust
use soroban_sdk::{Address, Bytes};

// Create profile
let profile = client.create_profile(
    &user_address,
    &AccountType::Tenant,
    &data_hash,
);

// Get profile
let profile = client.get_profile(&user_address);

// Update profile
let updated = client.update_profile(
    &user_address,
    &Some(AccountType::Landlord),
    &Some(new_hash),
);
```

## Testing

### Unit Tests

All contract methods have comprehensive unit tests:

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_create_profile

# Generate coverage report
cargo tarpaulin --out Html
```

### Test Coverage

- ✅ Contract initialization
- ✅ Profile creation
- ✅ Profile updates (full and partial)
- ✅ Profile retrieval
- ✅ Profile existence checks
- ✅ Profile verification/unverification
- ✅ Profile deletion
- ✅ Access control enforcement
- ✅ Data validation
- ✅ Error handling

## Troubleshooting

### Build Errors

**Error: `wasm32-unknown-unknown` target not found**
```bash
rustup target add wasm32-unknown-unknown
```

**Error: `soroban` command not found**
```bash
cargo install --locked soroban-cli
```

### Deployment Errors

**Error: Insufficient balance**
- Fund your account on testnet: https://laboratory.stellar.org/#account-creator
- Mainnet: Transfer XLM to admin account

**Error: Contract already initialized**
- Contract can only be initialized once
- Deploy a new instance if needed

### Runtime Errors

**Panic: Profile already exists**
- Use `has_profile()` to check before creating
- Use `update_profile()` to modify existing profiles

**Panic: Unauthorized**
- Ensure correct signer is used
- Verify admin address for admin operations

**Panic: Invalid data hash length**
- Use 32 bytes for SHA-256 hash
- Use 46 bytes for IPFS CID

## Project Structure

```
contracts/user-profile/
├── Cargo.toml              # Rust dependencies
├── src/
│   ├── lib.rs              # Module exports
│   ├── types.rs            # Data structures
│   ├── storage.rs          # Storage keys
│   └── profile.rs          # Contract implementation
├── build.sh                # Build script
├── deploy.sh               # Deployment script
├── test.sh                 # Test script
└── README.md               # This file
```

## Future Enhancements

1. **Profile Recovery**: Multi-sig recovery mechanism
2. **Profile Delegation**: Allow agents to manage profiles
3. **Profile History**: Track all changes on-chain
4. **Batch Operations**: Create/update multiple profiles
5. **Profile Search**: Off-chain indexing
6. **Reputation System**: On-chain reputation scores
7. **Profile Metadata**: Additional on-chain fields

## References

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Smart Contracts](https://soroban.stellar.org/)
- [SEP-29: Account Memo Requirements](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0029.md)
- [Soroban SDK](https://docs.rs/soroban-sdk/)

## License

UNLICENSED - Private project

## Support

For issues or questions, contact the development team.
