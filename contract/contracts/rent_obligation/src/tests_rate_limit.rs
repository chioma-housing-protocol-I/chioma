use crate::rate_limit;
use crate::storage::DataKey;
use crate::types::RateLimitConfig;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env,
};

use crate::TokenizedRentObligationContract;

fn setup() -> (Env, Address, Address) {
    let env = Env::default();
    let contract_id = env.register(TokenizedRentObligationContract, ());
    let user = Address::generate(&env);
    (env, contract_id, user)
}

fn seed_config(env: &Env, contract_id: &Address, config: &RateLimitConfig) {
    env.as_contract(contract_id, || {
        env.storage()
            .persistent()
            .set(&DataKey::RateLimitConfig, config);
    });
}

#[test]
fn test_rate_limit_config_default() {
    let (env, contract_id, _user) = setup();
    let config = env.as_contract(&contract_id, || rate_limit::get_rate_limit_config(&env));
    assert_eq!(config.max_calls_per_block, 10);
    assert_eq!(config.max_calls_per_user_per_day, 100);
    assert_eq!(config.cooldown_blocks, 0);
}

#[test]
fn test_check_rate_limit_within_limit() {
    let (env, contract_id, user) = setup();
    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 10,
            max_calls_per_user_per_day: 5,
            cooldown_blocks: 0,
        },
    );
    for _ in 0..3 {
        let result = env.as_contract(&contract_id, || {
            rate_limit::check_rate_limit(&env, &user, "mint_obligation")
        });
        assert!(result.is_ok());
    }
}

#[test]
fn test_check_rate_limit_exceed_block() {
    let (env, contract_id, _user) = setup();
    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 2,
            max_calls_per_user_per_day: 100,
            cooldown_blocks: 0,
        },
    );
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    let r1 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user1, "mint_obligation")
    });
    assert!(r1.is_ok());

    let r2 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user2, "mint_obligation")
    });
    assert!(r2.is_ok());

    let r3 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user3, "mint_obligation")
    });
    assert!(r3.is_err());
}

#[test]
fn test_check_rate_limit_exceed_daily() {
    let (env, contract_id, user) = setup();
    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 100,
            max_calls_per_user_per_day: 2,
            cooldown_blocks: 0,
        },
    );

    let r1 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "mint_obligation")
    });
    assert!(r1.is_ok());

    env.ledger().with_mut(|li| li.sequence_number += 1);

    let r2 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "mint_obligation")
    });
    assert!(r2.is_ok());

    env.ledger().with_mut(|li| li.sequence_number += 1);

    let r3 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "mint_obligation")
    });
    assert!(r3.is_err());
}

#[test]
fn test_check_rate_limit_cooldown() {
    let (env, contract_id, user) = setup();
    env.ledger().with_mut(|li| li.sequence_number = 1);
    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 100,
            max_calls_per_user_per_day: 100,
            cooldown_blocks: 10,
        },
    );

    let r1 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "mint_obligation")
    });
    assert!(r1.is_ok());

    let r2 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "mint_obligation")
    });
    assert!(r2.is_err());

    env.ledger().with_mut(|li| li.sequence_number += 10);

    let r3 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "mint_obligation")
    });
    assert!(r3.is_ok());
}
