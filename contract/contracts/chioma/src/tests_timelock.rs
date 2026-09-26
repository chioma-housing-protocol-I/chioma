use crate::{
    errors::RentalError,
    types::{Config, TimelockActionType},
    Contract, ContractClient,
};
use soroban_sdk::{
    testutils::Address as _, testutils::Events as _, testutils::Ledger as _, Address, Bytes, Env,
    String,
};

// ─── Minimum delays (seconds) – must match timelock.rs constants ──────────────
const MIN_DELAY_UPDATE_ADMIN: u64 = 7 * 24 * 60 * 60;
const MIN_DELAY_UPDATE_CONFIG: u64 = 3 * 24 * 60 * 60;
const MIN_DELAY_UPDATE_RATES: u64 = 2 * 24 * 60 * 60;
const MIN_DELAY_PAUSE: u64 = 24 * 60 * 60;
const MIN_DELAY_UNPAUSE: u64 = 60 * 60;

fn setup() -> (Env, ContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    client.initialize(
        &admin,
        &Config {
            fee_bps: 100,
            fee_collector,
            paused: false,
        },
    );

    (env, client, admin)
}

// ─── Queue Action Tests ───────────────────────────────────────────────────────

#[test]
fn test_queue_action_success() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let result = client.try_queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateConfig,
        &target,
        &data,
        &MIN_DELAY_UPDATE_CONFIG,
    );
    assert!(result.is_ok());

    // Action count should be 1
    assert_eq!(client.get_timelock_action_count(), 1);
}

#[test]
fn test_queue_all_action_types() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let cases: &[(TimelockActionType, u64)] = &[
        (TimelockActionType::UpdateAdmin, MIN_DELAY_UPDATE_ADMIN),
        (TimelockActionType::UpdateConfig, MIN_DELAY_UPDATE_CONFIG),
        (TimelockActionType::UpdateRates, MIN_DELAY_UPDATE_RATES),
        (TimelockActionType::PauseContract, MIN_DELAY_PAUSE),
        (TimelockActionType::UnpauseContract, MIN_DELAY_UNPAUSE),
    ];

    for (action_type, delay) in cases {
        let result = client.try_queue_timelock_action(&admin, action_type, &target, &data, delay);
        assert!(result.is_ok(), "queue failed for {action_type:?}");
    }

    assert_eq!(client.get_timelock_action_count(), 5);
}

#[test]
fn test_queue_delay_too_short_rejected() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    // 1 second below the minimum for UpdateAdmin
    let result = client.try_queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateAdmin,
        &target,
        &data,
        &(MIN_DELAY_UPDATE_ADMIN - 1),
    );
    assert_eq!(result, Err(Ok(RentalError::TimelockDelayTooShort)));
}

#[test]
fn test_queue_requires_admin() {
    let (env, client, _admin) = setup();

    let non_admin = Address::generate(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let result = client.try_queue_timelock_action(
        &non_admin,
        &TimelockActionType::UpdateConfig,
        &target,
        &data,
        &MIN_DELAY_UPDATE_CONFIG,
    );
    assert_eq!(result, Err(Ok(RentalError::Unauthorized)));
}

// ─── Get Action Tests ─────────────────────────────────────────────────────────

#[test]
fn test_get_action_after_queue() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateRates,
        &target,
        &data,
        &MIN_DELAY_UPDATE_RATES,
    );

    let action = client.get_timelock_action(&action_id);
    assert_eq!(action.id, action_id);
    assert!(!action.executed);
    assert!(!action.cancelled);
    assert!(action.eta > env.ledger().timestamp());
}

#[test]
fn test_get_action_not_found() {
    let (_env, client, _admin) = setup();

    let fake_id = String::from_str(&_env, "nonexistent");
    let result = client.try_get_timelock_action(&fake_id);
    assert_eq!(result, Err(Ok(RentalError::TimelockNotFound)));
}

// ─── Execute Action Tests ─────────────────────────────────────────────────────

#[test]
fn test_execute_before_eta_fails() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateConfig,
        &target,
        &data,
        &MIN_DELAY_UPDATE_CONFIG,
    );

    // ETA not reached yet
    let result = client.try_execute_timelock_action(&admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::TimelockEtaNotReached)));
}

