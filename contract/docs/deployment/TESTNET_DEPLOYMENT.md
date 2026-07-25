# Testnet Deployment Guide

This guide walks through deploying the Chioma smart contracts to Stellar's testnet.

## Prerequisites

- Soroban CLI installed: `cargo install soroban-cli`
- Stellar testnet account with XLM for fees
- All contracts built in release mode

## Contract Overview

| Contract           | Size | Purpose                              |
| ------------------ | ---- | ------------------------------------ |
| chioma             | 132K | Main rental agreement lifecycle      |
| dispute_resolution | 64K  | Dispute handling & arbitration       |
| escrow             | 43K  | Security deposit management          |
| payment            | 60K  | Rent payment processing              |
| agent_registry     | 27K  | Agent registration & verification    |
| property_registry  | 20K  | Property registration & verification |
| rent_obligation    | 25K  | Tokenized rent obligations (NFT)     |
| user_profile       | 21K  | User profile management              |

**Total: ~392K of WASM code**

## Build for Deployment

```bash
cd contract
cargo build --release
```

WASM files are located at: `contract/target/wasm32-unknown-unknown/release/`

## Deployment Steps

### 1. Set Up Soroban CLI

```bash
# Configure testnet network
soroban network add --name testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Set as default
soroban network use testnet
```

### 2. Create/Import Testnet Account

```bash
# Generate new keypair
soroban keys generate --name testnet-deployer

# Or import existing
soroban keys import --name testnet-deployer --secret-key <YOUR_SECRET_KEY>

# Fund account at: https://friendbot.stellar.org/?addr=<YOUR_PUBLIC_KEY>
```

### 3. Deploy Contracts (Recommended Order)

Deploy in this order due to dependencies:

#### Step 3a: Deploy User Profile Contract

```bash
soroban contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/user_profile.wasm \
  --source testnet-deployer \
  --network testnet
```

Save the contract ID (e.g., `CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4`)

#### Step 3b: Deploy Property Registry

```bash
soroban contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/property_registry.wasm \
  --source testnet-deployer \
  --network testnet
```

#### Step 3c: Deploy Agent Registry

```bash
soroban contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/agent_registry.wasm \
  --source testnet-deployer \
  --network testnet
```

#### Step 3d: Deploy Rent Obligation (NFT)

```bash
soroban contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/rent_obligation.wasm \
  --source testnet-deployer \
  --network testnet
```

#### Step 3e: Deploy Escrow

```bash
soroban contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/escrow.wasm \
  --source testnet-deployer \
  --network testnet
```

#### Step 3f: Deploy Payment

```bash
soroban contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/payment.wasm \
  --source testnet-deployer \
  --network testnet
```

#### Step 3g: Deploy Dispute Resolution

```bash
soroban contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/dispute_resolution.wasm \
  --source testnet-deployer \
  --network testnet
```

#### Step 3h: Deploy Chioma (Main Contract)

```bash
soroban contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/chioma.wasm \
  --source testnet-deployer \
  --network testnet
```

### 4. Initialize Contracts

After deployment, initialize each contract with required parameters.

#### Initialize User Profile

```bash
soroban contract invoke \
  --id <USER_PROFILE_CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_PUBLIC_KEY>
```

#### Initialize Property Registry

```bash
soroban contract invoke \
  --id <PROPERTY_REGISTRY_CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_PUBLIC_KEY>
```

#### Initialize Agent Registry

```bash
soroban contract invoke \
  --id <AGENT_REGISTRY_CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_PUBLIC_KEY>
```

#### Initialize Rent Obligation

```bash
soroban contract invoke \
  --id <RENT_OBLIGATION_CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- initialize
```

#### Initialize Escrow

```bash
soroban contract invoke \
  --id <ESCROW_CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- initialize_admin \
  --admin <YOUR_PUBLIC_KEY>
```

#### Initialize Payment

```bash
soroban contract invoke \
  --id <PAYMENT_CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- set_platform_fee_collector \
  --collector <YOUR_PUBLIC_KEY>
```

#### Initialize Dispute Resolution

```bash
soroban contract invoke \
  --id <DISPUTE_RESOLUTION_CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_PUBLIC_KEY> \
  --min_votes_required 3 \
  --chioma_contract <CHIOMA_CONTRACT_ID>
```

#### Initialize Chioma (Main Contract)

```bash
soroban contract invoke \
  --id <CHIOMA_CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_PUBLIC_KEY> \
  --config '{
    "fee_bps": 500,
    "paused": false
  }'
```

## Verification

### Check Contract Deployment

```bash
soroban contract info \
  --id <CONTRACT_ID> \
  --network testnet
```

### Test Contract Call

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- get_state
```

## Contract IDs Storage

Create a `.env.testnet` file to store deployed contract IDs:

```bash
# .env.testnet
CHIOMA_CONTRACT_ID=C...
DISPUTE_RESOLUTION_CONTRACT_ID=C...
ESCROW_CONTRACT_ID=C...
PAYMENT_CONTRACT_ID=C...
AGENT_REGISTRY_CONTRACT_ID=C...
PROPERTY_REGISTRY_CONTRACT_ID=C...
RENT_OBLIGATION_CONTRACT_ID=C...
USER_PROFILE_CONTRACT_ID=C...
```

## Testnet Considerations

### Gas Fees

- Testnet XLM is free from Friendbot
- Each deployment costs ~100-500 stroops
- Each contract call costs ~100-1000 stroops

### Rate Limiting

- Testnet has rate limits on RPC calls
- Space out deployments if needed
- Use `--wait` flag for confirmation

### Testing

- Test all contract interactions before mainnet
- Verify upgrade mechanisms work
- Test multi-sig governance flows
- Validate error handling

## Troubleshooting

### Contract Deployment Fails

```bash
# Check account balance
soroban account balance \
  --source testnet-deployer \
  --network testnet

# Fund account at https://friendbot.stellar.org/
```

### Contract Call Fails

```bash
# Check contract exists
soroban contract info \
  --id <CONTRACT_ID> \
  --network testnet

# Verify parameters match contract spec
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  -- <function_name> --help
```

### Timeout Issues

```bash
# Increase timeout
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source testnet-deployer \
  --network testnet \
  --timeout 30 \
  -- <function_name>
```

## Next Steps

1. **Test all contract interactions** on testnet
2. **Verify upgrade mechanisms** work correctly
3. **Load test** with realistic transaction volumes
4. **Security audit** before mainnet deployment
5. **Document all contract IDs** for reference
6. **Create monitoring** for contract events

## Mainnet Deployment

When ready for mainnet:

1. Repeat deployment steps with mainnet network
2. Use production-grade admin keys (hardware wallet)
3. Implement multi-sig governance
4. Enable comprehensive monitoring
5. Have incident response plan ready

## Support

For issues or questions:

- Check Soroban documentation: https://soroban.stellar.org/
- Review contract code in `contract/contracts/`
- Check deployment logs for error details
