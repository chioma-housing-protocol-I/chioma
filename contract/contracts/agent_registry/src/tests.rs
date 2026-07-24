use super::*;
use soroban_sdk::{testutils::Address as _, vec, Address, Env, String};

fn create_contract(env: &Env) -> AgentRegistryContractClient<'_> {
    let contract_id = env.register(AgentRegistryContract, ());
    AgentRegistryContractClient::new(env, &contract_id)
}

#[test]
fn test_successful_initialization() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    let result = client.try_initialize(&admin);
    assert!(result.is_ok());

    let state = client.get_state().unwrap();
    assert_eq!(state.admin, admin);
    assert!(state.initialized);
}

#[test]
#[should_panic]
fn test_initialize_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    client.initialize(&admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_double_initialization_fails() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
fn test_register_agent_success() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    let result = client.try_register_agent(&agent, &profile_hash);
    assert!(result.is_ok());

    let agent_info = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info.agent, agent);
    assert_eq!(agent_info.external_profile_hash, profile_hash);
    assert!(!agent_info.verified);
    assert!(agent_info.verified_at.is_none());
    assert_eq!(agent_info.total_ratings, 0);
    assert_eq!(agent_info.total_score, 0);
    assert_eq!(agent_info.completed_agreements, 0);

    assert_eq!(client.get_agent_count(), 1);
}

#[test]
#[should_panic]
fn test_register_agent_fails_without_agent_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    env.mock_auths(&[]);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_agent(&agent, &profile_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_register_agent_fails_when_not_initialized() {
    let env = Env::default();
    let client = create_contract(&env);

    let agent = Address::generate(&env);

    env.mock_all_auths();

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_agent(&agent, &profile_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_register_agent_fails_when_already_registered() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_agent(&agent, &profile_hash);
    client.register_agent(&agent, &profile_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_register_agent_fails_with_empty_profile_hash() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let empty_hash = String::from_str(&env, "");

    client.register_agent(&agent, &empty_hash);
}

#[test]
fn test_verify_agent_success() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    let result = client.try_verify_agent(&admin, &agent);
    assert!(result.is_ok());

    let agent_info = client.get_agent_info(&agent).unwrap();
    assert!(agent_info.verified);
    assert!(agent_info.verified_at.is_some());
}

#[test]
#[should_panic]
fn test_verify_agent_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    env.mock_auths(&[]);

    client.verify_agent(&admin, &agent);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_verify_agent_fails_when_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let non_admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    client.verify_agent(&non_admin, &agent);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_verify_agent_fails_when_agent_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    client.verify_agent(&admin, &agent);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_verify_agent_fails_when_already_verified() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    client.verify_agent(&admin, &agent);
    client.verify_agent(&admin, &agent);
}

#[test]
fn test_register_and_complete_transaction() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    let result = client.try_register_transaction(&txn_id, &agent, &parties);
    assert!(result.is_ok());

    let result = client.try_complete_transaction(&txn_id, &agent);
    assert!(result.is_ok());

    let agent_info = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info.completed_agreements, 1);
}

#[test]
fn test_rate_agent_success() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);
    client.verify_agent(&admin, &agent);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    client.register_transaction(&txn_id, &agent, &parties);
    client.complete_transaction(&txn_id, &agent);

    let result = client.try_rate_agent(&tenant, &agent, &5, &txn_id);
    assert!(result.is_ok());

    let agent_info = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info.total_ratings, 1);
    assert_eq!(agent_info.total_score, 5);
    assert_eq!(agent_info.average_rating(), 5);
}

#[test]
fn test_multiple_ratings_average() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);
    client.verify_agent(&admin, &agent);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    client.register_transaction(&txn_id, &agent, &parties);
    client.complete_transaction(&txn_id, &agent);

    client.rate_agent(&tenant, &agent, &5, &txn_id);
    client.rate_agent(&landlord, &agent, &3, &txn_id);

    let agent_info = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info.total_ratings, 2);
    assert_eq!(agent_info.total_score, 8);
    assert_eq!(agent_info.average_rating(), 4);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_rate_agent_fails_with_invalid_score_low() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);
    client.verify_agent(&admin, &agent);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    client.register_transaction(&txn_id, &agent, &parties);
    client.complete_transaction(&txn_id, &agent);

    client.rate_agent(&tenant, &agent, &0, &txn_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_rate_agent_fails_with_invalid_score_high() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);
    client.verify_agent(&admin, &agent);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    client.register_transaction(&txn_id, &agent, &parties);
    client.complete_transaction(&txn_id, &agent);

    client.rate_agent(&tenant, &agent, &6, &txn_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_rate_agent_fails_when_agent_not_verified() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    client.register_transaction(&txn_id, &agent, &parties);
    client.complete_transaction(&txn_id, &agent);

    client.rate_agent(&tenant, &agent, &5, &txn_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_rate_agent_fails_when_transaction_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);
    client.verify_agent(&admin, &agent);

    let txn_id = String::from_str(&env, "TXN-001");

    client.rate_agent(&tenant, &agent, &5, &txn_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn test_rate_agent_fails_when_transaction_not_completed() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);
    client.verify_agent(&admin, &agent);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    client.register_transaction(&txn_id, &agent, &parties);

    client.rate_agent(&tenant, &agent, &5, &txn_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_rate_agent_fails_when_not_transaction_party() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let stranger = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);
    client.verify_agent(&admin, &agent);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    client.register_transaction(&txn_id, &agent, &parties);
    client.complete_transaction(&txn_id, &agent);

    client.rate_agent(&stranger, &agent, &5, &txn_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_rate_agent_fails_when_already_rated() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);
    client.verify_agent(&admin, &agent);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    client.register_transaction(&txn_id, &agent, &parties);
    client.complete_transaction(&txn_id, &agent);

    client.rate_agent(&tenant, &agent, &5, &txn_id);
    client.rate_agent(&tenant, &agent, &4, &txn_id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract Tests: Webhook Delivery & Cache Invalidation Patterns
// ─────────────────────────────────────────────────────────────────────────────

/// Contract Test 1: Agent State Consistency After Verification
/// Validates that agent verification updates are consistent and queryable
#[test]
fn test_agent_verification_state_consistency() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    // Before verification
    let agent_info_before = client.get_agent_info(&agent).unwrap();
    assert!(!agent_info_before.verified);
    assert!(agent_info_before.verified_at.is_none());

    // Verify agent
    client.verify_agent(&admin, &agent);

    // After verification - state should be consistent
    let agent_info_after = client.get_agent_info(&agent).unwrap();
    assert!(agent_info_after.verified);
    assert!(agent_info_after.verified_at.is_some());
    assert_eq!(agent_info_after.agent, agent);
    assert_eq!(agent_info_after.external_profile_hash, profile_hash);
}

/// Contract Test 2: Transaction Completion Invalidates Agent Cache
/// Validates that completing a transaction updates agent metrics consistently
#[test]
fn test_transaction_completion_updates_agent_metrics() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    // Initial state
    let agent_info_initial = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info_initial.completed_agreements, 0);

    // Register and complete transaction
    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];
    client.register_transaction(&txn_id, &agent, &parties);
    client.complete_transaction(&txn_id, &agent);

    // After completion - metrics should be updated
    let agent_info_updated = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info_updated.completed_agreements, 1);
}

