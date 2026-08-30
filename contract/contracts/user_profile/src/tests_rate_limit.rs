use crate::rate_limit;
use crate::storage::DataKey;
use crate::types::RateLimitConfig;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
<<<<<<< HEAD
    Address, Env,
};

use crate::profile::UserProfileContract;
=======
    Address, Bytes, Env,
};

use crate::{AccountType, UserProfileContract, UserProfileContractClient};
>>>>>>> upstream/main

fn setup() -> (Env, Address, Address) {
    let env = Env::default();
    let contract_id = env.register(UserProfileContract, ());
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
<<<<<<< HEAD
=======

>>>>>>> upstream/main
    let config = env.as_contract(&contract_id, || rate_limit::get_rate_limit_config(&env));
    assert_eq!(config.max_calls_per_block, 10);
    assert_eq!(config.max_calls_per_user_per_day, 100);
    assert_eq!(config.cooldown_blocks, 0);
}

#[test]
fn test_check_rate_limit_within_limit() {
    let (env, contract_id, user) = setup();
<<<<<<< HEAD
=======

>>>>>>> upstream/main
    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 10,
            max_calls_per_user_per_day: 5,
            cooldown_blocks: 0,
        },
    );
<<<<<<< HEAD
=======

>>>>>>> upstream/main
    for _ in 0..3 {
        let result = env.as_contract(&contract_id, || {
            rate_limit::check_rate_limit(&env, &user, "create_profile")
        });
        assert!(result.is_ok());
    }
}

#[test]
fn test_check_rate_limit_exceed_block() {
    let (env, contract_id, _user) = setup();
<<<<<<< HEAD
=======

>>>>>>> upstream/main
    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 2,
            max_calls_per_user_per_day: 100,
            cooldown_blocks: 0,
        },
    );
<<<<<<< HEAD
=======

>>>>>>> upstream/main
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    let r1 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user1, "create_profile")
    });
    assert!(r1.is_ok());

    let r2 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user2, "create_profile")
    });
    assert!(r2.is_ok());

    let r3 = env.as_contract(&contract_id, || {
        rate_limit::check_rate_limit(&env, &user3, "create_profile")
    });
    assert!(r3.is_err());
}

#[test]
fn test_check_rate_limit_exceed_daily() {
    let (env, contract_id, user) = setup();
<<<<<<< HEAD
=======

>>>>>>> upstream/main
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
<<<<<<< HEAD
        rate_limit::check_rate_limit(&env, &user, "create_profile")
=======
        rate_limit::check_rate_limit(&env, &user, "update_profile")
>>>>>>> upstream/main
    });
    assert!(r1.is_ok());

    env.ledger().with_mut(|li| li.sequence_number += 1);

    let r2 = env.as_contract(&contract_id, || {
<<<<<<< HEAD
        rate_limit::check_rate_limit(&env, &user, "create_profile")
=======
        rate_limit::check_rate_limit(&env, &user, "update_profile")
>>>>>>> upstream/main
    });
    assert!(r2.is_ok());

    env.ledger().with_mut(|li| li.sequence_number += 1);

    let r3 = env.as_contract(&contract_id, || {
<<<<<<< HEAD
        rate_limit::check_rate_limit(&env, &user, "create_profile")
=======
        rate_limit::check_rate_limit(&env, &user, "update_profile")
>>>>>>> upstream/main
    });
    assert!(r3.is_err());
}

#[test]
fn test_check_rate_limit_cooldown() {
    let (env, contract_id, user) = setup();
<<<<<<< HEAD
    env.ledger().with_mut(|li| li.sequence_number = 1);
=======

    // Start at a non-zero block so last_call_block > 0 after the first call
    env.ledger().with_mut(|li| li.sequence_number = 100);

>>>>>>> upstream/main
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
<<<<<<< HEAD
        rate_limit::check_rate_limit(&env, &user, "create_profile")
=======
        rate_limit::check_rate_limit(&env, &user, "update_profile")
>>>>>>> upstream/main
    });
    assert!(r1.is_ok());

    let r2 = env.as_contract(&contract_id, || {
<<<<<<< HEAD
        rate_limit::check_rate_limit(&env, &user, "create_profile")
=======
        rate_limit::check_rate_limit(&env, &user, "update_profile")
>>>>>>> upstream/main
    });
    assert!(r2.is_err());

    env.ledger().with_mut(|li| li.sequence_number += 10);

    let r3 = env.as_contract(&contract_id, || {
<<<<<<< HEAD
        rate_limit::check_rate_limit(&env, &user, "create_profile")
    });
    assert!(r3.is_ok());
}
=======
        rate_limit::check_rate_limit(&env, &user, "update_profile")
    });
    assert!(r3.is_ok());
}

// ── enforcement through the public contract entry points ────────────────────

#[test]
fn test_create_profile_enforces_block_rate_limit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(UserProfileContract, ());
    let client = UserProfileContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 1,
            max_calls_per_user_per_day: 100,
            cooldown_blocks: 0,
        },
    );

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let data_hash = Bytes::from_array(&env, &[0u8; 32]);

    let result1 = client.try_create_profile(&user1, &AccountType::Tenant, &data_hash);
    assert!(result1.is_ok());

    // Second call in the same block exceeds the per-block limit, regardless of user.
    let result2 = client.try_create_profile(&user2, &AccountType::Tenant, &data_hash);
    assert!(result2.is_err());
}

#[test]
fn test_update_profile_enforces_daily_rate_limit_per_user() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(UserProfileContract, ());
    let client = UserProfileContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let user = Address::generate(&env);
    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    seed_config(
        &env,
        &contract_id,
        &RateLimitConfig {
            max_calls_per_block: 100,
            max_calls_per_user_per_day: 1,
            cooldown_blocks: 0,
        },
    );

    let new_hash = Bytes::from_array(&env, &[1u8; 32]);
    let result1 = client.try_update_profile(&user, &None, &Some(new_hash.clone()));
    assert!(result1.is_ok());

    let result2 = client.try_update_profile(&user, &None, &Some(new_hash));
    assert!(result2.is_err());
}
>>>>>>> upstream/main
