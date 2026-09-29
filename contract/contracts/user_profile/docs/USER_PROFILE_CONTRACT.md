# User Profile Smart Contract Documentation

The `UserProfileContract` is a Soroban-based smart contract for managing user profiles in a decentralized and SEP-29 compliant manner. It allows users to store minimal, gas-optimized profile data on-chain while referencing complete records off-chain via cryptographic hashes.

## Contract Overview

### Purpose

The contract serves as a decentralized identity and profile registry for the Chioma ecosystem. It maintains a mapping of Stellar addresses to profile metadata, including account types (Tenant, Landlord, Agent) and verification status.

### Key Features

- **SEP-29 Compliance**: Follows the Stellar Ecosystem Proposal for on-chain profiles.
- **Gas Optimized**: Stores only essential metadata (~100 bytes/profile) to minimize on-chain footprint.
- **Role-Based Profiles**: Supports distinct roles (Landlord, Tenant, Agent).
- **Admin Verification**: Features an administrative system for KYC and profile verification.
- **Data Integrity**: Uses SHA-256 or IPFS hashes to reference extensive off-chain data.

## Public Functions

### `initialize(env: Env, admin: Address) -> Result<(), ContractError>`

Sets up the contract with an admin address. Can only be called once.

- **Authorization**: `admin` must authorize.
- **Errors**: `AlreadyInitialized`

### `create_profile(env: Env, account_id: Address, account_type: AccountType, data_hash: Bytes) -> Result<UserProfile, ContractError>`

Mints a new profile for the caller.

- **Authorization**: `account_id` must authorize.
- **Errors**: `ProfileAlreadyExists`, `InvalidHashLength`

### `update_profile(env: Env, account_id: Address, account_type: Option<AccountType>, data_hash: Option<Bytes>) -> Result<UserProfile, ContractError>`

Updates metadata for an existing profile.

- **Authorization**: `account_id` must authorize.
- **Errors**: `ProfileNotFound`, `InvalidHashLength`

### `verify_profile(env: Env, admin: Address, account_id: Address) -> Result<UserProfile, ContractError>`

Marks a profile as verified (e.g., after KYC).

- **Authorization**: `admin` must authorize.
- **Errors**: `AdminNotConfigured`, `UnauthorizedAdmin`, `ProfileNotFound`

### `unverify_profile(env: Env, admin: Address, account_id: Address) -> Result<UserProfile, ContractError>`

Removes the verification status from a profile.

- **Authorization**: `admin` must authorize.
- **Errors**: `AdminNotConfigured`, `UnauthorizedAdmin`, `ProfileNotFound`

### Read-Only Functions

- `get_profile(env: Env, account_id: Address) -> Option<UserProfile>`: Returns the full profile struct.
- `has_profile(env: Env, account_id: Address) -> bool`: Checks for profile existence.
- `get_admin(env: Env) -> Result<Address, ContractError>`: Returns current admin.

## Storage Structure

The contract uses `Persistent` storage for profiles and `Instance` storage for administrative data.

| Key                | Type          | Storage Type | Description                    |
| ------------------ | ------------- | ------------ | ------------------------------ |
| `Initialized`      | `bool`        | Instance     | Boolean flag.                  |
| `Admin`            | `Address`     | Instance     | Global admin address.          |
| `Profile(Address)` | `UserProfile` | Persistent   | Maps user address to metadata. |

## Events Emitted

| Event                | Topics                                           | Data                       | Description             |
| -------------------- | ------------------------------------------------ | -------------------------- | ----------------------- |
| `initialized`        | `["init", admin: Address]`                       | `()`                       | Contract setup success. |
| `profile_created`    | `["profile", "created", account_id: Address]`    | `(AccountType, data_hash)` | New user joined.        |
| `profile_updated`    | `["profile", "updated", account_id: Address]`    | `(AccountType, data_hash)` | Metadata changed.       |
| `profile_verified`   | `["profile", "verified", account_id: Address]`   | `()`                       | KYC confirmed by admin. |
| `profile_unverified` | `["profile", "unverified", account_id: Address]` | `()`                       | Verification revoked.   |
| `profile_deleted`    | `["profile", "deleted", account_id: Address]`    | `()`                       | User removed data.      |

## Error Codes

| Code | Variant                | Description                                      |
| ---- | ---------------------- | ------------------------------------------------ |
| `1`  | `AlreadyInitialized`   | Initialization attempted more than once.         |
| `2`  | `ProfileAlreadyExists` | Account already has a profile registered.        |
| `3`  | `ProfileNotFound`      | Operation requested on non-existent profile.     |
| `4`  | `InvalidHashLength`    | Hash is not 32 (SHA-256) or 46 (IPFS CID) bytes. |
| `5`  | `AdminNotConfigured`   | Admin address missing from storage.              |
| `6`  | `UnauthorizedAdmin`    | Caller is not the registered admin.              |
| `7`  | `AccessDenied`         | Unauthorized access to user-owned data.          |

## Integration

### Registration Procedure

1.  Prepare off-chain data and generate its SHA-256 hash or upload to IPFS.
2.  Call `create_profile` with the `account_type` and `data_hash`.
3.  Listen for the `profile_created` event to confirm success.

### Verify User Role

To verify a user's role before allowing certain actions:

```rust
let profile = client.get_profile(&user);
match profile {
    Some(p) => {
        if p.account_type == AccountType::Landlord {
            // Allow landlord action
        }
    },
    None => // Redirect to registration
}
```
