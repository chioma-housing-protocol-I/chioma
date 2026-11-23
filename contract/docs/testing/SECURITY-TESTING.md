# Smart Contract Security Testing

This guide covers security testing practices for Chioma's Soroban smart contracts on the Stellar blockchain.

## Overview

Smart contract security testing focuses on:
1. **Access Control** - Ensuring only authorized addresses can execute privileged functions
2. **Financial Security** - Protecting funds in escrow and payment contracts
3. **Reentrancy Protection** - Preventing recursive call attacks
4. **Integer Overflow/Underflow** - Safe arithmetic operations
5. **State Consistency** - Maintaining invariants across operations
6. **Upgrade Security** - Safe contract upgrade mechanisms

## Test Structure

Security tests are written in Rust using the Soroban SDK test framework and are located alongside contract code in `src/tests.rs` files.

### Test Organization

```
contract/contracts/
├── escrow/
│   └── src/
│       ├── lib.rs
│       └── tests.rs          # Security tests for escrow contract
├── payment/
│   └── src/
│       ├── lib.rs
│       └── tests.rs          # Security tests for payment contract
└── rent_obligation/
    └── src/
        ├── lib.rs
        └── tests.rs          # Security tests for rent obligation NFT
```

## Access Control Testing

### Admin-Only Function Tests

Test that privileged functions reject unauthorized callers:

```rust
#[test]
fn test_only_admin_can_pause_contract() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let unauthorized_user = Address::generate(&env);
    
    // Initialize with admin
    client.initialize(&admin);
    
    // Admin can pause
    client.pause(&admin);
    
    // Unauthorized user cannot pause
    let result = client.try_pause(&unauthorized_user);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::Unauthorized
    );
}
```

### Role-Based Access Tests

Test that different roles have appropriate permissions:

```rust
#[test]
fn test_landlord_cannot_modify_agent_commission() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentContract);
    let client = PaymentContractClient::new(&env, &contract_id);
    
    let landlord = Address::generate(&env);
    let agent = Address::generate(&env);
    
    client.initialize(&landlord, &agent, &10); // 10% commission
    
    // Landlord cannot change commission
    let result = client.try_set_commission(&landlord, &15);
    assert!(result.is_err());
}
```

### Ownership Transfer Tests

Test secure ownership transfer mechanisms:

```rust
#[test]
fn test_two_step_ownership_transfer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PropertyContract);
    let client = PropertyContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let third_party = Address::generate(&env);
    
    client.initialize(&owner);
    
    // Step 1: Current owner proposes transfer
    client.transfer_ownership(&owner, &new_owner);
    
    // Third party cannot accept
    let result = client.try_accept_ownership(&third_party);
    assert!(result.is_err());
    
    // Step 2: New owner accepts
    client.accept_ownership(&new_owner);
    
    // Verify ownership changed
    assert_eq!(client.get_owner(), new_owner);
}
```

## Financial Security Testing

### Escrow Fund Protection

Test that escrowed funds cannot be withdrawn prematurely:

```rust
#[test]
fn test_funds_locked_until_conditions_met() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);
    
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_client = create_test_token(&env);
    
    // Deposit security deposit
    let amount: i128 = 1000;
    token_client.mint(&tenant, &amount);
    client.deposit(&tenant, &amount);
    
    // Landlord cannot withdraw before lease ends
    let result = client.try_withdraw(&landlord);
    assert!(result.is_err());
    
    // Cannot withdraw until both parties agree
    let result = client.try_release_funds(&tenant);
    assert!(result.is_err());
}
```

### Payment Atomicity Tests

Test that partial payments cannot occur:

```rust
#[test]
fn test_payment_is_atomic() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentContract);
    let client = PaymentContractClient::new(&env, &contract_id);
    
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agent = Address::generate(&env);
    
    let token_client = create_test_token(&env);
    let amount: i128 = 1000;
    
    // If payment fails, neither landlord nor agent should receive funds
    token_client.mint(&tenant, &amount);
    
    // Simulate failure condition
    let result = client.try_pay_rent(
        &tenant,
        &amount,
        &landlord,
        &agent,
        &10, // 10% commission
    );
    
    if result.is_err() {
        // Verify no partial transfer occurred
        assert_eq!(token_client.balance(&landlord), 0);
        assert_eq!(token_client.balance(&agent), 0);
        assert_eq!(token_client.balance(&tenant), amount); // Full refund
    }
}
```

