//! Agreement management logic for the Chioma/Rental contract.
use soroban_sdk::{Address, Env, Map, String, Vec};

use crate::errors::RentalError;
use crate::events;
use crate::storage::DataKey;
use crate::types::{
    AgreementExtension, AgreementStatus, ExtensionHistory, ExtensionStatus, PaymentSplit,
    RentAgreement,
};

const TTL_THRESHOLD: u32 = 500000;
const TTL_BUMP: u32 = 500000;

/// Validate agreement parameters
///
/// Ensures monthly_rent is strictly positive (i128 > 0) to prevent logical errors
/// in payment calculations and splits.
pub fn validate_agreement_params(
    env: &Env,
    monthly_rent: &i128,
    security_deposit: &i128,
    start_date: &u64,
    end_date: &u64,
    agent_commission_rate: &u32,
) -> Result<(), RentalError> {
    if *monthly_rent <= 0 || *security_deposit < 0 {
        return Err(RentalError::InvalidAmount);
    }

    if *start_date >= *end_date {
        return Err(RentalError::InvalidDate);
    }

    let now = env.ledger().timestamp();
    let grace_period: u64 = 86400; // 1 day in seconds
    if *start_date < now.saturating_sub(grace_period) {
        return Err(RentalError::InvalidDate);
    }

    if *agent_commission_rate > 100 {
        return Err(RentalError::InvalidCommissionRate);
    }

    Ok(())
}

/// Create a new rent agreement
#[allow(clippy::too_many_arguments)]
pub fn create_agreement(
    env: &Env,
    agreement_id: String,
    landlord: Address,
    tenant: Address,
    agent: Option<Address>,
    monthly_rent: i128,
    security_deposit: i128,
    start_date: u64,
    end_date: u64,
    agent_commission_rate: u32,
    payment_token: Address,
) -> Result<(), RentalError> {
    // Tenant MUST authorize creation
    tenant.require_auth();

    create_agreement_internal(
        env,
        agreement_id,
        landlord,
        tenant,
        agent,
        monthly_rent,
        security_deposit,
        start_date,
        end_date,
        agent_commission_rate,
        payment_token,
    )
}

#[allow(clippy::too_many_arguments)]
fn create_agreement_internal(
    env: &Env,
    agreement_id: String,
    landlord: Address,
    tenant: Address,
    agent: Option<Address>,
    monthly_rent: i128,
    security_deposit: i128,
    start_date: u64,
    end_date: u64,
    agent_commission_rate: u32,
    payment_token: Address,
) -> Result<(), RentalError> {
    // Validate inputs
    validate_agreement_params(
        env,
        &monthly_rent,
        &security_deposit,
        &start_date,
        &end_date,
        &agent_commission_rate,
    )?;

    // Check for duplicate agreement_id
    if env
        .storage()
        .persistent()
        .has(&DataKey::Agreement(agreement_id.clone()))
    {
        return Err(RentalError::AgreementAlreadyExists);
    }

    // Initialize agreement
    let agreement = RentAgreement {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: agent.clone(),
        monthly_rent,
        security_deposit,
        start_date,
        end_date,
        agent_commission_rate,
        status: AgreementStatus::Draft,
        total_rent_paid: 0,
        payment_count: 0,
        signed_at: None,
        payment_token,
        next_payment_due: start_date,
        payment_history: Map::new(env),
    };

    // Store agreement
    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);
    env.storage().persistent().extend_ttl(
        &DataKey::Agreement(agreement_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );

    // Update counter
    let mut count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::AgreementCount)
        .unwrap_or(0);
    count += 1;
    env.storage()
        .instance()
        .set(&DataKey::AgreementCount, &count);
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_BUMP);

    // Emit event with topics for indexing
    events::agreement_created(
        env,
        agreement_id,
        tenant,
        landlord,
        monthly_rent,
        security_deposit,
        start_date,
        end_date,
        agent,
    );

    Ok(())
}

/// Sign an agreement as the tenant
pub fn sign_agreement(env: &Env, tenant: Address, agreement_id: String) -> Result<(), RentalError> {
    // Tenant MUST authorize signing
    tenant.require_auth();

    // Retrieve the agreement
    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    // Validate caller is the intended tenant
    if agreement.tenant != tenant {
        return Err(RentalError::NotTenant);
    }

    // Validate agreement is in Pending status
    if agreement.status != AgreementStatus::Pending {
        return Err(RentalError::InvalidState);
    }

    // Validate agreement has not expired
    let current_time = env.ledger().timestamp();
    if current_time > agreement.end_date {
        return Err(RentalError::Expired);
    }

    // Update agreement status and record signing time
    agreement.status = AgreementStatus::Active;
    agreement.signed_at = Some(current_time);

    // Save updated agreement
    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);
    env.storage().persistent().extend_ttl(
        &DataKey::Agreement(agreement_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_BUMP);

    // Emit event with topics for indexing
    events::agreement_signed(
        env,
        agreement_id,
        tenant,
        agreement.landlord.clone(),
        current_time,
    );

    Ok(())
}