#[test]
fn test_execute_after_eta_succeeds() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateConfig,
        &target,
        &data,
        &MIN_DELAY_UPDATE_CONFIG,
    );

    // Advance ledger time past ETA
    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_CONFIG + 1;
    });

    let result = client.try_execute_timelock_action(&admin, &action_id);
    assert!(result.is_ok());

    // Action is now marked executed
    let action = client.get_timelock_action(&action_id);
    assert!(action.executed);
    assert!(!action.cancelled);
}

#[test]
fn test_execute_already_executed_fails() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateConfig,
        &target,
        &data,
        &MIN_DELAY_UPDATE_CONFIG,
    );

    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_CONFIG + 1;
    });

    client.execute_timelock_action(&admin, &action_id);

    // Attempt to execute a second time
    let result = client.try_execute_timelock_action(&admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::TimelockAlreadyExecuted)));
}

#[test]
fn test_execute_cancelled_action_fails() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateConfig,
        &target,
        &data,
        &MIN_DELAY_UPDATE_CONFIG,
    );

    // Cancel first
    client.cancel_timelock_action(&admin, &action_id);

    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_CONFIG + 1;
    });

    let result = client.try_execute_timelock_action(&admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::TimelockAlreadyCancelled)));
}

// ─── Cancel Action Tests ──────────────────────────────────────────────────────

#[test]
fn test_cancel_action_success() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::PauseContract,
        &target,
        &data,
        &MIN_DELAY_PAUSE,
    );

    let result = client.try_cancel_timelock_action(&admin, &action_id);
    assert!(result.is_ok());

    let action = client.get_timelock_action(&action_id);
    assert!(action.cancelled);
    assert!(!action.executed);
}

#[test]
fn test_cancel_requires_admin() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::PauseContract,
        &target,
        &data,
        &MIN_DELAY_PAUSE,
    );

    let non_admin = Address::generate(&env);
    let result = client.try_cancel_timelock_action(&non_admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::Unauthorized)));
}

#[test]
fn test_cancel_already_cancelled_fails() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::PauseContract,
        &target,
        &data,
        &MIN_DELAY_PAUSE,
    );

    client.cancel_timelock_action(&admin, &action_id);

    let result = client.try_cancel_timelock_action(&admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::TimelockAlreadyCancelled)));
}

#[test]
fn test_cancel_executed_action_fails() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UnpauseContract,
        &target,
        &data,
        &MIN_DELAY_UNPAUSE,
    );

    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UNPAUSE + 1;
    });

    client.execute_timelock_action(&admin, &action_id);

    let result = client.try_cancel_timelock_action(&admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::TimelockAlreadyExecuted)));
}

// ─── Active Actions List Tests ────────────────────────────────────────────────

#[test]
fn test_active_actions_tracking() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    assert_eq!(client.get_active_timelock_actions().len(), 0);

    let id1 = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateConfig,
        &target,
        &data,
        &MIN_DELAY_UPDATE_CONFIG,
    );
    assert_eq!(client.get_active_timelock_actions().len(), 1);

    let id2 = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateRates,
        &target,
        &data,
        &MIN_DELAY_UPDATE_RATES,
    );
    assert_eq!(client.get_active_timelock_actions().len(), 2);

    // Cancel id1 – active list shrinks
    client.cancel_timelock_action(&admin, &id1);
    assert_eq!(client.get_active_timelock_actions().len(), 1);

    // Execute id2 – active list reaches zero
    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_RATES + 1;
    });
    client.execute_timelock_action(&admin, &id2);
    assert_eq!(client.get_active_timelock_actions().len(), 0);
}

// ─── Edge Case Tests ──────────────────────────────────────────────────────────

#[test]
fn test_exact_minimum_delay_accepted() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    // Exactly at the minimum should succeed
    let result = client.try_queue_timelock_action(
        &admin,
        &TimelockActionType::UnpauseContract,
        &target,
        &data,
        &MIN_DELAY_UNPAUSE,
    );
    assert!(result.is_ok());
}

#[test]
fn test_execute_at_exact_eta() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UnpauseContract,
        &target,
        &data,
        &MIN_DELAY_UNPAUSE,
    );

    // Advance to exactly ETA
    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UNPAUSE;
    });

    let result = client.try_execute_timelock_action(&admin, &action_id);
    assert!(result.is_ok());
}

// ─── Two-Step Admin Transfer Tests (accept_admin_transfer) ───────────────────
//
// #1688: admin rotation is a two-step propose/accept flow gated by the
// existing UpdateAdmin timelock action. `queue_timelock_action` (the
// current admin) proposes; `accept_admin_transfer` (the proposed new admin)
// must independently consent once the delay elapses before the rotation
// actually takes effect.

