use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events, Ledger, MockAuth, MockAuthInvoke},
    Address, Env, IntoVal, String,
};

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
        fee_collector: Address::generate(&env),
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

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: agent.clone(),
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 10,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    let events = env.events().all();
    assert_eq!(events.len(), 1);
    // Event structure: (contract_id, topics, data)
    // Topics now include: ["agr_created", tenant, landlord]
    let event = events.last().unwrap();
    assert_eq!(event.1.len(), 3); // 3 topics: event name + tenant + landlord
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

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: Some(agent.clone()),
        terms: AgreementTerms {
            monthly_rent: 1500,
            security_deposit: 3000,
            start_date: 1000,
            end_date: 2000,
            agent_commission_rate: 5,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });
}

#[test]
fn test_create_agreement_without_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "AGREEMENT_NO_AGENT");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1200,
            security_deposit: 2400,
            start_date: 500,
            end_date: 1500,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });
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

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: -100,
            security_deposit: 1000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_zero_monthly_rent_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "ZERO_RENT");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 0,
            security_deposit: 1000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });
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

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 200,
            end_date: 100,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_backdated_agreement_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "BACKDATED");

    // Set ledger timestamp to a known value
    env.ledger().with_mut(|li| {
        li.timestamp = 1000000;
    });

    // Try to create agreement with start_date more than 1 day in the past
    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 900000,
            end_date: 2000000,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });
}

#[test]
fn test_agreement_within_grace_period_accepted() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "GRACE_PERIOD");

    // Set ledger timestamp to a known value
    env.ledger().with_mut(|li| {
        li.timestamp = 1000000;
    });

    // Create agreement with start_date within grace period (less than 1 day ago)
    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 950000,
            end_date: 2000000,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(client.has_agreement(&agreement_id));
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

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });
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

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 101,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });
}

fn create_pending_agreement(
    env: &Env,
    client: &ContractClient,
    agreement_id: &str,
    tenant: &Address,
    landlord: &Address,
) {
    client.create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, agreement_id).clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

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

    client.create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, agreement_id).clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

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

    client.create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, agreement_id).clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

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
fn test_submit_agreement_success() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "SUBMIT_001");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    let agreement_before = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement_before.status, AgreementStatus::Draft);

    client.submit_agreement(&landlord, &agreement_id);

    let agreement_after = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement_after.status, AgreementStatus::Pending);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn test_submit_agreement_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let landlord = Address::generate(&env);

    client.submit_agreement(&landlord, &String::from_str(&env, "NONEXISTENT"));
}

#[test]
#[should_panic(expected = "Error(Contract, #18)")]
fn test_submit_agreement_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let non_landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "SUBMIT_UNAUTH");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.submit_agreement(&non_landlord, &agreement_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn test_submit_agreement_invalid_state() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = "SUBMIT_INVALID";
    create_pending_agreement(&env, &client, agreement_id, &tenant, &landlord);

    client.submit_agreement(&landlord, &String::from_str(&env, agreement_id));
}

#[test]
fn test_cancel_agreement_success_draft() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "CANCEL_DRAFT");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.cancel_agreement(&landlord, &agreement_id);

    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.status, AgreementStatus::Cancelled);
}

#[test]
fn test_cancel_agreement_success_pending() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = "CANCEL_PENDING";
    create_pending_agreement(&env, &client, agreement_id, &tenant, &landlord);

    client.cancel_agreement(&landlord, &String::from_str(&env, agreement_id));

    let agreement = client
        .get_agreement(&String::from_str(&env, agreement_id))
        .unwrap();
    assert_eq!(agreement.status, AgreementStatus::Cancelled);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn test_cancel_agreement_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let landlord = Address::generate(&env);

    client.cancel_agreement(&landlord, &String::from_str(&env, "NONEXISTENT"));
}

#[test]
#[should_panic(expected = "Error(Contract, #18)")]
fn test_cancel_agreement_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let non_landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "CANCEL_UNAUTH");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.cancel_agreement(&non_landlord, &agreement_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn test_cancel_agreement_invalid_state() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = "CANCEL_INVALID";
    create_pending_agreement(&env, &client, agreement_id, &tenant, &landlord);

    client.sign_agreement(&tenant, &String::from_str(&env, agreement_id));

    // Status is now Active

    client.cancel_agreement(&landlord, &String::from_str(&env, agreement_id));
}

#[test]
fn test_get_agreement() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "GET_001");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

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

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

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

    client.create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "COUNT_001").clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert_eq!(client.get_agreement_count(), 1);

    client.create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "COUNT_002").clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env).clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert_eq!(client.get_agreement_count(), 2);
}

use proptest::prelude::*;

