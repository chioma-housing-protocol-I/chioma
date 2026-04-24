# Storage Keys Reference

**Status:** Completed  
**Category:** Documentation  
**Type:** Reference Guide  

## Overview

This document provides a comprehensive reference of all storage keys used across the Chioma housing protocol smart contracts. Understanding storage keys is essential for contract development, maintenance, and integration.

## 1. Key Naming Conventions

All storage keys in Chioma follow consistent naming patterns to ensure clarity and maintainability:

```
{contract_name}:{entity_type}:{entity_id}:{field_name}
```

### Components

- **contract_name**: Prefix identifying the contract (e.g., `payment`, `property`, `escrow`)
- **entity_type**: The type of data stored (e.g., `agreement`, `payment`, `profile`)
- **entity_id**: Unique identifier for the entity (hash-based for security)
- **field_name**: Specific field within the entity (e.g., `balance`, `status`, `metadata`)

### Examples

```
payment:agreement:hash_abc123:status
property:registry:hash_def456:metadata
escrow:balance:hash_ghi789:amount
```

## 2. Data Types

Chioma uses Stellar contract data types for storage. Common types include:

| Type | Size | Usage |
|------|------|-------|
| `u128` | 128-bit unsigned integer | Amounts, balances, fees |
| `u64` | 64-bit unsigned integer | Timestamps, counters, IDs |
| `u32` | 32-bit unsigned integer | Error codes, configuration |
| `Address` | 56 bytes | Stellar account addresses |
| `Bytes` | Variable | Hashes, metadata, serialized data |
| `Map` | Variable | Indexed storage, key-value pairs |
| `Vec` | Variable | Lists, arrays of items |
| `Symbol` | 32 bytes | String identifiers, contract names |

## 3. Payment Contract Storage Keys

### Core Agreement Keys

| Key Pattern | Type | Description | Example |
|------------|------|-------------|---------|
| `payment:agreement:{id}:principal` | `u128` | Rental amount for the agreement | `500000000` (5 XLM) |
| `payment:agreement:{id}:status` | `u32` | Current agreement status (0=active, 1=paused, 2=cancelled) | `0` |
| `payment:agreement:{id}:tenant` | `Address` | Tenant's Stellar address | `GXXXXXX...` |
| `payment:agreement:{id}:landlord` | `Address` | Landlord's Stellar address | `GXXXXXX...` |
| `payment:agreement:{id}:created_at` | `u64` | Timestamp of agreement creation | `1704067200` |
| `payment:agreement:{id}:duration_months` | `u32` | Agreement duration in months | `12` |

### Payment Records

| Key Pattern | Type | Description |
|------------|------|-------------|
| `payment:record:{id}:amount` | `u128` | Payment amount |
| `payment:record:{id}:due_date` | `u64` | Payment due timestamp |
| `payment:record:{id}:paid_date` | `u64` | Actual payment timestamp (0 if unpaid) |
| `payment:record:{id}:status` | `u32` | Payment status (0=pending, 1=paid, 2=overdue, 3=waived) |
| `payment:record:{id}:hash` | `Bytes` | Payment record hash |

### Recurring Payment Keys

| Key Pattern | Type | Description |
|------------|------|-------------|
| `payment:recurring:{id}:agreement_id` | `Bytes` | Associated agreement ID |
| `payment:recurring:{id}:frequency` | `u32` | Frequency in days (30, 60, 90, etc.) |
| `payment:recurring:{id}:next_payment_date` | `u64` | Next scheduled payment timestamp |
| `payment:recurring:{id}:is_active` | `u32` | Active status (1=active, 0=paused) |
| `payment:recurring:{id}:execution_count` | `u64` | Number of successful executions |

### Late Fee Configuration

| Key Pattern | Type | Description |
|------------|------|-------------|
| `payment:late_fee:{agreement_id}:percentage` | `u32` | Late fee percentage (1-100) |
| `payment:late_fee:{agreement_id}:grace_period_days` | `u32` | Grace period before late fee applies |
| `payment:late_fee:{agreement_id}:applied_fees` | `u128` | Total late fees collected |

