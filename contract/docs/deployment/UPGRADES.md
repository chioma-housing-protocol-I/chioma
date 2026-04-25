# Contract Upgrades

This document provides comprehensive guidance on upgrading Soroban smart contracts, including upgrade strategies, procedures, migration, rollback, testing, and best practices.

---

## 1. Upgrade Strategy

### 1.1 Upgrade Approaches

#### 1.1.1 Proxy Pattern (Recommended)

**Description:** Use a proxy contract that delegates to implementation contract

**Advantages:**

- Preserves contract address
- Seamless upgrades for users
- Maintains state across upgrades
- No migration needed

**Disadvantages:**

- Slightly higher gas costs
- Additional complexity
- Proxy contract must be immutable

**Implementation:**

```rust
// Proxy contract
pub fn upgrade(env: &Env, new_impl: Address) -> Result<(), ContractError> {
    // Only admin can upgrade
    let admin = env.storage().persistent().get::<_, Address>(&Symbol::new(env, "admin"))?;
    env.invoker().require_auth(&admin);

    // Store new implementation address
    env.storage().persistent().set(&Symbol::new(env, "impl"), &new_impl);

    Ok(())
}

// Delegate calls to implementation
pub fn some_function(env: &Env, param: String) -> Result<String, ContractError> {
    let impl_addr = env.storage().persistent().get::<_, Address>(&Symbol::new(env, "impl"))?;

    // Delegate to implementation
    env.invoke_contract(&impl_addr, &Symbol::new(env, "some_function"), &(param,))
}
```

#### 1.1.2 Contract Replacement

**Description:** Deploy new contract and migrate state

**Advantages:**

- Clean slate for new implementation
- No proxy overhead
- Simpler contract code

**Disadvantages:**

- New contract address
- Requires state migration
- Users must update references
- Potential downtime

**Use Cases:**

- Major version changes
- Complete rewrite
- Significant architecture changes

#### 1.1.3 Feature Flags

**Description:** Use feature flags to enable/disable functionality

**Advantages:**

- No contract upgrade needed
- Gradual rollout capability
- Easy rollback

**Disadvantages:**

- Adds code complexity
- Requires flag management
- Not suitable for major changes

**Implementation:**

```rust
pub fn set_feature_flag(env: &Env, feature: String, enabled: bool) -> Result<(), ContractError> {
    let admin = get_admin(env)?;
    env.invoker().require_auth(&admin);

    let key = Symbol::new(env, &format!("feature:{}", feature));
    env.storage().persistent().set(&key, &enabled);

    Ok(())
}

pub fn is_feature_enabled(env: &Env, feature: &str) -> bool {
    let key = Symbol::new(env, &format!("feature:{}", feature));
    env.storage().persistent().get::<_, bool>(&key).unwrap_or(false)
}
```

### 1.2 Upgrade Decision Matrix

| Scenario                 | Approach             | Reason                                   |
| ------------------------ | -------------------- | ---------------------------------------- |
| Bug fix                  | Proxy                | Preserve address, minimal disruption     |
| New feature              | Feature flag         | Gradual rollout, easy rollback           |
| Breaking API change      | Contract replacement | Clean slate, clear migration path        |
| Performance optimization | Proxy                | Transparent to users                     |
| Major rewrite            | Contract replacement | Significant changes warrant new contract |
| Security patch           | Proxy                | Urgent fix, preserve address             |

---

## 2. Upgrade Procedures

### 2.1 Pre-Upgrade Checklist

Complete before any upgrade:

- [ ] Code review completed
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Migration plan documented
- [ ] Rollback plan documented
- [ ] State migration tested
- [ ] Staging deployment successful
- [ ] Smoke tests passed on staging
- [ ] Upgrade runbook prepared
- [ ] Communication plan ready
- [ ] Monitoring dashboards prepared

### 2.2 Proxy Pattern Upgrade

**Step 1: Deploy New Implementation**