/// Submit a draft agreement for tenant signature (Draft → Pending)
pub fn submit_agreement(
    env: &Env,
    landlord: Address,
    agreement_id: String,
) -> Result<(), RentalError> {
    landlord.require_auth();

    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    if agreement.landlord != landlord {
        return Err(RentalError::Unauthorized);
    }

    if agreement.status != AgreementStatus::Draft {
        return Err(RentalError::InvalidState);
    }

    agreement.status = AgreementStatus::Pending;

    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);
    env.storage().persistent().extend_ttl(
        &DataKey::Agreement(agreement_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );

    events::agreement_submitted(env, agreement_id, landlord, agreement.tenant.clone());

    Ok(())
}

/// Cancel an agreement while in Draft or Pending state
pub fn cancel_agreement(
    env: &Env,
    caller: Address,
    agreement_id: String,
) -> Result<(), RentalError> {
    caller.require_auth();

    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    // Only landlord can cancel
    if agreement.landlord != caller {
        return Err(RentalError::Unauthorized);
    }

    // Only in Draft or Pending states
    if agreement.status != AgreementStatus::Draft && agreement.status != AgreementStatus::Pending {
        return Err(RentalError::InvalidState);
    }

    agreement.status = AgreementStatus::Cancelled;

    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);
    env.storage().persistent().extend_ttl(
        &DataKey::Agreement(agreement_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );

    events::agreement_cancelled(env, agreement_id, caller, agreement.tenant.clone());

    Ok(())
}

/// Retrieve a rent agreement by its unique identifier
pub fn get_agreement(env: &Env, agreement_id: String) -> Option<RentAgreement> {
    env.storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id))
}

/// Check whether a rent agreement exists for the given identifier
pub fn has_agreement(env: &Env, agreement_id: String) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Agreement(agreement_id))
}

/// Returns the total number of rent agreements created
pub fn get_agreement_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::AgreementCount)
        .unwrap_or(0)
}

/// Get payment split for a specific month in an agreement
pub fn get_payment_split(
    env: &Env,
    agreement_id: String,
    month: u32,
) -> Result<PaymentSplit, RentalError> {
    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id))
        .ok_or(RentalError::AgreementNotFound)?;

    agreement
        .payment_history
        .get(month)
        .ok_or(RentalError::AgreementNotFound)
}