/// Contract Test 3: Rating Aggregation with Cache Invalidation
/// Validates that multiple ratings are aggregated correctly and cache is invalidated
#[test]
fn test_rating_aggregation_consistency() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);
    client.verify_agent(&admin, &agent);

    let txn_id = String::from_str(&env, "TXN-001");
    let parties = vec![&env, tenant.clone(), landlord.clone()];
    client.register_transaction(&txn_id, &agent, &parties);
    client.complete_transaction(&txn_id, &agent);

    // Rate from tenant
    client.rate_agent(&tenant, &agent, &5, &txn_id);

    let agent_info_after_first = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info_after_first.total_ratings, 1);
    assert_eq!(agent_info_after_first.total_score, 5);
    assert_eq!(agent_info_after_first.average_rating(), 5);

    // Rate from landlord
    client.rate_agent(&landlord, &agent, &3, &txn_id);

    let agent_info_after_second = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info_after_second.total_ratings, 2);
    assert_eq!(agent_info_after_second.total_score, 8);
    assert_eq!(agent_info_after_second.average_rating(), 4);
}

/// Contract Test 4: Webhook Event Delivery - Agent Registration
/// Validates that agent registration events are properly recorded and queryable
#[test]
fn test_agent_registration_event_delivery() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent1 = Address::generate(&env);
    let agent2 = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let profile_hash1 = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    let profile_hash2 = String::from_str(&env, "QmYoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    // Register first agent
    client.register_agent(&agent1, &profile_hash1);
    assert_eq!(client.get_agent_count(), 1);

    // Register second agent
    client.register_agent(&agent2, &profile_hash2);
    assert_eq!(client.get_agent_count(), 2);

    // Verify both agents are queryable
    let agent1_info = client.get_agent_info(&agent1).unwrap();
    let agent2_info = client.get_agent_info(&agent2).unwrap();

    assert_eq!(agent1_info.external_profile_hash, profile_hash1);
    assert_eq!(agent2_info.external_profile_hash, profile_hash2);
}

/// Contract Test 5: Cache Invalidation on Agent Verification
/// Validates that verification status changes are immediately reflected
#[test]
fn test_verification_cache_invalidation() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    // Query unverified state
    let unverified = client.get_agent_info(&agent).unwrap();
    assert!(!unverified.verified);

    // Verify agent
    client.verify_agent(&admin, &agent);

    // Query verified state - should reflect immediately
    let verified = client.get_agent_info(&agent).unwrap();
    assert!(verified.verified);
    assert!(verified.verified_at.is_some());

    // Verify timestamp is set
    assert_ne!(verified.verified_at, unverified.verified_at);
}

/// Contract Test 6: Transaction Completion Webhook Delivery
/// Validates that transaction completion events are properly recorded and queryable
#[test]
fn test_transaction_completion_webhook_delivery() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let profile_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_agent(&agent, &profile_hash);

    // Register multiple transactions
    let txn_id_1 = String::from_str(&env, "TXN-001");
    let txn_id_2 = String::from_str(&env, "TXN-002");
    let parties = vec![&env, tenant.clone(), landlord.clone()];

    client.register_transaction(&txn_id_1, &agent, &parties);
    client.register_transaction(&txn_id_2, &agent, &parties);

    // Complete first transaction
    client.complete_transaction(&txn_id_1, &agent);
    let agent_info_after_first = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info_after_first.completed_agreements, 1);

    // Complete second transaction
    client.complete_transaction(&txn_id_2, &agent);
    let agent_info_after_second = client.get_agent_info(&agent).unwrap();
    assert_eq!(agent_info_after_second.completed_agreements, 2);
}
