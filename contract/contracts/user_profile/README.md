# User Profile Smart Contract

Minimal, gas-optimized Stellar Soroban smart contract for managing user profiles with SEP-29 compliance.

## Overview

This contract stores minimal essential data on-chain (~100 bytes per profile) while maintaining references to complete off-chain profile data through cryptographic hashes.

## Features

- Minimal on-chain storage for gas efficiency
- SEP-29 compliant
- Owner-only updates with signature verification
- Admin verification system for KYC
- Support for Landlord, Tenant, and Agent account types
- Data integrity through SHA-256/IPFS hash verification

## Data Structure

```rust
pub struct UserProfile {
    pub account_id: Address,      // Stellar public key
    pub version: String,           // Data structure version
    pub account_type: AccountType, // Landlord/Tenant/Agent
    pub last_updated: u64,         // Unix timestamp
    pub data_hash: Bytes,          // SHA-256 or IPFS CID
    pub is_verified: bool,         // KYC status
}
```

## Contract Methods

- `initialize(admin: Address)` - Initialize contract with admin
- `create_profile(account_id, account_type, data_hash)` - Create new profile
- `update_profile(account_id, account_type?, data_hash?)` - Update existing profile
- `get_profile(account_id)` - Retrieve profile
- `has_profile(account_id)` - Check if profile exists
- `verify_profile(admin, account_id)` - Mark profile as verified (admin only)
- `unverify_profile(admin, account_id)` - Remove verification (admin only)
- `delete_profile(account_id)` - Delete profile
- `get_admin()` - Get admin address

## Testing

```bash
# Run tests from workspace root
cd contract
cargo test -p user-profile

# Run with output
cargo test -p user-profile -- --nocapture
```

## Gas Costs

| Operation | Estimated Gas |
|-----------|--------------|
| initialize | ~30,000 |
| create_profile | ~50,000 |
| update_profile | ~20,000-25,000 |
| get_profile | ~5,000 |
| verify_profile | ~15,000 |
| delete_profile | ~10,000 |

## Security

- Profile creation/updates require owner signature
- Verification requires admin signature
- Read operations are public
- Data hash validation (32 or 46 bytes)
- Profile uniqueness enforced

## Integration

See [SPECIFICATION.md](../../SPECIFICATION.md) and [QUICKSTART.md](../../QUICKSTART.md) for detailed integration examples.