proptest! {
    #[test]
    fn test_fuzz_create_agreement_parameters(
        monthly_rent in -10000i128..10000i128,
        security_deposit in -10000i128..10000i128,
        start_date in 0u64..10000u64,
        end_date in 0u64..10000u64,
        agent_commission_rate in 0u32..200u32
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let client = create_contract(&env);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);
        let payment_token = Address::generate(&env);
        let agreement_id = String::from_str(&env, "FUZZ_AGREEMENT");

        // Disable panic catching since we expect some combinations to fail
        let result = client.try_create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: monthly_rent,
            security_deposit: security_deposit,
            start_date: start_date,
            end_date: end_date,
            agent_commission_rate: agent_commission_rate,
        },
        payment_token: payment_token.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

        let is_valid_rent = monthly_rent > 0;
        let is_valid_deposit = security_deposit >= 0;
        let is_valid_dates = start_date < end_date;
        let is_valid_commission = agent_commission_rate <= 100;

        let should_succeed = is_valid_rent && is_valid_deposit && is_valid_dates && is_valid_commission;

        if should_succeed {
            prop_assert!(result.is_ok());
        } else {
            prop_assert!(result.is_err());
        }
    }
}

#[test]
fn test_contract_paused_operations() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let config = Config {
        fee_bps: 100,
        fee_collector: fee_collector.clone(),
        paused: false,
    };
    client.initialize(&admin, &config);

    client.pause(&String::from_str(&env, "incident response"));

    assert!(client.is_paused());

    let state = client.get_state().unwrap();
    assert!(state.config.paused);

    env.as_contract(&client.address, || {
        let pause_state: PauseState = env
            .storage()
            .instance()
            .get(&storage::DataKey::PauseState)
            .unwrap();

        assert!(pause_state.is_paused);
        assert_eq!(pause_state.paused_by, admin);
        assert_eq!(
            pause_state.pause_reason,
            String::from_str(&env, "incident response")
        );
    });

    let res = client.try_create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "agreement-paused").clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 500,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 10,
        },
        payment_token: payment_token.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });
    assert_eq!(res, Err(Ok(RentalError::ContractPaused)));

    client.unpause();
    assert!(!client.is_paused());

    let agreement_id_str = "agreement-active";
    let agreement_id = String::from_str(&env, agreement_id_str);
    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 500,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 10,
        },
        payment_token: payment_token.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    let mut agreement = client.get_agreement(&agreement_id).unwrap();
    agreement.status = AgreementStatus::Pending;

    env.as_contract(&client.address, || {
        env.storage().persistent().set(
            &storage::DataKey::Agreement(agreement_id.clone()),
            &agreement,
        );
    });

    client.pause(&String::from_str(&env, "second incident"));

    let res_sign = client.try_sign_agreement(&tenant, &agreement_id);
    assert_eq!(res_sign, Err(Ok(RentalError::ContractPaused)));

    client.unpause();
    let res_sign_success = client.try_sign_agreement(&tenant, &agreement_id);
    assert!(res_sign_success.is_ok());
}

#[test]
fn test_pause_unpause_events_emitted() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(&env),
        paused: false,
    };

    client.initialize(&admin, &config);

    let pause_res = client.try_pause(&String::from_str(&env, "security patching"));
    assert!(pause_res.is_ok());
    let events_after_pause = env.events().all();
    assert_eq!(events_after_pause.len(), 1);

    let unpause_res = client.try_unpause();
    assert!(unpause_res.is_ok());
    let events_after_unpause = env.events().all();
    assert_eq!(events_after_unpause.len(), 1);
}

#[test]
fn test_pause_double_call_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(&env),
        paused: false,
    };

    client.initialize(&admin, &config);
    client.pause(&String::from_str(&env, "maintenance"));

    let result = client.try_pause(&String::from_str(&env, "maintenance again"));
    assert_eq!(result, Err(Ok(RentalError::AlreadyPaused)));
}

#[test]
fn test_unpause_when_not_paused_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(&env),
        paused: false,
    };

    client.initialize(&admin, &config);
    let result = client.try_unpause();
    assert_eq!(result, Err(Ok(RentalError::NotPaused)));
}

#[test]
#[should_panic]
fn test_pause_unauthorized() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    initialize_contract_state(&env, &client, &admin);

    let attacker = Address::generate(&env);
    let reason = String::from_str(&env, "malicious pause");

    client
        .mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "pause",
                args: (reason.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .pause(&reason);
}

#[test]
#[should_panic]
fn test_unpause_unauthorized() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    initialize_contract_state(&env, &client, &admin);
    let reason = String::from_str(&env, "maintenance");
    client
        .mock_auths(&[MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "pause",
                args: (reason.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .pause(&reason);

    let attacker = Address::generate(&env);

    client
        .mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "unpause",
                args: ().into_val(&env),
                sub_invokes: &[],
            },
        }])
        .unpause();
}