#[test]
fn test_admin_transfer_requires_new_admin_acceptance() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateAdmin,
        &new_admin,
        &data,
        &MIN_DELAY_UPDATE_ADMIN,
    );

    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_ADMIN + 1;
    });

    // Admin is unchanged until the proposed new admin accepts.
    let state = client.get_state().unwrap();
    assert_eq!(state.admin, admin);

    let result = client.try_accept_admin_transfer(&new_admin, &action_id);
    assert!(result.is_ok());

    let state = client.get_state().unwrap();
    assert_eq!(state.admin, new_admin);

    let action = client.get_timelock_action(&action_id);
    assert!(action.executed);
}

#[test]
fn test_admin_transfer_rejects_wrong_caller() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);
    let impostor = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateAdmin,
        &new_admin,
        &data,
        &MIN_DELAY_UPDATE_ADMIN,
    );

    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_ADMIN + 1;
    });

    // Neither the current admin nor a third party can accept on the
    // proposed new admin's behalf — only `new_admin` itself can.
    let result = client.try_accept_admin_transfer(&admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::Unauthorized)));

    let result = client.try_accept_admin_transfer(&impostor, &action_id);
    assert_eq!(result, Err(Ok(RentalError::Unauthorized)));

    // Rejected attempts leave the admin and the action untouched.
    let state = client.get_state().unwrap();
    assert_eq!(state.admin, admin);
    let action = client.get_timelock_action(&action_id);
    assert!(!action.executed);
}

#[test]
fn test_admin_transfer_before_eta_fails() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateAdmin,
        &new_admin,
        &data,
        &MIN_DELAY_UPDATE_ADMIN,
    );

    // ETA not reached yet, even though the correct caller is accepting.
    let result = client.try_accept_admin_transfer(&new_admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::TimelockEtaNotReached)));
}

#[test]
fn test_admin_transfer_pending_is_cancellable() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateAdmin,
        &new_admin,
        &data,
        &MIN_DELAY_UPDATE_ADMIN,
    );

    // Current admin cancels the proposal before it is accepted.
    let result = client.try_cancel_timelock_action(&admin, &action_id);
    assert!(result.is_ok());

    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_ADMIN + 1;
    });

    // The proposed new admin can no longer accept a cancelled proposal.
    let result = client.try_accept_admin_transfer(&new_admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::TimelockAlreadyCancelled)));

    let state = client.get_state().unwrap();
    assert_eq!(state.admin, admin);
}

#[test]
fn test_admin_transfer_cannot_be_accepted_twice() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateAdmin,
        &new_admin,
        &data,
        &MIN_DELAY_UPDATE_ADMIN,
    );

    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_ADMIN + 1;
    });

    client.accept_admin_transfer(&new_admin, &action_id);

    let result = client.try_accept_admin_transfer(&new_admin, &action_id);
    assert_eq!(result, Err(Ok(RentalError::TimelockAlreadyExecuted)));
}

#[test]
fn test_accept_admin_transfer_rejects_non_update_admin_action() {
    let (env, client, admin) = setup();

    let target = Address::generate(&env);
    let data = Bytes::new(&env);

    // A non-UpdateAdmin action (e.g. UpdateConfig) cannot be "accepted" as
    // an admin transfer, even by its own target address.
    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateConfig,
        &target,
        &data,
        &MIN_DELAY_UPDATE_CONFIG,
    );

    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_CONFIG + 1;
    });

    let result = client.try_accept_admin_transfer(&target, &action_id);
    assert_eq!(result, Err(Ok(RentalError::InvalidState)));
}

#[test]
fn test_admin_transfer_emits_expected_events() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);
    let data = Bytes::new(&env);

    let action_id = client.queue_timelock_action(
        &admin,
        &TimelockActionType::UpdateAdmin,
        &new_admin,
        &data,
        &MIN_DELAY_UPDATE_ADMIN,
    );

    env.ledger().with_mut(|li| {
        li.timestamp += MIN_DELAY_UPDATE_ADMIN + 1;
    });

    let events_before = env.events().all().len();
    client.accept_admin_transfer(&new_admin, &action_id);
    let events_after = env.events().all();

    // accept_admin_transfer publishes both admin_transfer_accepted and the
    // shared timelock_executed event.
    assert!(
        events_after.len() > events_before,
        "expected new events after accept_admin_transfer: before={}, after={}",
        events_before,
        events_after.len()
    );
}
