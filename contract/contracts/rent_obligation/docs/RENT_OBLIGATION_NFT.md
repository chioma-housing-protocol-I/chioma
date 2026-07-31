# Rent Obligation NFT Contract Documentation

The `TokenizedRentObligationContract` is a Soroban-based smart contract designed to represent rent obligations as unique Non-Fungible Tokens (NFTs). These NFTs serve as digital proof of a rental agreement and can be transferred between parties, providing a foundation for secondary market rental rights and obligation tracking.

## Contract Overview

### Purpose

The primary purpose of this contract is to tokenize rental agreements into portable, verifiable digital assets. Each NFT corresponds to a unique rental agreement and carries with it the history of ownership and eventually a record of its termination (burning).

### Key Features

- **Tokenization**: Converts agreement identifiers into unique NFTs.
- **Ownership Tracking**: Maintains a real-time record of who owns a specific rent obligation.
- **Transfers**: Allows for the secure transfer of rental obligations between authenticated parties.
- **Burning Mechanism**: Provides a formal process for retiring an NFT once the lease is completed or terminated, including a reason-coding system.
- **On-Chain History**: Stores burn records and historical ownership for transparency.

## Public Functions

### `initialize(env: Env) -> Result<(), ObligationError>`

Initializes the contract storage, setting the initial obligation count to zero.

- **Errors**: `AlreadyInitialized`

### `mint_obligation(env: Env, agreement_id: String, landlord: Address) -> Result<(), ObligationError>`

Mints a new rent obligation NFT for a specific agreement.

- **Arguments**:
  - `agreement_id`: Unique identifier for the rent agreement.
  - `landlord`: Address of the landlord who will initially own the NFT.
- **Authorization**: `landlord` must authorize.
- **Errors**: `NotInitialized`, `ObligationAlreadyExists`

### `transfer_obligation(env: Env, from: Address, to: Address, agreement_id: String) -> Result<(), ObligationError>`

Transfers the NFT from its current owner to a new address.

- **Arguments**:
  - `from`: Current owner.
  - `to`: Target address.
  - `agreement_id`: Agreement identifier.
- **Authorization**: `from` must authorize.
- **Errors**: `NotInitialized`, `ObligationNotFound`, `Unauthorized`

### `burn_nft(env: Env, token_id: String, reason: String) -> Result<(), ObligationError>`

Permanently retires an NFT and removes it from active circulation.

- **Arguments**:
  - `token_id`: Agreement ID.
  - `reason`: One of the pre-defined valid burn reasons.
- **Authorization**: The current owner of the NFT must authorize.
- **Errors**: `NotInitialized`, `ObligationNotFound`, `AlreadyBurned`, `CannotBurnActiveObligation`, `InvalidBurnReason`

### Read-Only Functions

- `get_obligation_owner(env: Env, agreement_id: String) -> Option<Address>`: Returns current owner.
- `get_obligation(env: Env, agreement_id: String) -> Option<RentObligation>`: Returns full metadata.
- `has_obligation(env: Env, agreement_id: String) -> bool`: Checks existence.
- `get_obligation_count(env: Env) -> u32`: Total active NFTs.
- `can_burn(env: Env, token_id: String) -> Result<bool, ObligationError>`: Checks if an NFT is eligible for burning.
- `get_burn_record(env: Env, token_id: String) -> Result<BurnRecord, ObligationError>`: Retrieves history of a burned NFT.
- `get_burned_nfts(env: Env, owner: Address) -> Result<Vec<String>, ObligationError>`: Lists all NFTs burned by an owner.

## Storage Structure

The contract utilizes `Persistent` storage for long-term consistency. Data is mapped using the `DataKey` enum:

| Key                          | Type             | Description                                                            |
| ---------------------------- | ---------------- | ---------------------------------------------------------------------- |
| `Initialized`                | `bool`           | Flag for contract setup status.                                        |
| `Obligation(agreement_id)`   | `RentObligation` | Stores metadata: `agreement_id`, `owner`, `minted_at`.                 |
| `Owner(agreement_id)`        | `Address`        | Direct mapping of agreement to its current owner.                      |
| `ObligationCount`            | `u32`            | Total number of active NFTs.                                           |
| `BurnRecord(token_id)`       | `BurnRecord`     | History of burned NFT: `token_id`, `burned_by`, `burned_at`, `reason`. |
| `BurnedNfts(owner_addr_str)` | `Vec<String>`    | List of burned token IDs per owner.                                    |

## Events Emitted

| Event                   | Type            | Topics                          | Data                        |
| ----------------------- | --------------- | ------------------------------- | --------------------------- |
| `ObligationMinted`      | `contractevent` | `["minted"]`, `landlord`        | `agreement_id`, `minted_at` |
| `ObligationTransferred` | `contractevent` | `["transferred"]`, `from`, `to` | `agreement_id`              |
| `NFTBurned`             | `contractevent` | `["burned"]`, `owner`           | `token_id`, `reason`        |

## Error Codes

| Code                            | Meaning                                             |
| ------------------------------- | --------------------------------------------------- |
| `1: AlreadyInitialized`         | Contract setup has already been called.             |
| `2: NotInitialized`             | Operation requires prior initialization.            |
| `3: ObligationAlreadyExists`    | NFT for this agreement ID is already minted.        |
| `4: ObligationNotFound`         | No NFT found for the provided agreement ID.         |
| `5: Unauthorized`               | Caller is not the legitimate owner of the NFT.      |
| `6: InvalidOwner`               | Provided owner address is invalid.                  |
| `7: AlreadyBurned`              | NFT has already been burned.                        |
| `8: BurnRecordNotFound`         | No record found for the provided token ID.          |
| `9: CannotBurnActiveObligation` | Burn attempted immediately after mint (protection). |
| `10: InvalidBurnReason`         | Provided reason is not in the allowed list.         |

## NFT Management Procedures

### NFT Minting

Verification that an agreement exists should happen before calling `mint_obligation`.

```rust
client.mint_obligation(&agreement_id, &landlord_address);
```

### NFT Transfer

Transfers require the current owner (`from`) to sign the transaction.

```rust
client.transfer_obligation(&from, &to, &agreement_id);
```

### NFT Burning

NFTs can only be burned if the current timestamp is strictly greater than the minting timestamp.
**Valid reasons**: `LeaseCompleted`, `AgreementTerminated`, `DisputeResolved`, `UserRequested`.

```rust
client.burn_nft(&agreement_id, &String::from_str(&env, "LeaseCompleted"));
```

## Usage Examples

### Integration with other contracts

Other contracts in the Chioma ecosystem can integrate via the client:

```rust
let nft_client = TokenizedRentObligationContractClient::new(&env, &nft_contract_id);
if nft_client.has_obligation(&agreement_id) {
    let owner = nft_client.get_obligation_owner(&agreement_id).unwrap();
    // Proceed with logic based on owner address
}
```