```bash
#!/bin/bash
# deploy-new-impl.sh

set -euo pipefail

NETWORK="${1:-testnet}"
ADMIN_KEY="${2}"

echo "Deploying new implementation contract to ${NETWORK}"

# Build contract
cargo build --release --target wasm32-unknown-unknown

# Get WASM hash
WASM_HASH=$(soroban contract install \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  target/wasm32-unknown-unknown/release/chioma_contract.wasm)

echo "New implementation WASM hash: ${WASM_HASH}"

# Store for next step
echo ${WASM_HASH} > .wasm_hash_${NETWORK}
```

**Step 2: Invoke Upgrade**

```bash
#!/bin/bash
# invoke-upgrade.sh

set -euo pipefail

NETWORK="${1:-testnet}"
PROXY_ADDRESS="${2}"
ADMIN_KEY="${3}"
WASM_HASH="${4}"

echo "Upgrading proxy contract ${PROXY_ADDRESS}"

# Invoke upgrade function
soroban contract invoke \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  --id ${PROXY_ADDRESS} \
  -- upgrade \
  --new_impl ${WASM_HASH}

echo "Upgrade completed"
```

**Step 3: Verify Upgrade**

```bash
#!/bin/bash
# verify-upgrade.sh

set -euo pipefail

NETWORK="${1:-testnet}"
PROXY_ADDRESS="${2}"

echo "Verifying upgrade of ${PROXY_ADDRESS}"

# Check implementation address
IMPL_ADDRESS=$(soroban contract invoke \
  --network ${NETWORK} \
  --id ${PROXY_ADDRESS} \
  -- get_implementation)

echo "Current implementation: ${IMPL_ADDRESS}"

# Test basic functionality
soroban contract invoke \
  --network ${NETWORK} \
  --id ${PROXY_ADDRESS} \
  -- health_check

echo "Upgrade verification passed"
```

### 2.3 Contract Replacement Upgrade

**Step 1: Deploy New Contract**

```bash
#!/bin/bash
# deploy-new-contract.sh

set -euo pipefail

NETWORK="${1:-testnet}"
ADMIN_KEY="${2}"

echo "Deploying new contract to ${NETWORK}"

# Build contract
cargo build --release --target wasm32-unknown-unknown

# Deploy contract
NEW_CONTRACT=$(soroban contract deploy \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  --wasm target/wasm32-unknown-unknown/release/chioma_contract.wasm)

echo "New contract address: ${NEW_CONTRACT}"

# Store for next step
echo ${NEW_CONTRACT} > .new_contract_${NETWORK}
```

**Step 2: Migrate State**

```bash
#!/bin/bash
# migrate-state.sh

set -euo pipefail

NETWORK="${1:-testnet}"
OLD_CONTRACT="${2}"
NEW_CONTRACT="${3}"
ADMIN_KEY="${4}"

echo "Migrating state from ${OLD_CONTRACT} to ${NEW_CONTRACT}"

# Export state from old contract
soroban contract invoke \
  --network ${NETWORK} \
  --id ${OLD_CONTRACT} \
  -- export_state > state_export.json

# Import state to new contract
soroban contract invoke \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  --id ${NEW_CONTRACT} \
  -- import_state \
  --state "$(cat state_export.json)"

echo "State migration completed"
```

**Step 3: Update References**

```bash
#!/bin/bash
# update-references.sh

set -euo pipefail

NETWORK="${1:-testnet}"
OLD_CONTRACT="${2}"
NEW_CONTRACT="${3}"
ADMIN_KEY="${4}"

echo "Updating contract references"

# Update in registry
soroban contract invoke \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  --id registry \
  -- update_contract_address \
  --old_address ${OLD_CONTRACT} \
  --new_address ${NEW_CONTRACT}

# Update in dependent contracts
for contract in escrow payment disputes; do
  soroban contract invoke \
    --network ${NETWORK} \
    --source ${ADMIN_KEY} \
    --id ${contract} \
    -- update_dependency \
    --dependency_name "main_contract" \
    --new_address ${NEW_CONTRACT}
done

echo "References updated"
```

