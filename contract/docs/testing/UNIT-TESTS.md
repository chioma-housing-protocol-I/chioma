# Unit Tests

## Standards

Unit tests should exercise one behavior at a time and make the expected contract state obvious. Prefer small setup helpers over long repeated arrange blocks.

## What to Test

- Initialization: succeeds once, stores admin/config, rejects repeated initialization.
- Authorization: `require_auth` paths for admin, owner, tenant, landlord, arbiter, and unrelated users.
- Validation: empty IDs, invalid amounts, duplicate records, missing records, invalid statuses, and boundary values.
- Storage helpers: all write and read functions, default values, and absence handling.
- Events: emitted for create, update, release, pause, unpause, dispute, and payment lifecycle actions.
- Errors: exact error variants, not only "it panics".

## Naming Convention

Use descriptive names with the expected behavior:

```rust
#[test]
fn release_escrow_rejects_unapproved_signer() {
    // ...
}
```

Recommended patterns:

- `function_succeeds_when_condition`
- `function_rejects_when_condition`
- `function_emits_event_when_condition`
- `function_updates_storage_when_condition`

## Structure

Use Arrange, Act, Assert in that order:

```rust
#[test]
fn create_profile_stores_profile_data() {
    let env = Env::default();
    env.mock_all_auths();
    let user = Address::generate(&env);
    let client = UserProfileContractClient::new(&env, &env.register(UserProfileContract, ()));

    client.create_profile(&user, &String::from_str(&env, "Ada"));

    let profile = client.get_profile(&user);
    assert_eq!(profile.name, String::from_str(&env, "Ada"));
}
```

## Mocking and Fixtures

- Use `Env::default()` for isolated test state.
- Use `env.mock_all_auths()` only when the test is not specifically validating authorization.
- Generate actors explicitly with names in setup helpers.
- Keep fixture data minimal; include only fields needed by the behavior under test.
- Avoid relying on test execution order or shared mutable state.

## Boundary Cases

Every numeric or time-sensitive function should test:

- Zero or minimum accepted value.
- Maximum realistic value.
- One below and one above important thresholds.
- Current ledger timestamp/block at, before, and after the boundary.

## Good Test Example

```rust
#[test]
fn pause_rejects_non_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let stranger = Address::generate(&env);
    let client = setup_initialized_contract(&env, &admin);

    env.mock_auths(&[MockAuth {
        address: &stranger,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "pause",
            args: vec![&env],
            sub_invokes: &[],
        },
    }]);

    assert_eq!(client.try_pause(), Err(Ok(ContractError::Unauthorized)));
}
```