## 4. Property Registry Contract Storage Keys

### Property Records

| Key Pattern | Type | Description |
|------------|------|-------------|
| `property:registry:{id}:owner` | `Address` | Property owner address |
| `property:registry:{id}:location` | `Bytes` | Property location (geohash or coordinates) |
| `property:registry:{id}:metadata_cid` | `Bytes` | IPFS CID for property metadata |
| `property:registry:{id}:verification_status` | `u32` | Verification state (0=unverified, 1=verified) |
| `property:registry:{id}:registered_at` | `u64` | Registration timestamp |
| `property:registry:{id}:total_units` | `u32` | Number of rental units |

### Property Metadata

| Key Pattern | Type | Description |
|------------|------|-------------|
| `property:metadata:{id}:address` | `Bytes` | Full address string |
| `property:metadata:{id}:square_feet` | `u64` | Property size |
| `property:metadata:{id}:bedrooms` | `u32` | Number of bedrooms |
| `property:metadata:{id}:bathrooms` | `u32` | Number of bathrooms |

## 5. Escrow Contract Storage Keys

### Escrow Account Keys

| Key Pattern | Type | Description |
|------------|------|-------------|
| `escrow:account:{id}:balance` | `u128` | Escrow balance in stroops |
| `escrow:account:{id}:payer` | `Address` | Address that deposited funds |
| `escrow:account:{id}:payee` | `Address` | Address that receives funds |
| `escrow:account:{id}:arbiter` | `Address` | Arbitration address for disputes |
| `escrow:account:{id}:status` | `u32` | Escrow status (0=held, 1=released, 2=disputed, 3=resolved) |
| `escrow:account:{id}:created_at` | `u64` | Escrow creation timestamp |
| `escrow:account:{id}:timeout_at` | `u64` | Timeout release timestamp |

### Escrow Conditions

| Key Pattern | Type | Description |
|------------|------|-------------|
| `escrow:conditions:{id}:required_signatures` | `u32` | Number of signatures required |
| `escrow:conditions:{id}:signers` | `Vec<Address>` | List of authorized signers |
| `escrow:conditions:{id}:release_percentage` | `u32` | Percentage of funds to release (0-100) |

## 6. User Profile Contract Storage Keys

### Profile Data

| Key Pattern | Type | Description |
|------------|------|-------------|
| `profile:user:{address}:metadata_cid` | `Bytes` | IPFS CID for profile metadata |
| `profile:user:{address}:created_at` | `u64` | Profile creation timestamp |
| `profile:user:{address}:updated_at` | `u64` | Last profile update timestamp |
| `profile:user:{address}:profile_type` | `u32` | User type (0=tenant, 1=landlord, 2=agent, 3=admin) |
| `profile:user:{address}:is_verified` | `u32` | Verification status (0=unverified, 1=verified) |

### KYC/AML Data

| Key Pattern | Type | Description |
|------------|------|-------------|
| `profile:kyc:{address}:verification_status` | `u32` | KYC status (0=pending, 1=approved, 2=rejected) |
| `profile:kyc:{address}:verified_at` | `u64` | KYC verification timestamp |
| `profile:kyc:{address}:risk_level` | `u32` | Risk assessment (0=low, 1=medium, 2=high) |

## 7. Dispute Resolution Contract Storage Keys

### Dispute Records

| Key Pattern | Type | Description |
|------------|------|-------------|
| `dispute:case:{id}:plaintiff` | `Address` | Disputing party address |
| `dispute:case:{id}:defendant` | `Address` | Other party address |
| `dispute:case:{id}:amount_in_dispute` | `u128` | Disputed amount |
| `dispute:case:{id}:status` | `u32` | Case status (0=open, 1=resolved, 2=appealed) |
| `dispute:case:{id}:created_at` | `u64` | Case creation timestamp |
| `dispute:case:{id}:resolved_at` | `u64` | Resolution timestamp |
| `dispute:case:{id}:arbitrator` | `Address` | Assigned arbitrator |

