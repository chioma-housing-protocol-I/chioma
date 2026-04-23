extern crate alloc;

use crate::errors::RentalError;
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
    admin: &Address,
    user: &Address,
    payment_token: &Address,
) -> AgreementInput {
    AgreementInput {
        agreement_id: String::from_str(env, agreement_id),
        admin: admin.clone(),
        user: user.clone(),
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

// ============================================================
// Task 2: Config & Boundary Tests
// ============================================================

#[test]
fn test_get_rate_limit_config_default() {
    let (_env, client, _admin, _) = create_contract();

    let config = client.get_rate_limit_config();
    assert_eq!(config.max_calls_per_block, 10);
    assert_eq!(config.max_calls_per_user_per_day, 100);
    assert_eq!(config.cooldown_blocks, 0);
}

#[test]
fn test_get_block_call_count() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let tenant1 = Address::generate(&env);
    let tenant2 = Address::generate(&env);
    let tenant3 = Address::generate(&env);

    client.create_agreement(&make_input(
        &env,
        "ag1",
        &landlord,
        &tenant1,
        &payment_token,
    ));
    client.create_agreement(&make_input(
        &env,
        "ag2",
        &landlord,
        &tenant2,
        &payment_token,
    ));
    client.create_agreement(&make_input(
        &env,
        "ag3",
        &landlord,
        &tenant3,
        &payment_token,
    ));

    let count = client.get_block_call_count(&String::from_str(&env, "create_agreement"));
    assert_eq!(count, 3);
}

#[test]
fn test_rate_limit_exact_boundary() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 5,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    for i in 0..5 {
        let result = client.try_create_agreement(&make_input(
            &env,
            &alloc::format!("agreement_{i}"),
            &landlord,
            &tenant,
            &payment_token,
        ));
        assert!(result.is_ok());
    }

    let result = client.try_create_agreement(&make_input(
        &env,
        "agreement_5",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result.is_err());
}

#[test]
fn test_rate_limit_single_call() {
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

    let result1 = client.try_create_agreement(&make_input(
        &env,
        "agreement1",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result1.is_ok());

    let result2 = client.try_create_agreement(&make_input(
        &env,
        "agreement2",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result2.is_err());
}

#[test]
fn test_rate_limit_zero_daily_limit() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 0,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let result = client.try_create_agreement(&make_input(
        &env,
        "agreement1",
        &landlord,
        &tenant,
        &payment_token,
    ));
    assert!(result.is_err());
}

// ============================================================
// Task 3: Per-Function & Multi-User Tests
// ============================================================

#[test]
fn test_rate_limit_per_function() {
    let (env, client, _admin, _) = create_contract();

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

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));
    client.create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));

    let result =
        client.try_create_agreement(&make_input(&env, "ag3", &landlord, &tenant, &payment_token));
    assert!(result.is_err());

    let other_count =
        client.get_user_call_count(&tenant, &String::from_str(&env, "some_other_function"));
    assert!(other_count.is_none());
}

#[test]
fn test_rate_limit_independent_users() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 2,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let tenant_a = Address::generate(&env);
    let tenant_b = Address::generate(&env);

    client.create_agreement(&make_input(
        &env,
        "ag1",
        &landlord,
        &tenant_a,
        &payment_token,
    ));
    client.create_agreement(&make_input(
        &env,
        "ag2",
        &landlord,
        &tenant_a,
        &payment_token,
    ));

    let result_a = client.try_create_agreement(&make_input(
        &env,
        "ag3",
        &landlord,
        &tenant_a,
        &payment_token,
    ));
    assert!(result_a.is_err());

    let result_b = client.try_create_agreement(&make_input(
        &env,
        "ag4",
        &landlord,
        &tenant_b,
        &payment_token,
    ));
    assert!(result_b.is_ok());
}

#[test]
fn test_rate_limit_block_limit_multi_user() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 2,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let tenant_a = Address::generate(&env);
    let tenant_b = Address::generate(&env);
    let tenant_c = Address::generate(&env);

    let result_a = client.try_create_agreement(&make_input(
        &env,
        "ag1",
        &landlord,
        &tenant_a,
        &payment_token,
    ));
    assert!(result_a.is_ok());

    let result_b = client.try_create_agreement(&make_input(
        &env,
        "ag2",
        &landlord,
        &tenant_b,
        &payment_token,
    ));
    assert!(result_b.is_ok());

    let result_c = client.try_create_agreement(&make_input(
        &env,
        "ag3",
        &landlord,
        &tenant_c,
        &payment_token,
    ));
    assert!(result_c.is_err());
}