---

## 3. Migration Procedures

### 3.1 State Migration

**Export State:**

```rust
pub fn export_state(env: &Env) -> Result<Vec<StateEntry>, ContractError> {
    let mut state = Vec::new();

    // Export all persistent storage
    let storage = env.storage().persistent();

    // Export users
    let users_key = Symbol::new(env, "users");
    if let Ok(users) = storage.get::<_, Map<Address, UserData>>(&users_key) {
        for (addr, data) in users.iter() {
            state.push(StateEntry {
                key: "user".to_string(),
                address: addr,
                data: serialize_user_data(&data),
            });
        }
    }

    // Export agreements
    let agreements_key = Symbol::new(env, "agreements");
    if let Ok(agreements) = storage.get::<_, Map<String, AgreementData>>(&agreements_key) {
        for (id, data) in agreements.iter() {
            state.push(StateEntry {
                key: "agreement".to_string(),
                id: id,
                data: serialize_agreement_data(&data),
            });
        }
    }

    Ok(state)
}
```

**Import State:**

```rust
pub fn import_state(env: &Env, state: Vec<StateEntry>) -> Result<(), ContractError> {
    let storage = env.storage().persistent();

    for entry in state {
        match entry.key.as_str() {
            "user" => {
                let user_data = deserialize_user_data(&entry.data)?;
                let users_key = Symbol::new(env, "users");
                let mut users = storage.get::<_, Map<Address, UserData>>(&users_key)
                    .unwrap_or_else(|_| Map::new(env));
                users.set(entry.address, user_data);
                storage.set(&users_key, &users);
            },
            "agreement" => {
                let agreement_data = deserialize_agreement_data(&entry.data)?;
                let agreements_key = Symbol::new(env, "agreements");
                let mut agreements = storage.get::<_, Map<String, AgreementData>>(&agreements_key)
                    .unwrap_or_else(|_| Map::new(env));
                agreements.set(entry.id, agreement_data);
                storage.set(&agreements_key, &agreements);
            },
            _ => return Err(ContractError::InvalidStateEntry),
        }
    }

    Ok(())
}
```

### 3.2 Data Transformation

**Transform During Migration:**

```rust
pub fn migrate_v1_to_v2(env: &Env) -> Result<(), ContractError> {
    let storage = env.storage().persistent();

    // Get old data structure
    let old_users_key = Symbol::new(env, "users_v1");
    let old_users = storage.get::<_, Map<Address, OldUserData>>(&old_users_key)?;

    // Transform to new structure
    let mut new_users = Map::new(env);
    for (addr, old_data) in old_users.iter() {
        let new_data = UserData {
            address: addr,
            name: old_data.name,
            email: old_data.email,
            // New fields with defaults
            kyc_status: KycStatus::Pending,
            reputation_score: 0,
            created_at: env.ledger().timestamp(),
        };
        new_users.set(addr, new_data);
    }

    // Store new data
    let new_users_key = Symbol::new(env, "users");
    storage.set(&new_users_key, &new_users);

    // Remove old data
    storage.remove(&old_users_key);

    Ok(())
}
```

### 3.3 Incremental Migration

**For Large Datasets:**

