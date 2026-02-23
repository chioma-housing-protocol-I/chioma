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