### Integer Overflow Protection

Test safe arithmetic operations:

```rust
#[test]
fn test_commission_calculation_safe_from_overflow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentContract);
    let client = PaymentContractClient::new(&env, &contract_id);
    
    // Test with maximum safe values
    let max_amount = i128::MAX;
    let commission_rate = 100; // 100%
    
    let result = client.try_calculate_commission(&max_amount, &commission_rate);
    
    // Should handle safely without panic
    assert!(result.is_ok() || matches!(result.unwrap_err().unwrap(), Error::Overflow));
}
```

## Reentrancy Protection

### Cross-Contract Call Security

Test protection against reentrancy attacks:

```rust
#[test]
fn test_reentrancy_protection() {
    let env = Env::default();
    let escrow_id = env.register_contract(None, EscrowContract);
    let escrow_client = EscrowContractClient::new(&env, &escrow_id);
    
    // Create malicious contract that attempts reentrancy
    let malicious_id = env.register_contract(None, MaliciousContract);
    let malicious_client = MaliciousContractClient::new(&env, &malicious_id);
    
    let token_client = create_test_token(&env);
    let amount: i128 = 1000;
    
    // Fund malicious contract
    token_client.mint(&malicious_id.into(), &amount);
    
    // Malicious contract deposits and attempts to withdraw during callback
    let result = malicious_client.try_attack_escrow(&escrow_id, &amount);
    
    // Reentrancy should be blocked
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::ReentrancyGuard
    );
}
```

### State Lock Pattern Tests

Test that critical operations cannot be interrupted:

```rust
#[test]
fn test_state_locked_during_transfer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);
    
    // Begin transfer
    client.begin_transfer(&sender, &amount);
    
    // Cannot begin another transfer while one is in progress
    let result = client.try_begin_transfer(&sender, &amount);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::OperationInProgress
    );
}
```

## State Consistency Testing

### Invariant Tests

Test that contract invariants always hold:

```rust
#[test]
fn test_total_supply_matches_sum_of_balances() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RentObligationNFT);
    let client = RentObligationNFTClient::new(&env, &contract_id);
    
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    
    // Mint tokens
    client.mint(&owner1, &1);
    client.mint(&owner2, &1);
    
    // Transfer token
    client.transfer(&owner1, &owner2, &0); // Transfer token ID 0
    
    // Invariant: total supply should equal sum of individual balances
    let total_supply = client.total_supply();
    let balance1 = client.balance_of(&owner1);
    let balance2 = client.balance_of(&owner2);
    
    assert_eq!(total_supply, balance1 + balance2);
}
```

### Multi-Party Consistency

Test consistency across multiple participants:

```rust
#[test]
fn test_escrow_balance_consistency() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);
    
    let tenant1 = Address::generate(&env);
    let tenant2 = Address::generate(&env);
    let token_client = create_test_token(&env);
    
    // Multiple deposits
    token_client.mint(&tenant1, &1000);
    token_client.mint(&tenant2, &2000);
    
    client.deposit(&tenant1, &1000);
    client.deposit(&tenant2, &2000);
    
    // Contract balance should equal sum of deposits
    let contract_balance = token_client.balance(&contract_id.into());
    assert_eq!(contract_balance, 3000);
    
    let tenant1_balance = client.get_deposit(&tenant1);
    let tenant2_balance = client.get_deposit(&tenant2);
    assert_eq!(contract_balance, tenant1_balance + tenant2_balance);
}
```

## Upgrade Security Testing

### Upgrade Authorization

Test that only authorized addresses can upgrade contracts:

