use crate::errors::RentalError;
use crate::events;
use crate::storage::DataKey;
use crate::types::{SupportedToken, TokenExchangeRate};
use soroban_sdk::{Address, Env, String, Vec};

pub fn add_supported_token(
    env: Env,
    token_address: Address,
    symbol: String,
    decimals: u32,
    min_amount: i128,
    max_amount: i128,
) -> Result<(), RentalError> {
    let key = DataKey::SupportedToken(token_address.clone());
    let token = SupportedToken {
        token_address: token_address.clone(),
        symbol: symbol.clone(),
        decimals,
        enabled: true,
        min_amount,
        max_amount,
    };

    env.storage().persistent().set(&key, &token);

    // Update supported tokens list
    let mut tokens: Vec<Address> = env
        .storage()
        .persistent()
        .get(&DataKey::SupportedTokens)
        .unwrap_or(Vec::new(&env));
    if !tokens.contains(&token_address) {
        tokens.push_back(token_address.clone());
        env.storage()
            .persistent()
            .set(&DataKey::SupportedTokens, &tokens);
    }

    events::token_added(&env, token_address, symbol);
    Ok(())
}

pub fn remove_supported_token(env: Env, token_address: Address) -> Result<(), RentalError> {
    let key = DataKey::SupportedToken(token_address.clone());
    if !env.storage().persistent().has(&key) {
        return Err(RentalError::TokenNotSupported);
    }

    let mut token: SupportedToken = env.storage().persistent().get(&key).unwrap();
    token.enabled = false;
    env.storage().persistent().set(&key, &token);

    events::token_removed(&env, token_address);
    Ok(())
}

pub fn get_supported_tokens(env: Env) -> Result<Vec<SupportedToken>, RentalError> {
    let addresses: Vec<Address> = env
        .storage()
        .persistent()
        .get(&DataKey::SupportedTokens)
        .unwrap_or(Vec::new(&env));
    let mut tokens = Vec::new(&env);

    for addr in addresses.iter() {
        if let Some(token) = env
            .storage()
            .persistent()
            .get::<DataKey, SupportedToken>(&DataKey::SupportedToken(addr))
        {
            if token.enabled {
                tokens.push_back(token);
            }
        }
    }
    Ok(tokens)
}

pub fn is_token_supported(env: Env, token_address: Address) -> Result<bool, RentalError> {
    let key = DataKey::SupportedToken(token_address);
    if let Some(token) = env
        .storage()
        .persistent()
        .get::<DataKey, SupportedToken>(&key)
    {
        Ok(token.enabled)
    } else {
        Ok(false)
    }
}

pub fn set_exchange_rate(
    env: Env,
    from_token: Address,
    to_token: Address,
    rate: i128,
) -> Result<(), RentalError> {
    let key = DataKey::ExchangeRate(from_token.clone(), to_token.clone());
    let exchange_rate = TokenExchangeRate {
        from_token: from_token.clone(),
        to_token: to_token.clone(),
        rate,
        updated_at: env.ledger().timestamp(),
    };

    env.storage().persistent().set(&key, &exchange_rate);

    events::exchange_rate_updated(&env, from_token, to_token, rate);
    Ok(())
}

pub fn get_exchange_rate(
    env: Env,
    from_token: Address,
    to_token: Address,
) -> Result<i128, RentalError> {
    if from_token == to_token {
        return Ok(1_000_000_000_000_000_000); // 1.0 scaled by 10^18
    }

    let key = DataKey::ExchangeRate(from_token, to_token);
    if let Some(rate_struct) = env
        .storage()
        .persistent()
        .get::<DataKey, TokenExchangeRate>(&key)
    {
        Ok(rate_struct.rate)
    } else {
        Err(RentalError::RateNotFound)
    }
}

pub fn convert_amount(
    env: Env,
    from_token: Address,
    to_token: Address,
    amount: i128,
) -> Result<i128, RentalError> {
    if from_token == to_token {
        return Ok(amount);
    }

    let rate = get_exchange_rate(env, from_token, to_token)?;
    // amount * rate / 10^18
    let converted = amount
        .checked_mul(rate)
        .ok_or(RentalError::ConversionError)?
        / 1_000_000_000_000_000_000;
    Ok(converted)
}
