use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events, Ledger, MockAuth, MockAuthInvoke},
    vec, Address, Env, IntoVal, String,
};

#[test]
fn test_hello() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let words = client.hello(&String::from_str(&env, "Dev"));
    assert_eq!(
        words,
        vec![
            &env,
            String::from_str(&env, "Hello"),
            String::from_str(&env, "Dev"),
        ]
    );
}

#[test]
fn test_successful_initialization() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    env.mock_all_auths();

    let config = Config {
        fee_bps: 100,
        fee_collector: fee_collector.clone(),
        paused: false,
    };

    let result = client.try_initialize(&admin, &config);
    assert!(result.is_ok());

    let state = client.get_state().unwrap();
    assert_eq!(state.admin, admin);
    assert_eq!(state.config.fee_bps, 100);
    assert_eq!(state.config.fee_collector, fee_collector);
    assert!(!state.config.paused);
    assert!(state.initialized);
}

#[test]
#[should_panic] // Should panic without auth
fn test_initialize_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    // mock_all_auths is NOT called here

    let config = Config {
        fee_bps: 100,
        fee_collector: fee_collector.clone(),
        paused: false,
    };

    client.initialize(&admin, &config);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_double_initialization_fails() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    env.mock_all_auths();

    let config = Config {
        fee_bps: 100,
        fee_collector: fee_collector.clone(),
        paused: false,
    };

    client.initialize(&admin, &config);

    client.initialize(&admin, &config);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_invalid_fee_bps() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    env.mock_all_auths();

    let config = Config {
        fee_bps: 10001,
        fee_collector,
        paused: false,
    };

    client.initialize(&admin, &config);
}

#[test]
fn test_initialize_fee_collector_no_auth_needed() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    let config = Config {
        fee_bps: 100,
        fee_collector: fee_collector.clone(),
        paused: false,
    };

    // ONLY admin authorizes here using MockAuth
    client
        .mock_auths(&[MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "initialize",
                args: (admin.clone(), config.clone()).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .initialize(&admin, &config);

    // This should NOT panic because we removed require_auth() for fee_collector
    let state = client.get_state().unwrap();
    assert_eq!(state.admin, admin);
}

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

fn initialize_contract_state(env: &Env, client: &ContractClient<'_>, admin: &Address) {
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
        paused: false,
    };
    client
        .mock_auths(&[MockAuth {
            address: admin,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "initialize",
                args: (admin.clone(), config.clone()).into_val(env),
                sub_invokes: &[],
            },
        }])
        .initialize(admin, &config);
}

#[test]
fn test_update_config_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let initial_config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(&env),
        paused: false,
    };
    client.initialize(&admin, &initial_config);

    let new_config = Config {
        fee_bps: 250,
        fee_collector: Address::generate(&env),
        paused: true,
    };

    client.update_config(&new_config);

    let updated_state = client.get_state().unwrap();
    assert_eq!(updated_state.config, new_config);
}

#[test]
#[should_panic]
fn test_update_config_unauthorized() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    initialize_contract_state(&env, &client, &admin);

    let attacker = Address::generate(&env);
    let new_config = Config {
        fee_bps: 300,
        fee_collector: Address::generate(&env),
        paused: false,
    };

    client
        .mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "update_config",
                args: (new_config.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .update_config(&new_config);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_update_config_invalid_fee_bps() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    initialize_contract_state(&env, &client, &admin);

    let bad_config = Config {
        fee_bps: 10_001,
        fee_collector: Address::generate(&env),
        paused: false,
    };

    client
        .mock_auths(&[MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "update_config",
                args: (bad_config.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .update_config(&bad_config);
}

#[test]
fn test_create_agreement_success() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agent = Some(Address::generate(&env));

    let agreement_id = String::from_str(&env, "AGREEMENT_001");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &agent,
        &1000,
        &2000,
        &100,
        &200,
        &10,
        &Address::generate(&env),
    );

    let events = env.events().all();
    assert_eq!(events.len(), 1);
    let event = events.last().unwrap();
    assert_eq!(event.1.len(), 1);
}

#[test]
fn test_create_agreement_with_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agent = Address::generate(&env);

    let agreement_id = String::from_str(&env, "AGREEMENT_WITH_AGENT");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &Some(agent.clone()),
        &1500,
        &3000,
        &1000,
        &2000,
        &5,
        &Address::generate(&env),
    );
}

