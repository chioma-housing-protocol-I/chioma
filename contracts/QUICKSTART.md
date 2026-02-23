# Quick Start Guide

Get up and running with the User Profile Smart Contract in 5 minutes.

## Prerequisites

Install required tools:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Soroban CLI
cargo install --locked soroban-cli

# Add WASM target
rustup target add wasm32-unknown-unknown
```

## Build & Test

```bash
# Navigate to contract directory
cd contracts/user-profile

# Make scripts executable
chmod +x build.sh deploy.sh test.sh

# Run tests
./test.sh

# Build contract
./build.sh
```

## Deploy to Testnet

```bash
# Generate admin keypair (if you don't have one)
soroban keys generate admin --network testnet

# Fund admin account
curl "https://friendbot.stellar.org?addr=$(soroban keys address admin)"

# Set admin secret
export STELLAR_ADMIN_SECRET=$(soroban keys show admin)

# Deploy and initialize
./deploy.sh testnet

# Save the CONTRACT_ID from output
export PROFILE_CONTRACT_ID="CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

## Usage Examples

### Create a Profile

```bash
# Generate user keypair
soroban keys generate user --network testnet

# Fund user account
curl "https://friendbot.stellar.org?addr=$(soroban keys address user)"

# Create profile
soroban contract invoke \
  --id $PROFILE_CONTRACT_ID \
  --source user \
  --network testnet \
  -- create_profile \
  --account_id $(soroban keys address user) \
  --account_type '{"Tenant":[]}' \
  --data_hash $(echo -n "profile_data" | sha256sum | cut -d' ' -f1 | xxd -r -p | base64)
```

### Get a Profile

```bash
soroban contract invoke \
  --id $PROFILE_CONTRACT_ID \
  --network testnet \
  -- get_profile \
  --account_id $(soroban keys address user)
```

### Update a Profile

```bash
soroban contract invoke \
  --id $PROFILE_CONTRACT_ID \
  --source user \
  --network testnet \
  -- update_profile \
  --account_id $(soroban keys address user) \
  --account_type '{"Landlord":[]}' \
  --data_hash $(echo -n "updated_data" | sha256sum | cut -d' ' -f1 | xxd -r -p | base64)
```

### Verify a Profile (Admin Only)

```bash
soroban contract invoke \
  --id $PROFILE_CONTRACT_ID \
  --source admin \
  --network testnet \
  -- verify_profile \
  --admin $(soroban keys address admin) \
  --account_id $(soroban keys address user)
```

## Integration with Backend

### TypeScript Example

```typescript
import { Contract, SorobanRpc, Keypair } from '@stellar/stellar-sdk';
import crypto from 'crypto';

// Initialize
const contractId = process.env.PROFILE_CONTRACT_ID;
const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
const contract = new Contract(contractId);

// Compute data hash
function computeHash(data: object): Buffer {
  return crypto.createHash('sha256')
    .update(JSON.stringify(data))
    .digest();
}

// Create profile
async function createProfile(userKeypair: Keypair, accountType: string, profileData: object) {
  const dataHash = computeHash(profileData);
  
  const tx = await contract.call(
    'create_profile',
    userKeypair.publicKey(),
    { [accountType]: [] },
    dataHash
  );
  
  // Sign and submit transaction
  tx.sign(userKeypair);
  const result = await server.sendTransaction(tx);
  
  return result;
}

// Get profile
async function getProfile(accountId: string) {
  const result = await contract.call('get_profile', accountId);
  return result;
}
```

### Rust Example

```rust
use soroban_sdk::{Address, Bytes, Env};

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

## Data Flow

### Complete Profile Creation Flow

```
1. User submits profile data to backend
   ↓
2. Backend validates and sanitizes data
   ↓
3. Backend computes SHA-256 hash
   ↓
4. Backend uploads data to IPFS (optional)
   ↓
5. Backend calls create_profile on contract
   ↓
6. Contract stores minimal data + hash on-chain
   ↓
7. Backend stores complete data in PostgreSQL
   ↓
8. Backend returns success to user
```

### Data Integrity Verification

```
1. Retrieve on-chain profile (contains data_hash)
   ↓
2. Retrieve off-chain data from PostgreSQL/IPFS
   ↓
3. Compute hash of off-chain data
   ↓
4. Compare computed hash with on-chain hash
   ↓
5. Return verification result
```

## Common Issues

### Build Fails

```bash
# Ensure WASM target is installed
rustup target add wasm32-unknown-unknown

# Update Rust
rustup update
```

### Deployment Fails

```bash
# Check account balance
soroban keys address admin
# Fund at: https://laboratory.stellar.org/#account-creator

# Verify network connectivity
curl https://soroban-testnet.stellar.org/health
```

### Transaction Fails

```bash
# Check if contract is initialized
soroban contract invoke \
  --id $PROFILE_CONTRACT_ID \
  --network testnet \
  -- get_admin

# Verify account has XLM for fees
soroban keys address user
```

## Next Steps

1. Read the [full README](user-profile/README.md) for detailed documentation
2. Review the [technical specification](SPECIFICATION.md)
3. Explore the [contract source code](user-profile/src/)
4. Run the test suite: `./test.sh`
5. Deploy to mainnet (after thorough testing!)

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Documentation](https://soroban.stellar.org/)
- [Stellar Laboratory](https://laboratory.stellar.org/)
- [Soroban Examples](https://github.com/stellar/soroban-examples)

## Support

For help or questions, contact the development team.
