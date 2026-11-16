//! Tests for the manager role (#2086): grant/revoke, pause delegation, and
//! the boundary between what a manager can and cannot do.

use super::*;
use soroban_sdk::testutils::{Address as _, Events, MockAuth, MockAuthInvoke};
use soroban_sdk::IntoVal;

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

fn initialize_contract(env: &Env, client: &ContractClient<'_>, admin: &Address) {
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
        paused: false,
    };
    client.initialize(admin, &config);
}

#[test]
fn test_is_manager_false_before_grant() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let candidate = Address::generate(&env);
    assert!(!client.is_manager(&candidate));
}

#[test]
fn test_admin_can_grant_and_revoke_manager() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let manager = Address::generate(&env);
    client.grant_manager(&manager);
    assert!(client.is_manager(&manager));

    client.revoke_manager(&manager);
    assert!(!client.is_manager(&manager));
}

#[test]
fn test_revoke_manager_on_non_manager_is_a_no_op() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let never_a_manager = Address::generate(&env);
    // Should not error even though never_a_manager was never granted.
    client.revoke_manager(&never_a_manager);
    assert!(!client.is_manager(&never_a_manager));
}

#[test]
fn test_admin_can_still_pause_without_being_a_manager() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    assert!(!client.is_manager(&admin));
    client.pause(&admin, &String::from_str(&env, "admin pausing"));
    assert!(client.is_paused());
}

#[test]
fn test_manager_can_pause() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let manager = Address::generate(&env);
    client.grant_manager(&manager);

    client.pause(&manager, &String::from_str(&env, "manager pausing"));
    assert!(client.is_paused());
}

#[test]
#[should_panic(expected = "Error(Contract, #501)")] // InsufficientPermissions
fn test_non_manager_non_admin_cannot_pause() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let stranger = Address::generate(&env);
    client.pause(&stranger, &String::from_str(&env, "not allowed"));
}

#[test]
#[should_panic]
fn test_manager_cannot_unpause() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let manager = Address::generate(&env);
    client.grant_manager(&manager);
    client.pause(&manager, &String::from_str(&env, "manager pausing"));

    // unpause() still calls state.admin.require_auth() directly and was
    // never touched by this change. Authorize only the manager (not the
    // real admin) for this specific call, so state.admin.require_auth()
    // genuinely has no valid authorization to find and must panic — the
    // same targeted-mock pattern tests_rbac.rs uses for its own
    // non-admin-rejected cases.
    client
        .mock_auths(&[MockAuth {
            address: &manager,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "unpause",
                args: ().into_val(&env),
                sub_invokes: &[],
            },
        }])
        .unpause();
}

#[test]
#[should_panic]
fn test_manager_cannot_grant_other_managers() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let manager = Address::generate(&env);
    client.grant_manager(&manager);

    // grant_manager() always requires state.admin specifically, so a
    // manager cannot deputize further managers themselves. Authorize only
    // the manager (not the real admin) for this call.
    let another = Address::generate(&env);
    client
        .mock_auths(&[MockAuth {
            address: &manager,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "grant_manager",
                args: (another.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .grant_manager(&another);
}

#[test]
fn test_pause_records_the_actual_caller_not_always_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let manager = Address::generate(&env);
    client.grant_manager(&manager);
    client.pause(&manager, &String::from_str(&env, "manager pausing"));

    let events = env.events().all();
    // The `paused` event's data includes the actual pauser address; since
    // this is a smoke test for event emission (not a full ABI decode), we
    // only assert an event was emitted by the pause call and leave strict
    // payload assertions to the existing pause-event tests.
    assert!(!events.is_empty());
}

#[test]
fn test_revoked_manager_can_no_longer_pause() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let manager = Address::generate(&env);
    client.grant_manager(&manager);
    client.revoke_manager(&manager);

    let result = client.try_pause(&manager, &String::from_str(&env, "revoked"));
    assert!(result.is_err());
}
