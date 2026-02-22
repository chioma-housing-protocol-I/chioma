# User Profile Smart Contract

Soroban smart contract for managing minimal on-chain user profiles on Stellar blockchain.

## Overview

This contract implements a gas-optimized profile storage system that stores only essential identity data on-chain while maintaining data integrity through cryptographic hashes.

## Features

- **Minimal Storage**: Only 78 bytes per profile on-chain
- **Data Integrity**: SHA-256 hash verification
- **Access Control**: Owner-only updates, admin verification
- **Account Types**: Support for Tenant, Landlord, and Agent roles
- **Verification System**: Admin-controlled KYC verification

## Contract Structure

```rust
pub struct UserProfile {
    pub owner: Address,           // 32 bytes
    pub version: u32,              // 4 bytes
    pub account_type: AccountType, // 1 byte
    pub last_updated: u64,         // 8 bytes
    pub data_hash: Bytes,          // 32 bytes
    pub is_verified: bool,         // 1 byte
}
```

## Methods

### init_profiles(admin: Address)
Initialize the contract with an admin address. Can only be called once.

### create_profile(owner: Address, account_type: AccountType, data_hash: Bytes) -> UserProfile
Create a new profile. Requires owner signature.

### update_profile(owner: Address, account_type: Option<AccountType>, data_hash: Option<Bytes>) -> UserProfile
Update existing profile. Only provided fields are updated. Requires owner signature.

### get_profile(owner: Address) -> Option<UserProfile>
Retrieve a profile. Public read access.

### has_profile(owner: Address) -> bool
Check if a profile exists. Public read access.

### verify_profile(admin: Address, owner: Address) -> UserProfile
Mark a profile as verified. Requires admin signature.

### get_admin() -> Address
Get the contract admin address.

## Building

```bash
# Install Rust and Soroban CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install --locked soroban-cli

# Add WASM target
rustup target add wasm32-unknown-unknown

# Build the contract
./build.sh
```

## Testing

```bash
# Run unit tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_create_and_get_profile
```

## Deployment

### Testnet

```bash
# Set admin secret key
export STELLAR_ADMIN_SECRET="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Deploy to testnet
./deploy.sh testnet
```

### Mainnet

```bash
# Deploy to mainnet (use with caution!)
./deploy.sh mainnet
```

## Gas Costs

Estimated gas costs on Stellar testnet:

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| init_profiles | ~30,000 | One-time initialization |
| create_profile | ~50,000 | Initial storage allocation |
| update_profile (single field) | ~20,000 | Modify existing data |
| update_profile (both fields) | ~25,000 | Multiple updates |
| get_profile | ~5,000 | Read operation |
| has_profile | ~3,000 | Existence check |
| verify_profile | ~15,000 | Admin operation |

## Security

### Authorization
- Profile creation/updates require owner signature
- Verification requires admin signature
- Read operations are public

### Data Validation
- Profile uniqueness enforced
- Account type enum validation
- Data hash format validation (32 bytes)

### Best Practices
- Always verify data hash matches off-chain data
- Use HTTPS for off-chain data retrieval
- Implement rate limiting on backend
- Monitor for unusual activity

## Integration Example

```typescript
import { ProfileContractService } from './profile.service';

// Create profile
const txHash = await profileContract.createProfile(
  userAddress,
  AccountType.Tenant,
  Buffer.from(dataHash, 'hex')
);

// Get profile
const profile = await profileContract.getProfile(userAddress);

// Update profile
const updateTxHash = await profileContract.updateProfile(
  userAddress,
  AccountType.Landlord,
  Buffer.from(newDataHash, 'hex')
);

// Verify profile (admin only)
const verifyTxHash = await profileContract.verifyProfile(
  adminAddress,
  userAddress
);
```

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
- Ensure admin account has enough XLM for deployment
- Testnet: Use friendbot to fund account
- Mainnet: Transfer XLM to admin account

**Error: Contract already initialized**
- Contract can only be initialized once
- Deploy a new contract instance if needed

### Runtime Errors

**Panic: Profile already exists**
- Check if profile exists before creating: `has_profile()`
- Use `update_profile()` to modify existing profiles

**Panic: Unauthorized**
- Ensure correct signer is used
- Verify admin address for verification operations

## Development

### Project Structure

```
contracts/
├── Cargo.toml           # Rust dependencies
├── lib.rs               # Module exports
├── user_profile.rs      # Main contract code
├── build.sh             # Build script
├── deploy.sh            # Deployment script
└── README.md            # This file
```

### Adding New Features

1. Update the contract code in `user_profile.rs`
2. Add tests for new functionality
3. Run `cargo test` to verify
4. Update documentation
5. Build and deploy to testnet for testing

## License

UNLICENSED - Private project

## Support

For issues or questions, contact the development team.