```rust
pub fn migrate_batch(
    env: &Env,
    batch_size: u32,
    offset: u32,
) -> Result<MigrationStatus, ContractError> {
    let storage = env.storage().persistent();

    // Get migration state
    let migration_key = Symbol::new(env, "migration_state");
    let mut migration = storage.get::<_, MigrationState>(&migration_key)
        .unwrap_or_else(|_| MigrationState::new());

    // Process batch
    let old_users_key = Symbol::new(env, "users_v1");
    let old_users = storage.get::<_, Map<Address, OldUserData>>(&old_users_key)?;

    let mut processed = 0;
    for (addr, old_data) in old_users.iter().skip(offset as usize).take(batch_size as usize) {
        let new_data = transform_user_data(old_data);

        let new_users_key = Symbol::new(env, "users");
        let mut new_users = storage.get::<_, Map<Address, UserData>>(&new_users_key)
            .unwrap_or_else(|_| Map::new(env));
        new_users.set(addr, new_data);
        storage.set(&new_users_key, &new_users);

        processed += 1;
    }

    // Update migration state
    migration.processed += processed;
    migration.last_offset = offset + batch_size;

    let status = if migration.processed >= migration.total {
        MigrationStatus::Complete
    } else {
        MigrationStatus::InProgress
    };

    storage.set(&migration_key, &migration);

    Ok(status)
}
```

---

## 4. Rollback Procedures

### 4.1 Proxy Pattern Rollback

**Immediate Rollback:**

```bash
#!/bin/bash
# rollback-proxy.sh

set -euo pipefail

NETWORK="${1:-testnet}"
PROXY_ADDRESS="${2}"
ADMIN_KEY="${3}"
PREVIOUS_IMPL="${4}"

echo "Rolling back proxy to previous implementation"

# Invoke rollback
soroban contract invoke \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  --id ${PROXY_ADDRESS} \
  -- upgrade \
  --new_impl ${PREVIOUS_IMPL}

echo "Rollback completed"

# Verify
soroban contract invoke \
  --network ${NETWORK} \
  --id ${PROXY_ADDRESS} \
  -- health_check
```

### 4.2 Contract Replacement Rollback

**Restore Previous Contract:**

```bash
#!/bin/bash
# rollback-contract.sh

set -euo pipefail

NETWORK="${1:-testnet}"
OLD_CONTRACT="${2}"
NEW_CONTRACT="${3}"
ADMIN_KEY="${4}"

echo "Rolling back to previous contract"

# Update references back to old contract
soroban contract invoke \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  --id registry \
  -- update_contract_address \
  --old_address ${NEW_CONTRACT} \
  --new_address ${OLD_CONTRACT}

# Update dependent contracts
for contract in escrow payment disputes; do
  soroban contract invoke \
    --network ${NETWORK} \
    --source ${ADMIN_KEY} \
    --id ${contract} \
    -- update_dependency \
    --dependency_name "main_contract" \
    --new_address ${OLD_CONTRACT}
done

echo "Rollback completed"
```

### 4.3 State Rollback

**Restore Previous State:**

```bash
#!/bin/bash
# rollback-state.sh

set -euo pipefail

NETWORK="${1:-testnet}"
CONTRACT="${2}"
ADMIN_KEY="${3}"
BACKUP_FILE="${4}"

echo "Restoring state from backup"

# Import state from backup
soroban contract invoke \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  --id ${CONTRACT} \
  -- import_state \
  --state "$(cat ${BACKUP_FILE})"

echo "State restored"
```

---

## 5. Testing Procedures

### 5.1 Unit Tests

**Test Upgrade Function:**

```rust
#[test]
fn test_upgrade() {
    let env = Env::default();
    let contract_id = env.register_contract(None, Contract);

    let admin = Address::random(&env);
    let new_impl = Address::random(&env);

    // Set admin
    env.storage().persistent().set(&Symbol::new(&env, "admin"), &admin);

    // Invoke upgrade
    let result: Result<(), ContractError> = env.invoke_contract(
        &contract_id,
        &Symbol::new(&env, "upgrade"),
        &(new_impl.clone(),),
    );

    assert!(result.is_ok());

    // Verify implementation updated
    let impl_addr: Address = env.storage().persistent()
        .get(&Symbol::new(&env, "impl"))
        .unwrap();
    assert_eq!(impl_addr, new_impl);
}
```

**Test State Migration:**