#[test]
fn test_rate_limit_user_call_count_per_user() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let tenant_a = Address::generate(&env);
    let tenant_b = Address::generate(&env);

    client.create_agreement(&make_input(
        &env,
        "ag1",
        &landlord,
        &tenant_a,
        &payment_token,
    ));
    client.create_agreement(&make_input(
        &env,
        "ag2",
        &landlord,
        &tenant_a,
        &payment_token,
    ));
    client.create_agreement(&make_input(
        &env,
        "ag3",
        &landlord,
        &tenant_a,
        &payment_token,
    ));

    client.create_agreement(&make_input(
        &env,
        "ag4",
        &landlord,
        &tenant_b,
        &payment_token,
    ));

    let fn_name = String::from_str(&env, "create_agreement");

    let count_a = client.get_user_call_count(&tenant_a, &fn_name).unwrap();
    assert_eq!(count_a.daily_count, 3);
    assert_eq!(count_a.call_count, 3);

    let count_b = client.get_user_call_count(&tenant_b, &fn_name).unwrap();
    assert_eq!(count_b.daily_count, 1);
    assert_eq!(count_b.call_count, 1);
}

// ============================================================
// Task 4: Cooldown Tests
// ============================================================

#[test]
fn test_rate_limit_cooldown_partial_wait() {
    let (env, client, _admin, _) = create_contract();

    env.mock_all_auths();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 10,
    };
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let result1 =
        client.try_create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));
    assert!(result1.is_ok());

    env.ledger().with_mut(|li| li.sequence_number += 5);

    let result2 =
        client.try_create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));
    assert!(result2.is_err());

    env.ledger().with_mut(|li| li.sequence_number += 5);

    let result3 =
        client.try_create_agreement(&make_input(&env, "ag3", &landlord, &tenant, &payment_token));
    assert!(result3.is_ok());
}

#[test]
fn test_rate_limit_cooldown_exact_boundary() {
    let (env, client, _admin, _) = create_contract();

    env.mock_all_auths();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 10,
    };
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));

    env.ledger().with_mut(|li| li.sequence_number += 10);

    let result =
        client.try_create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));
    assert!(result.is_ok());
}

#[test]
fn test_rate_limit_multiple_cooldowns() {
    let (env, client, _admin, _) = create_contract();

    env.mock_all_auths();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 5,
    };
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));

    env.ledger().with_mut(|li| li.sequence_number += 5);
    client.create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));

    let result =
        client.try_create_agreement(&make_input(&env, "ag3", &landlord, &tenant, &payment_token));
    assert!(result.is_err());

    env.ledger().with_mut(|li| li.sequence_number += 5);
    let result2 =
        client.try_create_agreement(&make_input(&env, "ag4", &landlord, &tenant, &payment_token));
    assert!(result2.is_ok());
}

// ============================================================
// Task 5: Daily Reset & Admin Reset Tests
// ============================================================

#[test]
fn test_rate_limit_reset_exact_boundary() {
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

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));

    env.ledger().with_mut(|li| li.sequence_number += 17280);

    let result =
        client.try_create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));
    assert!(result.is_ok());
}

#[test]
fn test_rate_limit_reset_partial_day() {
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

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));

    env.ledger().with_mut(|li| li.sequence_number += 17279);

    let result =
        client.try_create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));
    assert!(result.is_err());
}

#[test]
fn test_reset_user_rate_limit_counter_zero() {
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
    let fn_name = String::from_str(&env, "create_agreement");

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));
    client.create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));

    let count = client.get_user_call_count(&tenant, &fn_name);
    assert!(count.is_some());
    assert_eq!(count.unwrap().call_count, 2);

    client.reset_user_rate_limit(&tenant, &fn_name);

    let count_after = client.get_user_call_count(&tenant, &fn_name);
    assert!(count_after.is_none());
}

#[test]
fn test_reset_user_rate_limit_independent() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let tenant_a = Address::generate(&env);
    let tenant_b = Address::generate(&env);
    let fn_name = String::from_str(&env, "create_agreement");

    client.create_agreement(&make_input(
        &env,
        "ag1",
        &landlord,
        &tenant_a,
        &payment_token,
    ));
    client.create_agreement(&make_input(
        &env,
        "ag2",
        &landlord,
        &tenant_b,
        &payment_token,
    ));

    client.reset_user_rate_limit(&tenant_a, &fn_name);

    assert!(client.get_user_call_count(&tenant_a, &fn_name).is_none());

    let count_b = client.get_user_call_count(&tenant_b, &fn_name).unwrap();
    assert_eq!(count_b.call_count, 1);
}

// ============================================================
// Task 6: Integration Tests
// ============================================================