### Evidence & Documentation

| Key Pattern | Type | Description |
|------------|------|-------------|
| `dispute:evidence:{case_id}:{index}:content_cid` | `Bytes` | IPFS CID for evidence document |
| `dispute:evidence:{case_id}:{index}:submitted_by` | `Address` | Address that submitted evidence |
| `dispute:evidence:{case_id}:{index}:submitted_at` | `u64` | Submission timestamp |

## 8. Rent Obligation Contract Storage Keys

### Obligation Records

| Key Pattern | Type | Description |
|------------|------|-------------|
| `obligation:nft:{id}:agreement_id` | `Bytes` | Associated rental agreement |
| `obligation:nft:{id}:tenant` | `Address` | Tenant address |
| `obligation:nft:{id}:period_start` | `u64` | Rental period start date |
| `obligation:nft:{id}:period_end` | `u64` | Rental period end date |
| `obligation:nft:{id}:amount` | `u128` | Rent amount for period |
| `obligation:nft:{id}:paid_status` | `u32` | Payment status (0=unpaid, 1=paid, 2=partial) |

## 9. Agent Registry Storage Keys

### Agent Records

| Key Pattern | Type | Description |
|------------|------|-------------|
| `agent:registry:{address}:agent_type` | `u32` | Agent type (0=property_manager, 1=escrow, 2=mediator) |
| `agent:registry:{address}:verified` | `u32` | Verification status |
| `agent:registry:{address}:registered_at` | `u64` | Registration timestamp |
| `agent:registry:{address}:fee_percentage` | `u32` | Service fee percentage |

## 10. Storage Access Patterns

### Common Read Operations

```rust
// Get payment agreement status
let status = env.storage().persistent().get::<u32>(
    &Key::from_slice(b"payment:agreement:{id}:status")
);

// Get escrow balance
let balance = env.storage().persistent().get::<u128>(
    &Key::from_slice(b"escrow:account:{id}:balance")
);

// Get property verification status
let verified = env.storage().persistent().get::<u32>(
    &Key::from_slice(b"property:registry:{id}:verification_status")
);
```

### Common Write Operations

```rust
// Update payment status
env.storage().persistent().set(
    &Key::from_slice(b"payment:record:{id}:status"),
    &1u32 // Paid
);

// Store escrow balance
env.storage().persistent().set(
    &Key::from_slice(b"escrow:account:{id}:balance"),
    &amount
);
```

## 11. Storage Optimization

### Key Compression

To optimize storage costs:
- Use symbolic prefixes (e.g., `p` for payment, `e` for escrow)
- Store IDs as hashes rather than full addresses
- Use enums for status fields instead of strings

### Cleanup and Archival

- Mark completed agreements for removal: `payment:archive:{id}:marked_at`
- Implement data expiration policies
- Archive historical records to off-chain storage (IPFS)

## 12. Best Practices

1. **Consistency**: Always follow the naming convention for new keys
2. **Documentation**: Update this reference when adding new storage patterns
3. **Type Safety**: Use appropriate Stellar types for each key
4. **Validation**: Validate data before storing to ensure integrity
5. **Access Control**: Check authorization before reading/writing sensitive keys
6. **Gas Efficiency**: Batch storage operations when possible
7. **Immutability**: Use append-only patterns for audit trails
8. **Performance**: Index frequently accessed keys for quick lookups

## 13. Migration Guide

When upgrading contracts and modifying storage:

1. Create new keys with version suffix: `payment:agreement:v2:{id}:principal`
2. Migrate data from old keys to new keys
3. Maintain backward compatibility until deprecation period
4. Remove old keys after migration confirms success

## Related Documentation

- [Contract Architecture](../architecture/CONTRACT-ARCHITECTURE.md)
- [Testing Strategy](../testing/TESTING-STRATEGY.md)
- [Deployment Guide](../deployment/DEPLOYMENT.md)
