use crate::types::{AgreementInput, AgreementTerms, Config, RateLimitConfig};
use crate::{Contract, ContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String, Vec,
};

fn create_contract() -> (Env, ContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    let config = Config {
        fee_bps: 1000,
        fee_collector: fee_collector.clone(),
        paused: false,
    };

    client.initialize(&admin, &config);

    (env, client, admin, fee_collector)
}

fn make_input(
    env: &Env,
    agreement_id: &str,
    landlord: &Address,
    tenant: &Address,
    payment_token: &Address,
) -> AgreementInput {
    AgreementInput {
        agreement_id: String::from_str(env, agreement_id),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 100_000,
            security_deposit: 10_000,
            start_date: 1000,
            end_date: 2000,
            agent_commission_rate: 5,
        },
        payment_token: payment_token.clone(),
        metadata_uri: String::from_str(env, ""),
        attributes: Vec::new(env),
    }
}

#[test]
fn test_rate_limit_config() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 5,
        max_calls_per_user_per_day: 50,
        cooldown_blocks: 2,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let retrieved_config = client.get_rate_limit_config();
    assert_eq!(retrieved_config.max_calls_per_block, 5);
    assert_eq!(retrieved_config.max_calls_per_user_per_day, 50);
    assert_eq!(retrieved_config.cooldown_blocks, 2);
}

#[test]
fn test_rate_limit_per_block() {
    let (env, client, _admin, _) = create_contract();

    // Set strict rate limit: max 2 calls per block
    let config = RateLimitConfig {
        max_calls_per_block: 2,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    // First call should succeed
    let result1 = client.try_create_agreement(&make_input(
        &env,
        "agreement1",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result1.is_ok());

    // Second call should succeed
    let tenant2 = Address::generate(&env);
    let result2 = client.try_create_agreement(&make_input(
        &env,
        "agreement2",
        &landlord,
        &tenant2,
        &payment_token,
    ));
    assert!(result2.is_ok());

    // Third call should fail due to per-block limit
    let tenant3 = Address::generate(&env);
    let result3 = client.try_create_agreement(&make_input(
        &env,
        "agreement3",
        &landlord,
        &tenant3,
        &payment_token,
    ));
    assert!(result3.is_err());
}

#[test]
fn test_rate_limit_per_user_per_day() {
    let (env, client, _admin, _) = create_contract();

    // Set rate limit: max 2 calls per user per day
    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 2,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    // First call should succeed
    let result1 = client.try_create_agreement(&make_input(
        &env,
        "agreement1",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result1.is_ok());

    // Second call should succeed
    let result2 = client.try_create_agreement(&make_input(
        &env,
        "agreement2",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result2.is_ok());

    // Third call should fail due to daily limit for same user
    let result3 = client.try_create_agreement(&make_input(
        &env,
        "agreement3",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result3.is_err());
}

#[test]
fn test_rate_limit_cooldown() {
    let (env, client, _admin, _) = create_contract();

    env.mock_all_auths();

    // Set cooldown: 10 blocks between calls
    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 10,
    };

    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    // First call should succeed
    let result1 = client.try_create_agreement(&make_input(
        &env,
        "agreement1",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result1.is_ok());

    // Advance by 5 blocks (not enough)
    env.ledger().with_mut(|li| {
        li.sequence_number += 5;
    });

    // Second call should fail due to cooldown
    let result2 = client.try_create_agreement(&make_input(
        &env,
        "agreement2",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result2.is_err());

    // Advance by 6 more blocks (total 11 blocks)
    env.ledger().with_mut(|li| {
        li.sequence_number += 6;
    });

    // Third call should succeed after cooldown
    let result3 = client.try_create_agreement(&make_input(
        &env,
        "agreement3",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result3.is_ok());
}

#[test]
fn test_rate_limit_daily_reset() {
    let (env, client, _admin, _) = create_contract();

    // Set rate limit: max 1 call per user per day
    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 1,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    // First call should succeed
    let result1 = client.try_create_agreement(&make_input(
        &env,
        "agreement1",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result1.is_ok());

    // Second call should fail
    let result2 = client.try_create_agreement(&make_input(
        &env,
        "agreement2",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result2.is_err());

    // Advance by 1 day worth of blocks (17280 blocks)
    env.ledger().with_mut(|li| {
        li.sequence_number += 17280;
    });

    // Third call should succeed after daily reset
    let result3 = client.try_create_agreement(&make_input(
        &env,
        "agreement3",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result3.is_ok());
}

#[test]
fn test_get_user_call_count() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    // Make a call
    client.create_agreement(&make_input(
        &env,
        "agreement1",
        &landlord,
        &tenant,
        &payment_token,
    ));

    // Check call count
    let call_count =
        client.get_user_call_count(&tenant, &String::from_str(&env, "create_agreement"));
    assert!(call_count.is_some());

    let count = call_count.unwrap();
    assert_eq!(count.user, tenant);
    assert_eq!(count.call_count, 1);
    assert_eq!(count.daily_count, 1);
}

#[test]
fn test_reset_user_rate_limit() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 1,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    // First call should succeed
    client.create_agreement(&make_input(
        &env,
        "agreement1",
        &landlord,
        &tenant,
        &payment_token,
    ));

    // Second call should fail
    let result = client.try_create_agreement(&make_input(
        &env,
        "agreement2",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result.is_err());

    // Admin resets rate limit for user
    client.reset_user_rate_limit(&tenant, &String::from_str(&env, "create_agreement"));

    // Third call should now succeed
    let result2 = client.try_create_agreement(&make_input(
        &env,
        "agreement3",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result2.is_ok());
}
