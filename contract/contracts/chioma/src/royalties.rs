//! NFT Royalty Mechanism for Chioma rental agreements.

use soroban_sdk::{token, Address, Env, String, Vec};

use crate::errors::RentalError;
use crate::events;
use crate::storage::DataKey;
use crate::types::{RoyaltyConfig, RoyaltyPayment};

/// Set the royalty configuration for a specific token (agreement).
///
/// Only the agreement's landlord (creator) can set this initially.
pub fn set_royalty(
    env: Env,
    token_id: String,
    royalty_percentage: u32,
    royalty_recipient: Address,
) -> Result<(), RentalError> {
    if royalty_percentage > 2500 {
        // Limit to 25% (2500 bps)
        return Err(RentalError::InvalidAmount);
    }

    // Read agreement to verify landlord (creator)
    let agreement = env
        .storage()
        .persistent()
        .get::<DataKey, crate::types::RentAgreement>(&DataKey::Agreement(token_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    agreement.landlord.require_auth();

    let config = RoyaltyConfig {
        token_id: token_id.clone(),
        creator: agreement.landlord.clone(),
        royalty_percentage,
        royalty_recipient: royalty_recipient.clone(),
    };

    env.storage()
        .persistent()
        .set(&DataKey::RoyaltyConfig(token_id.clone()), &config);

    events::royalty_set(&env, token_id, royalty_percentage, royalty_recipient);
    Ok(())
}

/// Retrieve the royalty configuration for a token.
pub fn get_royalty(env: Env, token_id: String) -> Result<RoyaltyConfig, RentalError> {
    env.storage()
        .persistent()
        .get(&DataKey::RoyaltyConfig(token_id))
        .ok_or(RentalError::InternalError) // Or add specific RoyaltyNotFound
}

/// Calculate the royalty amount for a given sale price.
pub fn calculate_royalty(
    env: Env,
    token_id: String,
    sale_price: i128,
) -> Result<i128, RentalError> {
    let config = get_royalty(env, token_id)?;
    Ok((sale_price * config.royalty_percentage as i128) / 10000)
}

/// Perform a transfer of the "agreement" ownership with royalty payment.
///
/// The current landlord MUST call this and authorize the transfer.
/// The sale price is paid by the new landlord (`to`) to the current landlord,
/// with the royalty percentage deducted and sent to the royalty recipient.
pub fn transfer_with_royalty(
    env: Env,
    token_id: String,
    to: Address,
    sale_price: i128,
) -> Result<(), RentalError> {
    let mut agreement = env
        .storage()
        .persistent()
        .get::<DataKey, crate::types::RentAgreement>(&DataKey::Agreement(token_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    let current_landlord = agreement.landlord.clone();
    current_landlord.require_auth();
    to.require_auth(); // Buyer must authorize the payment

    let config = get_royalty(env.clone(), token_id.clone())?;
    let royalty_amount = (sale_price * config.royalty_percentage as i128) / 10000;
    let seller_amount = sale_price - royalty_amount;

    let token_client = token::Client::new(&env, &agreement.payment_token);

    // 1. Transfer royalty to recipient
    if royalty_amount > 0 {
        token_client.transfer(&to, &config.royalty_recipient, &royalty_amount);
        events::royalty_paid(
            &env,
            token_id.clone(),
            royalty_amount,
            config.royalty_recipient,
        );
    }

    // 2. Transfer remainder to current landlord
    if seller_amount > 0 {
        token_client.transfer(&to, &current_landlord, &seller_amount);
    }

    // 3. Record payment history
    let payment = RoyaltyPayment {
        token_id: token_id.clone(),
        from: current_landlord,
        to: to.clone(),
        amount: sale_price,
        royalty_amount,
        timestamp: env.ledger().timestamp(),
    };

    let mut payments: Vec<RoyaltyPayment> = env
        .storage()
        .persistent()
        .get(&DataKey::RoyaltyPayments(token_id.clone()))
        .unwrap_or(Vec::new(&env));
    payments.push_back(payment);
    env.storage()
        .persistent()
        .set(&DataKey::RoyaltyPayments(token_id.clone()), &payments);

    // 4. Update agreement landlord
    agreement.landlord = to;
    env.storage()
        .persistent()
        .set(&DataKey::Agreement(token_id), &agreement);

    Ok(())
}

/// Get the royalty payment history for a token.
pub fn get_royalty_payments(
    env: Env,
    token_id: String,
) -> Result<Vec<RoyaltyPayment>, RentalError> {
    Ok(env
        .storage()
        .persistent()
        .get(&DataKey::RoyaltyPayments(token_id))
        .unwrap_or(Vec::new(&env)))
}
