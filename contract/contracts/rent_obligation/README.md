# Tokenized Rent Obligation Contract

A Soroban smart contract for minting and managing transferable NFTs representing rent agreements on the Stellar network.

## Overview

This contract enables landlords to tokenize their rental income streams as NFTs. These tokens represent the right to receive rent payments from active lease agreements and can be transferred to other parties, enabling use cases such as:

- Using future rental income as collateral
- Selling property with active leases
- Trading rental income rights

## Features

- **NFT Minting**: Create unique tokens for each rent agreement
- **Ownership Transfer**: Transfer obligation ownership between addresses
- **NFT Burn**: Burn completed obligations with audit records
- **Duplicate Prevention**: Ensures only one token per agreement
- **Event Emission**: Tracks minting and transfer activities
- **Owner Queries**: Check current owner of any obligation

## Contract Methods

### `initialize()`
Initialize the contract. Must be called before any other operations.

### `mint_obligation(agreement_id: String, landlord: Address)`
Mint a new tokenized rent obligation NFT.
- **Parameters**:
  - `agreement_id`: Unique identifier for the rent agreement
  - `landlord`: Address that will receive the NFT
- **Authorization**: Requires `landlord` signature
- **Errors**:
  - `NotInitialized`: Contract not initialized
  - `ObligationAlreadyExists`: Token already minted for this agreement

### `transfer_obligation(from: Address, to: Address, agreement_id: String)`
Transfer ownership of a tokenized rent obligation.
- **Parameters**:
  - `from`: Current owner address
  - `to`: New owner address
  - `agreement_id`: Agreement identifier
- **Authorization**: Requires `from` signature
- **Errors**:
  - `NotInitialized`: Contract not initialized
  - `ObligationNotFound`: No token exists for this agreement
  - `Unauthorized`: Caller is not the current owner

### `get_obligation_owner(agreement_id: String) -> Option<Address>`
Query the current owner of a tokenized rent obligation.
- **Returns**: Owner address or None if obligation doesn't exist

### `get_obligation(agreement_id: String) -> Option<RentObligation>`
Get full obligation data including mint timestamp.

### `has_obligation(agreement_id: String) -> bool`
Check if an obligation exists for a given agreement.

### `get_obligation_count() -> u32`
Get total count of minted obligations.

### `burn_nft(token_id: String, reason: String)`
Burn a rent obligation NFT.
- **Parameters**:
  - `token_id`: Agreement identifier
  - `reason`: One of `LeaseCompleted`, `AgreementTerminated`, `DisputeResolved`, `UserRequested`
- **Authorization**: Requires current owner signature
- **Rules**:
  - Burn reason is required and validated
  - NFT can only be burned after lease end checkpoint (post-mint ledger timestamp)
  - Already-burned NFTs cannot be burned again
- **Errors**:
  - `NotInitialized`
  - `ObligationNotFound`
  - `AlreadyBurned`
  - `CannotBurnActiveObligation`
  - `InvalidBurnReason`

### `can_burn(token_id: String) -> Result<bool, ObligationError>`
Check whether an NFT is burnable under current rules.

### `get_burn_record(token_id: String) -> Result<BurnRecord, ObligationError>`
Get immutable burn audit record for a burned NFT.

### `get_burned_nfts(owner: Address) -> Result<Vec<String>, ObligationError>`
Get owner burn history (token IDs).

## Events

### ObligationMinted
Emitted when a new obligation NFT is minted.
- Topics: `["minted", landlord: Address]`
- Data: `agreement_id`, `minted_at`

### ObligationTransferred
Emitted when an obligation is transferred.
- Topics: `["transferred", from: Address, to: Address]`
- Data: `agreement_id`

### NFTBurned
Emitted when an obligation NFT is burned.
- Topics: `["burned", owner: Address]`
- Data: `token_id`, `reason`

## Integration with Rental System

When integrated with the main rental contract:

1. **On Agreement Signing**: After a rent agreement is signed and activated, call `mint_obligation()` to create an NFT for the landlord
2. **Rent Payments**: Payment contract should query `get_obligation_owner()` to determine the current recipient of rent payments
3. **Property Transfer**: When selling property, transfer the obligation NFT to the new owner using `transfer_obligation()`

## Building

```bash
make build
```

## Testing

```bash
make test
cargo test nft_burn
```

## Security Considerations

- Authorization is required for minting and transfers
- Only the current owner can transfer an obligation
- Only the current owner can burn an obligation NFT
- Burn records are persisted for auditability
- Duplicate minting is prevented at the contract level
- All storage uses persistent storage with TTL extension
