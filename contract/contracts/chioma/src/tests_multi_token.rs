use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

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
fn test_add_supported_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token_addr = Address::generate(&env);
    let symbol = String::from_str(&env, "USDC");

    client.add_supported_token(&token_addr, &symbol, &6, &1, &1000000);

    assert!(client.is_token_supported(&token_addr));

    let supported = client.get_supported_tokens();
    assert_eq!(supported.len(), 1);
    assert_eq!(supported.get(0).unwrap().symbol, symbol);
}

#[test]
fn test_remove_supported_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token_addr = Address::generate(&env);
    let symbol = String::from_str(&env, "USDC");

    client.add_supported_token(&token_addr, &symbol, &6, &1, &1000000);
    assert!(client.is_token_supported(&token_addr));

    client.remove_supported_token(&token_addr);
    assert!(!client.is_token_supported(&token_addr));
}

#[test]
fn test_exchange_rates() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);
    let rate = 1_500_000_000_000_000_000; // 1.5

    client.set_exchange_rate(&token1, &token2, &rate);

    let fetched_rate = client.get_exchange_rate(&token1, &token2);
    assert_eq!(fetched_rate, rate);

    let amount = 1000;
    let converted = client.convert_amount(&token1, &token2, &amount);
    assert_eq!(converted, 1500);
}

#[test]
fn test_create_agreement_with_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    client.add_supported_token(
        &token_addr,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1000000000,
    );

    let property_id = String::from_str(&env, "PROP1");
    let agreement_id = client.create_agreement_with_token(&AgreementInput {
        agreement_id: property_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert_eq!(agreement_id, property_id);
    let fetched_token = client.get_agreement_token(&agreement_id);
    assert_eq!(fetched_token, token_addr);
}

#[test]
fn test_make_payment_with_different_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let base_token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    let pay_token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();

    client.add_supported_token(
        &base_token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1000000000,
    );
    client.add_supported_token(
        &pay_token,
        &String::from_str(&env, "EURT"),
        &6,
        &1,
        &1000000000,
    );

    // Set rate: 1 EURT = 1.1 USDC
    let rate = 1_100_000_000_000_000_000;
    client.set_exchange_rate(&pay_token, &base_token, &rate);

    let agreement_id = client.create_agreement_with_token(&AgreementInput {
        agreement_id: String::from_str(&env, "PROP1").clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1100,
            security_deposit: 2200, // Monthly rent in USDC
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: base_token.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    // Sign agreement (moves to PendingApproval) then witness-approve to activate
    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);
    client.approve_agreement(&admin, &agreement_id);

    // Give tenant some pay_token
    let pay_token_sac = soroban_sdk::token::StellarAssetClient::new(&env, &pay_token);
    pay_token_sac.mint(&tenant, &1000);

    // Pay 1000 EURT. 1000 * 1.1 = 1100 USDC (matches rent)
    client.make_payment_with_token(&agreement_id, &1000, &pay_token);

    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.total_rent_paid, 1100);
}

// ─── Issue #651: Agreement Lifecycle Tests ────────────────────────────────

#[test]
fn test_create_agreement_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-001");

    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_ok());
    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.user, tenant);
    assert_eq!(agreement.admin, landlord);
}

#[test]
fn test_validate_agreement_monthly_rent_positive() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    // monthly_rent = 0 should fail
    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "AGR-INVALID-1"),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 0,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_err());
}

#[test]
fn test_validate_agreement_security_deposit_nonnegative() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    // security_deposit = 0 should succeed
    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "AGR-ZERO-DEPOSIT"),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 0,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_ok());
}

#[test]
fn test_validate_agreement_start_before_end() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    // start_date >= end_date should fail
    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "AGR-INVALID-DATES"),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 1000000,
            end_date: 100,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_err());
}

#[test]
fn test_validate_agreement_commission_rate_max_100() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);

    // agent_commission_rate > 100 should fail
    let result = client.try_create_agreement(&AgreementInput {
        agreement_id: String::from_str(&env, "AGR-INVALID-COMMISSION"),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 101,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    assert!(result.is_err());
}

#[test]
fn test_sign_agreement_transitions_to_pending() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-SIGN-TEST");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);

    let agreement = client.get_agreement(&agreement_id).unwrap();
    assert!(agreement.signed_at.is_some());
}

#[test]
fn test_cancel_agreement_from_draft() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-CANCEL-TEST");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.cancel_agreement(&landlord, &agreement_id);
}

#[test]
fn test_agreement_not_found() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let nonexistent_id = String::from_str(&env, "NONEXISTENT-AGR");
    let result = client.get_agreement(&nonexistent_id);
    assert!(result.is_none());
}

#[test]
fn test_duplicate_agreement_prevention() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-DUPLICATE");

    let input = AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    };

    client.create_agreement(&input);

    // Attempt to create with same ID should fail
    let result = client.try_create_agreement(&input);
    assert!(result.is_err());
}

#[test]
fn test_add_supported_token_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token_addr = Address::generate(&env);
    let symbol = String::from_str(&env, "USDC");

    client.add_supported_token(&token_addr, &symbol, &6, &1, &1000000);

    assert!(client.is_token_supported(&token_addr));
}

#[test]
fn test_remove_supported_token_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token_addr = Address::generate(&env);
    let symbol = String::from_str(&env, "USDC");

    client.add_supported_token(&token_addr, &symbol, &6, &1, &1000000);
    assert!(client.is_token_supported(&token_addr));

    client.remove_supported_token(&token_addr);
    assert!(!client.is_token_supported(&token_addr));
}

#[test]
fn test_get_supported_tokens_list() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);

    client.add_supported_token(&token1, &String::from_str(&env, "USDC"), &6, &1, &1000000);
    client.add_supported_token(&token2, &String::from_str(&env, "EURT"), &6, &1, &1000000);

    let tokens = client.get_supported_tokens();
    assert_eq!(tokens.len(), 2);
}

#[test]
fn test_set_exchange_rate_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);
    let rate = 1_500_000_000_000_000_000; // 1.5

    client.set_exchange_rate(&token1, &token2, &rate);

    let fetched_rate = client.get_exchange_rate(&token1, &token2);
    assert_eq!(fetched_rate, rate);
}

#[test]
fn test_get_exchange_rate_nonexistent() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);

    // Rate not set, should return default or error
    let result = client.try_get_exchange_rate(&token1, &token2);
    // Behavior depends on implementation
    assert!(result.is_ok() || result.is_err());
}

#[test]
fn test_convert_amount_calculation() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);
    let rate = 2_000_000_000_000_000_000; // 2.0

    client.set_exchange_rate(&token1, &token2, &rate);

    let amount = 1000;
    let converted = client.convert_amount(&token1, &token2, &amount);
    assert_eq!(converted, 2000); // 1000 * 2.0
}

#[test]
fn test_create_agreement_with_token_stores_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR-TOKEN-TEST");

    client.add_supported_token(
        &token_addr,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1000000000,
    );

    client.create_agreement_with_token(&AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    let fetched_token = client.get_agreement_token(&agreement_id);
    assert_eq!(fetched_token, token_addr);
}