```rust
#[test]
fn test_state_migration() {
    let env = Env::default();
    let contract_id = env.register_contract(None, Contract);

    // Create test data
    let user = UserData {
        address: Address::random(&env),
        name: "Test User".to_string(),
        email: "test@example.com".to_string(),
    };

    // Export state
    let state: Vec<StateEntry> = env.invoke_contract(
        &contract_id,
        &Symbol::new(&env, "export_state"),
        &(),
    ).unwrap();

    assert!(!state.is_empty());

    // Import state
    let result: Result<(), ContractError> = env.invoke_contract(
        &contract_id,
        &Symbol::new(&env, "import_state"),
        &(state,),
    );

    assert!(result.is_ok());
}
```

### 5.2 Integration Tests

**Test Upgrade with Dependent Contracts:**

```rust
#[test]
fn test_upgrade_with_dependencies() {
    let env = Env::default();

    // Deploy contracts
    let main_contract = env.register_contract(None, MainContract);
    let escrow_contract = env.register_contract(None, EscrowContract);

    // Set dependency
    env.invoke_contract(
        &escrow_contract,
        &Symbol::new(&env, "set_main_contract"),
        &(main_contract.clone(),),
    ).unwrap();

    // Upgrade main contract
    let new_impl = Address::random(&env);
    env.invoke_contract(
        &main_contract,
        &Symbol::new(&env, "upgrade"),
        &(new_impl,),
    ).unwrap();

    // Verify escrow still works
    let result: Result<(), ContractError> = env.invoke_contract(
        &escrow_contract,
        &Symbol::new(&env, "health_check"),
        &(),
    );

    assert!(result.is_ok());
}
```

### 5.3 Staging Deployment

**Deploy to Staging Network:**

```bash
#!/bin/bash
# deploy-staging.sh

set -euo pipefail

NETWORK="testnet"
ADMIN_KEY="${1}"

echo "Deploying to staging (${NETWORK})"

# Build contract
cargo build --release --target wasm32-unknown-unknown

# Deploy new implementation
NEW_IMPL=$(soroban contract install \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  target/wasm32-unknown-unknown/release/chioma_contract.wasm)

echo "New implementation: ${NEW_IMPL}"

# Upgrade proxy
soroban contract invoke \
  --network ${NETWORK} \
  --source ${ADMIN_KEY} \
  --id ${STAGING_PROXY} \
  -- upgrade \
  --new_impl ${NEW_IMPL}

# Run smoke tests
./scripts/smoke-tests.sh ${NETWORK}

echo "Staging deployment completed"
```

---

## 6. Verification

### 6.1 Post-Upgrade Verification

**Checklist:**

- [ ] Contract responds to health check
- [ ] All functions callable
- [ ] State preserved correctly
- [ ] No data loss
- [ ] Performance acceptable
- [ ] Error handling working
- [ ] Events emitted correctly
- [ ] Dependent contracts working

**Verification Script:**

```bash
#!/bin/bash
# verify-upgrade.sh

set -euo pipefail

NETWORK="${1:-testnet}"
CONTRACT="${2}"

echo "Verifying upgrade of ${CONTRACT}"

# Health check
echo "Checking health..."
soroban contract invoke \
  --network ${NETWORK} \
  --id ${CONTRACT} \
  -- health_check || exit 1

# Test read function
echo "Testing read function..."
soroban contract invoke \
  --network ${NETWORK} \
  --id ${CONTRACT} \
  -- get_version || exit 1

# Test write function
echo "Testing write function..."
soroban contract invoke \
  --network ${NETWORK} \
  --id ${CONTRACT} \
  -- test_write || exit 1

# Check state
echo "Verifying state..."
soroban contract invoke \
  --network ${NETWORK} \
  --id ${CONTRACT} \
  -- verify_state || exit 1

echo "Verification passed"
```

### 6.2 Monitoring

**Monitor After Upgrade:**

