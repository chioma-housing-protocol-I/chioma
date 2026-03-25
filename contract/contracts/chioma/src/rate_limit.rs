//! Rate limiting module for smart contract functions.
//!
//! Implements rate limiting to prevent spam attacks and DOS vulnerabilities.

use soroban_sdk::{Address, Env, String};

use crate::errors::RentalError;
use crate::events;
use crate::storage::DataKey;
use crate::types::{RateLimitConfig, UserCallCount};

const BLOCKS_PER_DAY: u64 = 17280; // Assuming ~5 second blocks

/// Initialize rate limit configuration (admin only).
pub fn set_rate_limit_config(env: &Env, config: RateLimitConfig) -> Result<(), RentalError> {
    env.storage()
        .persistent()
        .set(&DataKey::RateLimitConfig, &config);
    env.storage()
        .persistent()
        .extend_ttl(&DataKey::RateLimitConfig, 500000, 500000);
    Ok(())
}

/// Get current rate limit configuration.
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
///
/// This implements:
/// 1. Per-block global rate limiting
/// 2. Per-user daily rate limiting
/// 3. Cooldown period enforcement
pub fn check_rate_limit(env: &Env, user: &Address, function_name: &str) -> Result<(), RentalError> {
    let config = get_rate_limit_config(env);
    let current_block = env.ledger().sequence() as u64;

    // Get or initialize user call count
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

    // Check cooldown period (skip on first call when user has never called before)
    if config.cooldown_blocks > 0 && user_calls.call_count > 0 {
        let blocks_since_last = current_block.saturating_sub(user_calls.last_call_block);
        if blocks_since_last < config.cooldown_blocks as u64 {
            events::rate_limit_exceeded(
                env,
                user.clone(),
                String::from_str(env, function_name),
                crate::types::RateLimitReason::CooldownNotMet,
            );
            return Err(RentalError::CooldownNotMet);
        }
    }

    // Reset daily count if a day has passed
    let blocks_since_reset = current_block.saturating_sub(user_calls.daily_reset_block);
    if blocks_since_reset >= BLOCKS_PER_DAY {
        user_calls.daily_count = 0;
        user_calls.daily_reset_block = current_block;
    }

    // Check daily limit
    if user_calls.daily_count >= config.max_calls_per_user_per_day {
        events::rate_limit_exceeded(
            env,
            user.clone(),
            String::from_str(env, function_name),
            crate::types::RateLimitReason::DailyLimitExceeded,
        );
        return Err(RentalError::RateLimitExceeded);
    }

    // Check per-block limit
    let block_key = DataKey::BlockCallCount(current_block, String::from_str(env, function_name));
    let block_calls: u32 = env.storage().temporary().get(&block_key).unwrap_or(0);

    if block_calls >= config.max_calls_per_block {
        events::rate_limit_exceeded(
            env,
            user.clone(),
            String::from_str(env, function_name),
            crate::types::RateLimitReason::BlockLimitExceeded,
        );
        return Err(RentalError::RateLimitExceeded);
    }

    // Update counters
    user_calls.call_count += 1;
    user_calls.last_call_block = current_block;
    user_calls.daily_count += 1;

    // Save user call count
    env.storage().persistent().set(&key, &user_calls);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    // Update block call count (use temporary storage, expires after ~1 day)
    env.storage()
        .temporary()
        .set(&block_key, &(block_calls + 1));
    env.storage()
        .temporary()
        .extend_ttl(&block_key, BLOCKS_PER_DAY as u32, BLOCKS_PER_DAY as u32);

    Ok(())
}

/// Get user call statistics for a specific function.
pub fn get_user_call_count(
    env: &Env,
    user: &Address,
    function_name: String,
) -> Option<UserCallCount> {
    let key = DataKey::UserCallCount(user.clone(), function_name);
    env.storage().persistent().get(&key)
}

/// Get current block call count for a function.
pub fn get_block_call_count(env: &Env, function_name: String) -> u32 {
    let current_block = env.ledger().sequence() as u64;
    let block_key = DataKey::BlockCallCount(current_block, function_name);
    env.storage().temporary().get(&block_key).unwrap_or(0)
}

/// Reset rate limits for a user (admin only, for emergency situations).
pub fn reset_user_rate_limit(
    env: &Env,
    user: &Address,
    function_name: String,
) -> Result<(), RentalError> {
    let key = DataKey::UserCallCount(user.clone(), function_name);
    env.storage().persistent().remove(&key);
    Ok(())
}