```rust
#[test]
fn test_only_admin_can_upgrade() {
    let env = Env::default();
    let contract_id = env.register_contract(None, UpgradeableContract);
    let client = UpgradeableContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let unauthorized = Address::generate(&env);
    
    client.initialize(&admin);
    
    // Create new version
    let new_wasm_hash = BytesN::from_array(&env, &[1u8; 32]);
    
    // Unauthorized user cannot upgrade
    let result = client.try_upgrade(&unauthorized, &new_wasm_hash);
    assert!(result.is_err());
    
    // Admin can upgrade
    let result = client.try_upgrade(&admin, &new_wasm_hash);
    assert!(result.is_ok());
}
```

### Storage Preservation

Test that upgrades preserve contract storage:

```rust
#[test]
fn test_storage_persists_after_upgrade() {
    let env = Env::default();
    let contract_id = env.register_contract(None, UpgradeableContractV1);
    let client_v1 = UpgradeableContractV1Client::new(&env, &contract_id);
    
    // Store data in V1
    client_v1.set_value(&42);
    assert_eq!(client_v1.get_value(), 42);
    
    // Upgrade to V2
    let new_wasm_hash = BytesN::from_array(&env, &[2u8; 32]);
    env.deployer().update_current_contract_wasm(&new_wasm_hash);
    
    // Create V2 client for upgraded contract
    let client_v2 = UpgradeableContractV2Client::new(&env, &contract_id);
    
    // Verify data persisted
    assert_eq!(client_v2.get_value(), 42);
}
```

## Running Security Tests

```bash
# Run all contract tests
cd contract
cargo test

# Run tests for specific contract
cargo test --package escrow

# Run with verbose output
cargo test -- --nocapture

# Run with leak detection
RUSTFLAGS="-Z sanitizer=leak" cargo test

# Generate coverage report (requires tarpaulin)
cargo tarpaulin --out Html
```

## Security Test Checklist

Before deploying any contract, ensure tests cover:

- [ ] All admin/privileged functions reject unauthorized access
- [ ] Funds cannot be withdrawn without proper authorization
- [ ] All arithmetic operations are overflow-safe
- [ ] State transitions maintain invariants
- [ ] Reentrancy attacks are prevented
- [ ] Zero-amount transfers are handled
- [ ] Invalid addresses are rejected
- [ ] Upgrade mechanisms are secure
- [ ] Edge cases (max values, empty inputs) are tested
- [ ] Multi-party interactions maintain consistency

## Common Security Patterns

### Authorization Macro

```rust
macro_rules! require_auth {
    ($env:expr, $address:expr) => {
        $address.require_auth();
    };
}
```

### Safe Math Operations

```rust
fn safe_add(a: i128, b: i128) -> Result<i128, Error> {
    a.checked_add(b).ok_or(Error::Overflow)
}

fn safe_sub(a: i128, b: i128) -> Result<i128, Error> {
    a.checked_sub(b).ok_or(Error::Underflow)
}
```

### Reentrancy Guard

```rust
pub fn with_lock<F, T>(env: &Env, f: F) -> Result<T, Error>
where
    F: FnOnce() -> Result<T, Error>,
{
    if get_lock(env) {
        return Err(Error::ReentrancyGuard);
    }
    
    set_lock(env, true);
    let result = f();
    set_lock(env, false);
    
    result
}
```

## Audit Preparation

For external security audits, prepare:

1. **Test Coverage Report** - Run `cargo tarpaulin` to generate coverage
2. **Test Descriptions** - Document what each test verifies
3. **Known Limitations** - List any acknowledged security trade-offs
4. **Threat Model** - Document assumed attack vectors
5. **Deployment Procedures** - Document upgrade and initialization processes

## Further Reading

- [Soroban Security Best Practices](https://soroban.stellar.org/docs/learn/security)
- [Stellar Security Guide](https://developers.stellar.org/docs/learn/security)
- [Contract Testing Strategy](./TESTING-STRATEGY.md)
- [Integration Tests](./INTEGRATION-TESTS.md)
- [Debugging Tests](./DEBUGGING.md)

## Related Documentation

- Root project security: [../../SECURITY.md](../../SECURITY.md)
- Backend security testing: [../../docs/security-testing-guide.md](../../docs/security-testing-guide.md)
- Contract testing overview: [./TESTING-STRATEGY.md](./TESTING-STRATEGY.md)
