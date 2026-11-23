use crate::rate_limit;
use crate::storage::DataKey;
use crate::types::RateLimitConfig;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env,
};

use crate::AgentRegistryContract;

fn setup() -> (Env, Address, Address) {
    let env = Env::default();
    let contract_id = env.register(AgentRegistryContract, ());
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
            rate_limit::check_rate_limit(&env, &user, "register_agent")
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
        rate_limit::check_rate_limit(&env, &user1, "register_agent")
    });
    assert!(r1.is_ok());

    let r2 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user2, "register_agent")
    });
    assert!(r2.is_ok());

    let r3 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user3, "register_agent")
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
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r1.is_ok());

    env.ledger().with_mut(|li| li.sequence_number += 1);

    let r2 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r2.is_ok());

    env.ledger().with_mut(|li| li.sequence_number += 1);

    let r3 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r3.is_err());
}

#[test]
fn test_check_rate_limit_cooldown() {
    let (env, contract_id, user) = setup();

    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 100,
            max_calls_per_user_per_day: 100,
            cooldown_blocks: 10,
        },
    );

    // Start at block 1 so last_call_block is nonzero after the first call
    env.ledger().with_mut(|li| li.sequence_number = 1);

    let r1 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r1.is_ok());

    // Same block => cooldown not met
    let r2 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r2.is_err());

    // Advance past cooldown
    env.ledger().with_mut(|li| li.sequence_number += 10);

    let r3 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r3.is_ok());
}

#[test]
fn test_rate_limit_reset_after_day_passes() {
    let (env, contract_id, user) = setup();

    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 100,
            max_calls_per_user_per_day: 3,
            cooldown_blocks: 0,
        },
    );

    // Use up daily limit
    for i in 0..3 {
        env.ledger().with_mut(|li| li.sequence_number += i * 10);
        let result = env.as_contract(&contract_id, || {
            rate_limit::check_rate_limit(&env, &user, "register_agent")
        });
        assert!(result.is_ok());
    }

    env.ledger().with_mut(|li| li.sequence_number += 1);

    // Should fail - daily limit reached
    let result = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(result.is_err());

    // Advance past 1 day (17280 blocks = 24 hours)
    env.ledger().with_mut(|li| li.sequence_number += 17280);

    // Should succeed - new day
    let result = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(result.is_ok());
}

#[test]
fn test_rate_limit_multiple_users_independent() {
    let (env, contract_id, _user) = setup();

    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 100,
            max_calls_per_user_per_day: 2,
            cooldown_blocks: 0,
        },
    );

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    // Each user should be able to make their own quota of calls
    for user in [&user1, &user2, &user3] {
        for i in 0..2 {
            env.ledger().with_mut(|li| li.sequence_number += i * 5);
            let result = env.as_contract(&contract_id, || {
                rate_limit::check_rate_limit(&env, user, "register_agent")
            });
            assert!(result.is_ok());
        }
    }

    // All users should now be at their limit
    env.ledger().with_mut(|li| li.sequence_number += 5);
    for user in [&user1, &user2, &user3] {
        let result = env.as_contract(&contract_id, || {
            rate_limit::check_rate_limit(&env, user, "register_agent")
        });
        assert!(result.is_err());
    }
}

#[test]
fn test_rate_limit_block_counter_resets_per_block() {
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

    // Fill up block 0
    for user in [&user1, &user2] {
        let result = env.as_contract(&contract_id, || {
            rate_limit::check_rate_limit(&env, user, "register_agent")
        });
        assert!(result.is_ok());
    }

    // Block 0 is full
    let user3 = Address::generate(&env);
    let result = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user3, "register_agent")
    });
    assert!(result.is_err());

    // Move to next block
    env.ledger().with_mut(|li| li.sequence_number += 1);

    // Should be able to make calls again in new block
    let result = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user3, "register_agent")
    });
    assert!(result.is_ok());

    let user4 = Address::generate(&env);
    let result = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user4, "register_agent")
    });
    assert!(result.is_ok());
}

#[test]
fn test_rate_limit_zero_limits_allows_unlimited() {
    let (env, contract_id, user) = setup();

    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 0,
            max_calls_per_user_per_day: 0,
            cooldown_blocks: 0,
        },
    );

    // With zero limits, should allow unlimited calls
    for i in 0..50 {
        if i % 10 == 0 {
            env.ledger().with_mut(|li| li.sequence_number += 1);
        }
        let result = env.as_contract(&contract_id, || {
            rate_limit::check_rate_limit(&env, &user, "register_agent")
        });
        assert!(result.is_ok());
    }
}

#[test]
fn test_rate_limit_cooldown_with_exact_boundary() {
    let (env, contract_id, user) = setup();

    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 100,
            max_calls_per_user_per_day: 100,
            cooldown_blocks: 5,
        },
    );

    env.ledger().with_mut(|li| li.sequence_number = 100);

    // First call at block 100
    let r1 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r1.is_ok());

    // Try at block 104 (only 4 blocks passed) - should fail
    env.ledger().with_mut(|li| li.sequence_number = 104);
    let r2 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r2.is_err());

    // Try at block 105 (exactly 5 blocks passed) - should succeed
    env.ledger().with_mut(|li| li.sequence_number = 105);
    let r3 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r3.is_ok());

    // Try at block 106 (only 1 block since last call) - should fail
    env.ledger().with_mut(|li| li.sequence_number = 106);
    let r4 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user, "register_agent")
    });
    assert!(r4.is_err());
}