/// Propose a new agreement extension
pub fn propose_extension(
    env: &Env,
    agreement_id: String,
    extension_months: u32,
    new_rent: Option<i128>,
    new_deposit: Option<i128>,
) -> Result<String, RentalError> {
    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    // Only landlord can propose extension
    agreement.landlord.require_auth();

    // Agreement must be Active
    if agreement.status != AgreementStatus::Active {
        return Err(RentalError::InvalidState);
    }

    // Check if there's already a proposed extension
    if env
        .storage()
        .persistent()
        .has(&DataKey::Extension(agreement_id.clone()))
    {
        return Err(RentalError::ExtensionAlreadyExists);
    }

    // Calculate dates
    let extension_start = agreement.end_date;
    let seconds_per_month: u64 = 30 * 24 * 60 * 60; // Approximate
    let extension_end = extension_start + (extension_months as u64 * seconds_per_month);

    let extension_rent = new_rent.unwrap_or(agreement.monthly_rent);
    let extension_deposit = new_deposit.unwrap_or(agreement.security_deposit);

    let extension = AgreementExtension {
        id: agreement_id.clone(),
        original_agreement_id: agreement_id.clone(),
        extension_start,
        extension_end,
        extension_rent,
        extension_deposit,
        status: ExtensionStatus::Proposed,
        created_at: env.ledger().timestamp(),
    };

    // Store extension
    env.storage()
        .persistent()
        .set(&DataKey::Extension(agreement_id.clone()), &extension);
    env.storage().persistent().extend_ttl(
        &DataKey::Extension(agreement_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );

    events::extension_proposed(
        env,
        agreement_id.clone(),
        agreement_id.clone(),
        extension_end,
/// Create a new agreement with a specific payment token
#[allow(clippy::too_many_arguments)]
pub fn create_agreement_with_token(
    env: &Env,
    property_id: String,
    tenant: Address,
    landlord: Address,
    payment_token: Address,
    rent_amount: i128,
    deposit_amount: i128,
    lease_start: u64,
    lease_end: u64,
) -> Result<String, RentalError> {
    tenant.require_auth();

    // Check if token is supported
    if !crate::multi_token::is_token_supported(env.clone(), payment_token.clone())? {
        return Err(RentalError::TokenNotSupported);
    }

    // Use property_id + nonce or just property_id if it's unique
    let agreement_id = property_id; // For simplicity, using property_id as agreement_id

    create_agreement_internal(
        env,
        agreement_id.clone(),
        landlord,
        tenant,
        None,
        rent_amount,
        deposit_amount,
        lease_start,
        lease_end,
        0,
        payment_token.clone(),
    )?;

    // Store the token mapping explicitly if needed, but it's already in RentAgreement
    env.storage().persistent().set(
        &DataKey::AgreementToken(agreement_id.clone()),
        &payment_token,
    );

    Ok(agreement_id)
}

/// Accept an agreement extension
pub fn accept_extension(env: &Env, extension_id: String) -> Result<(), RentalError> {
    let mut extension: AgreementExtension = env
        .storage()
        .persistent()
        .get(&DataKey::Extension(extension_id.clone()))
        .ok_or(RentalError::ExtensionNotFound)?;

    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(extension.original_agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    // Only tenant can accept extension
    agreement.tenant.require_auth();

    if extension.status != ExtensionStatus::Proposed {
        return Err(RentalError::InvalidState);
    }

    extension.status = ExtensionStatus::Accepted;

    env.storage()
        .persistent()
        .set(&DataKey::Extension(extension_id.clone()), &extension);

    events::extension_accepted(env, extension_id);

    Ok(())
}

/// Reject an agreement extension
pub fn reject_extension(
    env: &Env,
    extension_id: String,
    _reason: String,
) -> Result<(), RentalError> {
    let mut extension: AgreementExtension = env
        .storage()
        .persistent()
        .get(&DataKey::Extension(extension_id.clone()))
        .ok_or(RentalError::ExtensionNotFound)?;

    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(extension.original_agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    // Either party can reject? Usually tenant rejects landlord's proposal
    // But let's allow both for now if they are authorized
    if !agreement.tenant.has_auth() && !agreement.landlord.has_auth() {
        return Err(RentalError::Unauthorized);
    }

    if extension.status != ExtensionStatus::Proposed {
        return Err(RentalError::InvalidState);
    }

    extension.status = ExtensionStatus::Rejected;

    // Move to history
    let mut history = get_extension_history(env, extension.original_agreement_id.clone())?;
    history.extensions.push_back(extension.clone());
    history.total_extensions += 1;
    env.storage().persistent().set(
        &DataKey::ExtensionHistory(extension.original_agreement_id.clone()),
        &history,
    );

    // Remove from active extensions
    env.storage()
        .persistent()
        .remove(&DataKey::Extension(extension_id.clone()));

    events::extension_rejected(env, extension_id);

    Ok(())
}

/// Activate an accepted extension
pub fn activate_extension(env: &Env, extension_id: String) -> Result<(), RentalError> {
    let mut extension: AgreementExtension = env
        .storage()
        .persistent()
        .get(&DataKey::Extension(extension_id.clone()))
        .ok_or(RentalError::ExtensionNotFound)?;

    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(extension.original_agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    // Only landlord can activate extension (or maybe automatic, but issue says landlord)
    agreement.landlord.require_auth();

    if extension.status != ExtensionStatus::Accepted {
        return Err(RentalError::InvalidState);
    }

    // Update agreement
    agreement.end_date = extension.extension_end;
    agreement.monthly_rent = extension.extension_rent;
    agreement.security_deposit = extension.extension_deposit;
    // We might need to update other things like next_payment_due if it was completed?
    // But extensions happen before completion usually.

    extension.status = ExtensionStatus::Active;

    // Move to history
    let mut history = get_extension_history(env, extension.original_agreement_id.clone())?;
    history.extensions.push_back(extension.clone());
    history.total_extensions += 1;
    env.storage().persistent().set(
        &DataKey::ExtensionHistory(extension.original_agreement_id.clone()),
        &history,
    );

    // Update agreement in storage
    env.storage().persistent().set(
        &DataKey::Agreement(extension.original_agreement_id.clone()),
        &agreement,
    );

    // Remove from active extensions
    env.storage()
        .persistent()
        .remove(&DataKey::Extension(extension_id.clone()));

    events::extension_activated(env, extension_id);
/// Get the payment token for an agreement
pub fn get_agreement_token(env: &Env, agreement_id: String) -> Result<Address, RentalError> {
    env.storage()
        .persistent()
        .get(&DataKey::AgreementToken(agreement_id))
        .ok_or(RentalError::AgreementNotFound)
}

/// Make a payment for an agreement using a specific token
pub fn make_payment_with_token(
    env: &Env,
    agreement_id: String,
    amount: i128,
    token: Address,
) -> Result<(), RentalError> {
    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    if agreement.status != AgreementStatus::Active {
        return Err(RentalError::AgreementNotActive);
    }

    agreement.tenant.require_auth();

    // Convert amount to the agreement's base token if they differ
    let amount_in_base = if token != agreement.payment_token {
        crate::multi_token::convert_amount(
            env.clone(),
            token.clone(),
            agreement.payment_token.clone(),
            amount,
        )?
    } else {
        amount
    };

    if amount_in_base < agreement.monthly_rent {
        return Err(RentalError::InsufficientPayment);
    }

    // Transfer tokens from tenant to contract (escrow)
    let client = soroban_sdk::token::Client::new(env, &token);
    client.transfer(&agreement.tenant, env.current_contract_address(), &amount);

    // Update agreement state
    agreement.total_rent_paid += amount_in_base;
    agreement.payment_count += 1;

    // Simple split for now: 100% to landlord
    let split = PaymentSplit {
        landlord_amount: amount_in_base,
        platform_amount: 0,
        token: token.clone(),
        payment_date: env.ledger().timestamp(),
        payer: agreement.tenant.clone(),
    };
    agreement
        .payment_history
        .set(agreement.payment_count, split);

    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);

    events::payment_made_with_token(env, agreement_id, token, amount);

    Ok(())
}

/// Cancel a proposed extension
pub fn cancel_extension(
    env: &Env,
    extension_id: String,
    _reason: String,
) -> Result<(), RentalError> {
    let mut extension: AgreementExtension = env
        .storage()
        .persistent()
        .get(&DataKey::Extension(extension_id.clone()))
        .ok_or(RentalError::ExtensionNotFound)?;

    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(extension.original_agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    // Only landlord can cancel their own proposal
    agreement.landlord.require_auth();

    if extension.status != ExtensionStatus::Proposed {
        return Err(RentalError::InvalidState);
    }

    extension.status = ExtensionStatus::Cancelled;

    // Move to history
    let mut history = get_extension_history(env, extension.original_agreement_id.clone())?;
    history.extensions.push_back(extension.clone());
    history.total_extensions += 1;
    env.storage().persistent().set(
        &DataKey::ExtensionHistory(extension.original_agreement_id.clone()),
        &history,
    );

    // Remove from active extensions
    env.storage()
        .persistent()
        .remove(&DataKey::Extension(extension_id.clone()));

    events::extension_cancelled(env, extension_id);

    Ok(())
}

/// Retrieve an extension by ID
pub fn get_extension(env: &Env, extension_id: String) -> Result<AgreementExtension, RentalError> {
    env.storage()
        .persistent()
        .get(&DataKey::Extension(extension_id))
        .ok_or(RentalError::ExtensionNotFound)
}

/// Retrieve extension history for an agreement
pub fn get_extension_history(
    env: &Env,
    agreement_id: String,
) -> Result<ExtensionHistory, RentalError> {
    Ok(env
        .storage()
        .persistent()
        .get(&DataKey::ExtensionHistory(agreement_id.clone()))
        .unwrap_or(ExtensionHistory {
            agreement_id,
            extensions: Vec::new(env),
            total_extensions: 0,
        }))
}

/// Get current agreement end date
pub fn get_current_agreement_end(env: &Env, agreement_id: String) -> Result<u64, RentalError> {
    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id))
        .ok_or(RentalError::AgreementNotFound)?;

    Ok(agreement.end_date)
}
/// Release escrow for an agreement
pub fn release_escrow_with_token(
    env: &Env,
    escrow_id: String,
    token: Address,
) -> Result<(), RentalError> {
    // For simplicity, we assume escrow_id is the agreement_id
    let agreement_id = escrow_id.clone();
    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id))
        .ok_or(RentalError::AgreementNotFound)?;

    // Only landlord can release? Or admin?
    // Let's assume landlord for this implementation
    agreement.landlord.require_auth();

    let contract_addr = env.current_contract_address();
    let client = soroban_sdk::token::Client::new(env, &token);
    let balance = client.balance(&contract_addr);

    if balance > 0 {
        client.transfer(&contract_addr, &agreement.landlord, &balance);
    }

    events::escrow_released_with_token(env, escrow_id, token, balance);

    Ok(())
}