#[test]
fn test_create_agreement_without_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "AGREEMENT_NO_AGENT");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1200,
        &2400,
        &500,
        &1500,
        &0,
        &Address::generate(&env),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_negative_rent_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "BAD_RENT");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &-100,
        &1000,
        &100,
        &200,
        &0,
        &Address::generate(&env),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_invalid_dates_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "BAD_DATES");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &200,
        &100,
        &0,
        &Address::generate(&env),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_duplicate_agreement_id() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "DUPLICATE_ID");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
        &Address::generate(&env),
    );

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
        &Address::generate(&env),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_invalid_commission_rate() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "BAD_COMMISSION");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &101,
        &Address::generate(&env),
    );
}

fn create_pending_agreement(
    env: &Env,
    client: &ContractClient,
    agreement_id: &str,
    tenant: &Address,
    landlord: &Address,
) {
    client.create_agreement(
        &String::from_str(env, agreement_id),
        landlord,
        tenant,
        &None,
        &1000,
        &2000,
        &100,
        &1000000,
        &0,
        &Address::generate(env),
    );

    let mut agreement = client
        .get_agreement(&String::from_str(env, agreement_id))
        .unwrap();
    agreement.status = AgreementStatus::Pending;

    env.as_contract(&client.address, || {
        env.storage().persistent().set(
            &storage::DataKey::Agreement(String::from_str(env, agreement_id)),
            &agreement,
        );
    });
}

#[test]
fn test_sign_agreement_success() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = "SIGN_001";
    create_pending_agreement(&env, &client, agreement_id, &tenant, &landlord);

    client.sign_agreement(&tenant, &String::from_str(&env, agreement_id));

    let agreement = client
        .get_agreement(&String::from_str(&env, agreement_id))
        .unwrap();
    assert_eq!(agreement.status, AgreementStatus::Active);
    assert!(agreement.signed_at.is_some());
    assert_eq!(agreement.tenant, tenant);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn test_sign_agreement_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);

    client.sign_agreement(&tenant, &String::from_str(&env, "NONEXISTENT"));
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_sign_agreement_not_tenant() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let impostor = Address::generate(&env);

    let agreement_id = "SIGN_002";
    create_pending_agreement(&env, &client, agreement_id, &tenant, &landlord);

    client.sign_agreement(&impostor, &String::from_str(&env, agreement_id));
}

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn test_sign_agreement_invalid_state() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = "SIGN_003";

    client.create_agreement(
        &String::from_str(&env, agreement_id),
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &1000000,
        &0,
        &Address::generate(&env),
    );

    client.sign_agreement(&tenant, &String::from_str(&env, agreement_id));
}

#[test]
#[should_panic(expected = "Error(Contract, #16)")]
fn test_sign_agreement_expired() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = "SIGN_004";

    client.create_agreement(
        &String::from_str(&env, agreement_id),
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
        &Address::generate(&env),
    );

    let mut agreement = client
        .get_agreement(&String::from_str(&env, agreement_id))
        .unwrap();
    agreement.status = AgreementStatus::Pending;

    env.as_contract(&client.address, || {
        env.storage().persistent().set(
            &storage::DataKey::Agreement(String::from_str(&env, agreement_id)),
            &agreement,
        );
    });

    env.ledger().with_mut(|li| li.timestamp = 300);

    client.sign_agreement(&tenant, &String::from_str(&env, agreement_id));
}

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn test_sign_agreement_already_signed() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = "SIGN_005";
    create_pending_agreement(&env, &client, agreement_id, &tenant, &landlord);

    client.sign_agreement(&tenant, &String::from_str(&env, agreement_id));

    client.sign_agreement(&tenant, &String::from_str(&env, agreement_id));
}

#[test]
fn test_sign_agreement_event_emission() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = "SIGN_006";
    create_pending_agreement(&env, &client, agreement_id, &tenant, &landlord);

    let events_before = env.events().all().len();

    client.sign_agreement(&tenant, &String::from_str(&env, agreement_id));

    let events_after = env.events().all();
    assert!(events_after.len() > events_before);
}

#[test]
fn test_get_agreement() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "GET_001");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
        &Address::generate(&env),
    );

    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.monthly_rent, 1000);
    assert_eq!(agreement.landlord, landlord);
    assert_eq!(agreement.tenant, tenant);
}

#[test]
fn test_has_agreement() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "HAS_001");

    assert!(!client.has_agreement(&agreement_id));

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
        &Address::generate(&env),
    );

    assert!(client.has_agreement(&agreement_id));
}

#[test]
fn test_get_agreement_count() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    assert_eq!(client.get_agreement_count(), 0);

    client.create_agreement(
        &String::from_str(&env, "COUNT_001"),
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
        &Address::generate(&env),
    );

    assert_eq!(client.get_agreement_count(), 1);

    client.create_agreement(
        &String::from_str(&env, "COUNT_002"),
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
        &Address::generate(&env),
    );

    assert_eq!(client.get_agreement_count(), 2);
}