#[test]
fn test_rate_limit_error_logged_on_exceed() {
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

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));

    let result =
        client.try_create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));
    assert!(result.is_err());

    let op = String::from_str(&env, "create_agreement");
    let details = String::from_str(&env, "Daily rate limit exceeded for user");
    client.log_error(&RentalError::RateLimitExceeded, &op, &details);

    let logs = client.get_error_logs(&10);
    assert_eq!(logs.len(), 1);
    assert_eq!(logs.get(0).unwrap().error_code, 801);
    assert_eq!(logs.get(0).unwrap().operation, op);
}

#[test]
fn test_rate_limit_across_blocks() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 2,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let tenant1 = Address::generate(&env);
    let tenant2 = Address::generate(&env);
    let tenant3 = Address::generate(&env);

    client.create_agreement(&make_input(
        &env,
        "ag1",
        &landlord,
        &tenant1,
        &payment_token,
    ));
    client.create_agreement(&make_input(
        &env,
        "ag2",
        &landlord,
        &tenant2,
        &payment_token,
    ));

    let result = client.try_create_agreement(&make_input(
        &env,
        "ag3",
        &landlord,
        &tenant3,
        &payment_token,
    ));
    assert!(result.is_err());

    env.ledger().with_mut(|li| li.sequence_number += 1);

    let result2 = client.try_create_agreement(&make_input(
        &env,
        "ag4",
        &landlord,
        &tenant3,
        &payment_token,
    ));
    assert!(result2.is_ok());
}

#[test]
fn test_rate_limit_with_pause_state() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 3,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));

    client.pause(&String::from_str(&env, "maintenance"));

    let paused_result =
        client.try_create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));
    assert!(paused_result.is_err());

    client.unpause();

    let result2 =
        client.try_create_agreement(&make_input(&env, "ag3", &landlord, &tenant, &payment_token));
    assert!(result2.is_ok());

    let result3 =
        client.try_create_agreement(&make_input(&env, "ag4", &landlord, &tenant, &payment_token));
    assert!(result3.is_ok());

    let result4 =
        client.try_create_agreement(&make_input(&env, "ag5", &landlord, &tenant, &payment_token));
    assert!(result4.is_err());
}

#[test]
fn test_rate_limit_cooldown_and_daily_combined() {
    let (env, client, _admin, _) = create_contract();

    env.mock_all_auths();

    let config = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 3,
        cooldown_blocks: 5,
    };
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));

    let result =
        client.try_create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));
    assert!(result.is_err());

    env.ledger().with_mut(|li| li.sequence_number += 5);
    client.create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));

    env.ledger().with_mut(|li| li.sequence_number += 5);
    client.create_agreement(&make_input(&env, "ag3", &landlord, &tenant, &payment_token));

    env.ledger().with_mut(|li| li.sequence_number += 5);
    let result4 =
        client.try_create_agreement(&make_input(&env, "ag4", &landlord, &tenant, &payment_token));
    assert!(result4.is_err());
}

// ============================================================
// Task 7: Edge Cases
// ============================================================

#[test]
fn test_rate_limit_high_limit() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 1000,
        max_calls_per_user_per_day: 1000,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    for i in 0..50 {
        let result = client.try_create_agreement(&make_input(
            &env,
            &alloc::format!("agreement_{i}"),
            &landlord,
            &tenant,
            &payment_token,
        ));
        assert!(result.is_ok());
    }
}

#[test]
fn test_rate_limit_zero_block_limit() {
    let (env, client, _admin, _) = create_contract();

    let config = RateLimitConfig {
        max_calls_per_block: 0,
        max_calls_per_user_per_day: 100,
        cooldown_blocks: 0,
    };

    env.mock_all_auths();
    client.set_rate_limit_config(&config);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    let result =
        client.try_create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));
    assert!(result.is_err());
}

#[test]
fn test_rate_limit_config_update() {
    let (env, client, _admin, _) = create_contract();

    env.mock_all_auths();

    let config1 = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 5,
        cooldown_blocks: 0,
    };
    client.set_rate_limit_config(&config1);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let payment_token = Address::generate(&env);

    client.create_agreement(&make_input(&env, "ag1", &landlord, &tenant, &payment_token));
    client.create_agreement(&make_input(&env, "ag2", &landlord, &tenant, &payment_token));
    client.create_agreement(&make_input(&env, "ag3", &landlord, &tenant, &payment_token));

    let config2 = RateLimitConfig {
        max_calls_per_block: 100,
        max_calls_per_user_per_day: 3,
        cooldown_blocks: 0,
    };
    client.set_rate_limit_config(&config2);

    let result =
        client.try_create_agreement(&make_input(&env, "ag4", &landlord, &tenant, &payment_token));
    assert!(result.is_err());
}
