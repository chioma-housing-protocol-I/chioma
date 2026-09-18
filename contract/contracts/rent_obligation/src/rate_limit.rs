<<<<<<< HEAD
//! Rate limiting module for rent_obligation functions.
=======
//! Rate limiting module for rent obligation write functions.
>>>>>>> upstream/main

use soroban_sdk::{Address, Env, String};

use crate::errors::ObligationError;
use crate::storage::DataKey;
use crate::types::{RateLimitConfig, UserCallCount};

<<<<<<< HEAD
const BLOCKS_PER_DAY: u64 = 17280; // ~5-second blocks

/// Get current rate limit configuration, or safe defaults.
=======
const BLOCKS_PER_DAY: u64 = 17280; // Assuming ~5 second blocks

/// Get current rate limit configuration.
>>>>>>> upstream/main
pub fn get_rate_limit_config(env: &Env) -> RateLimitConfig {
    env.storage()
        .persistent()
        .get(&DataKey::RateLimitConfig)
        .unwrap_or(RateLimitConfig {
            max_calls_per_block: 10,
            max_calls_per_user_per_day: 100,
            cooldown_blocks: 0,
        })
}

/// Check and enforce rate limits for a user calling a specific function.
<<<<<<< HEAD
/// Returns `RateLimitExceeded` or `CooldownNotMet` on violation; updates counters on success.
=======
>>>>>>> upstream/main
pub fn check_rate_limit(
    env: &Env,
    user: &Address,
    function_name: &str,
) -> Result<(), ObligationError> {
    let config = get_rate_limit_config(env);
    let current_block = env.ledger().sequence() as u64;

<<<<<<< HEAD
=======
    // Get or initialize user call count
>>>>>>> upstream/main
    let key = DataKey::UserCallCount(user.clone(), String::from_str(env, function_name));
    let mut user_calls: UserCallCount =
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(UserCallCount {
                user: user.clone(),
                call_count: 0,
                last_call_block: 0,
                daily_count: 0,
                daily_reset_block: current_block,
            });

<<<<<<< HEAD
    // Cooldown check (skip on very first call when last_call_block is 0)
=======
    // Check cooldown period (skip on first call when last_call_block is 0)
>>>>>>> upstream/main
    if config.cooldown_blocks > 0 && user_calls.last_call_block > 0 {
        let blocks_since_last = current_block.saturating_sub(user_calls.last_call_block);
        if blocks_since_last < config.cooldown_blocks as u64 {
            return Err(ObligationError::CooldownNotMet);
        }
    }

<<<<<<< HEAD
    // Reset daily count if a full day has elapsed
=======
    // Reset daily count if a day has passed
>>>>>>> upstream/main
    let blocks_since_reset = current_block.saturating_sub(user_calls.daily_reset_block);
    if blocks_since_reset >= BLOCKS_PER_DAY {
        user_calls.daily_count = 0;
        user_calls.daily_reset_block = current_block;
    }

<<<<<<< HEAD
    // Daily limit check
=======
    // Check daily limit
>>>>>>> upstream/main
    if user_calls.daily_count >= config.max_calls_per_user_per_day {
        return Err(ObligationError::RateLimitExceeded);
    }

<<<<<<< HEAD
    // Per-block limit check
    let block_key = DataKey::BlockCallCount(current_block, String::from_str(env, function_name));
    let block_calls: u32 = env.storage().temporary().get(&block_key).unwrap_or(0);
=======
    // Check per-block limit
    let block_key = DataKey::BlockCallCount(current_block, String::from_str(env, function_name));
    let block_calls: u32 = env.storage().temporary().get(&block_key).unwrap_or(0);

>>>>>>> upstream/main
    if block_calls >= config.max_calls_per_block {
        return Err(ObligationError::RateLimitExceeded);
    }

<<<<<<< HEAD
    // Update user counters
=======
    // Update counters
>>>>>>> upstream/main
    user_calls.call_count += 1;
    user_calls.last_call_block = current_block;
    user_calls.daily_count += 1;

<<<<<<< HEAD
    env.storage().persistent().set(&key, &user_calls);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    // Update block counter
=======
    // Save user call count
    env.storage().persistent().set(&key, &user_calls);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    // Update block call count
>>>>>>> upstream/main
    env.storage()
        .temporary()
        .set(&block_key, &(block_calls + 1));
    env.storage()
        .temporary()
        .extend_ttl(&block_key, BLOCKS_PER_DAY as u32, BLOCKS_PER_DAY as u32);

    Ok(())
}