```bash
#!/bin/bash
# monitor-upgrade.sh

set -euo pipefail

NETWORK="${1:-testnet}"
CONTRACT="${2}"
DURATION="${3:-3600}" # 1 hour

echo "Monitoring contract for ${DURATION} seconds"

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))

while [ $(date +%s) -lt ${END_TIME} ]; do
    # Check health
    if ! soroban contract invoke \
        --network ${NETWORK} \
        --id ${CONTRACT} \
        -- health_check > /dev/null 2>&1; then
        echo "ERROR: Health check failed"
        exit 1
    fi

    # Check metrics
    echo "$(date): Contract healthy"

    sleep 60
done

echo "Monitoring completed successfully"
```

---

## 7. Best Practices

### 7.1 Upgrade Best Practices

1. **Always test on testnet first**
   - Deploy to testnet
   - Run full test suite
   - Verify state migration
   - Test rollback procedure

2. **Use proxy pattern for most upgrades**
   - Preserves contract address
   - Seamless for users
   - Easier rollback

3. **Document all changes**
   - What changed
   - Why it changed
   - Migration steps
   - Rollback procedure

4. **Communicate with users**
   - Announce upgrade in advance
   - Explain impact
   - Provide migration guide if needed
   - Be available for support

5. **Have rollback plan**
   - Test rollback on testnet
   - Document rollback steps
   - Keep previous implementation available
   - Be ready to execute quickly

6. **Monitor after upgrade**
   - Watch metrics closely
   - Check for errors
   - Verify performance
   - Monitor for 24 hours minimum

### 7.2 State Migration Best Practices

1. **Backup state before migration**
   - Export state before upgrade
   - Store backup securely
   - Verify backup integrity

2. **Test migration thoroughly**
   - Test on testnet first
   - Verify all data migrated
   - Check data integrity
   - Test dependent contracts

3. **Use incremental migration for large datasets**
   - Process in batches
   - Monitor progress
   - Allow rollback during migration
   - Minimize downtime

4. **Validate migrated data**
   - Verify record counts
   - Spot-check data values
   - Test business logic
   - Compare with original

### 7.3 Rollback Best Practices

1. **Keep previous implementation available**
   - Don't delete old WASM
   - Store implementation addresses
   - Document rollback procedure

2. **Test rollback procedure**
   - Practice on testnet
   - Time the rollback
   - Verify state after rollback
   - Document any issues

3. **Have clear rollback criteria**
   - Define what triggers rollback
   - Set error thresholds
   - Establish decision process
   - Communicate criteria to team

4. **Execute rollback quickly**
   - Have procedure ready
   - Minimize decision time
   - Execute without hesitation
   - Communicate immediately

---

## 8. Upgrade Checklist

### 8.1 Pre-Upgrade

- [ ] Code review completed
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Migration plan documented
- [ ] Rollback plan documented
- [ ] State backup created
- [ ] Staging deployment successful
- [ ] Smoke tests passed
- [ ] Monitoring dashboards prepared
- [ ] Communication plan ready
- [ ] Team trained on procedure

### 8.2 During Upgrade

- [ ] Execute upgrade procedure
- [ ] Verify upgrade successful
- [ ] Monitor contract health
- [ ] Check dependent contracts
- [ ] Verify state integrity
- [ ] Test all functions
- [ ] Monitor error rates
- [ ] Check performance metrics

### 8.3 Post-Upgrade

- [ ] Verify all functionality
- [ ] Check state integrity
- [ ] Monitor for 24 hours
- [ ] Analyze metrics
- [ ] Gather user feedback
- [ ] Document lessons learned
- [ ] Update documentation
- [ ] Archive upgrade artifacts

---

## 9. References

- [Soroban Documentation](https://soroban.stellar.org/)
- [Stellar Smart Contracts](https://developers.stellar.org/docs/smart-contracts)
- [Contract Deployment Guide](../getting-started/DEPLOYMENT.md)
- [Testing Guide](../testing/TESTING.md)
- [Security Best Practices](../security/SECURITY.md)
