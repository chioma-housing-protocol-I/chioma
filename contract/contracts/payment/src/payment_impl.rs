//! Payment processing implementation.
use soroban_sdk::{contracttype, Address, Env, IntoVal, String};

use crate::errors::PaymentError;
use crate::storage::{extend_persistent_ttl, DataKey};
use crate::types::{
    AgreementStatus, EscalationType, PaymentRecord, RentAgreement, RentEscalationConfig,
};
use crate::upgrade;

/// Mirrors `chioma::types::AgreementStatus` field-for-field. Soroban decodes
/// `#[contracttype]` enums/structs by name, not position, so a cross-contract
/// call into the real `chioma` contract can only decode successfully if this
/// matches exactly, including the `PendingApproval` variant this module
/// never itself checks for.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ChiomaAgreementStatus {
    Draft,
    Pending,
    PendingApproval,
    Active,
    Completed,
    Cancelled,
    Terminated,
    Disputed,
}

/// Mirrors `chioma::types::RentAgreement` field-for-field, so
/// `verify_agreement_with_chioma` below can decode the real
/// `chioma::get_agreement` response. `payment` has no crate dependency on
/// `chioma` (Soroban contracts are independently deployed, not linked), so
/// this local mirror type is how the cross-contract read is decoded; see the
/// identical pattern (and its rationale) in
/// `dispute_resolution::dispute::ChiomaRentAgreement`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChiomaRentAgreement {
    pub agreement_id: String,
    pub admin: Address,
    pub user: Address,
    pub agent: Option<Address>,
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent_commission_rate: u32,
    pub status: ChiomaAgreementStatus,
    pub total_rent_paid: i128,
    pub payment_count: u32,
    pub signed_at: Option<u64>,
    pub witness_id: Option<Address>,
    pub payment_token: Address,
    pub next_payment_due: u64,
    pub metadata_uri: String,
    pub attributes: soroban_sdk::Vec<ChiomaAttribute>,
}

/// Mirrors `chioma::types::Attribute` field-for-field; only needed so
/// `ChiomaRentAgreement.attributes` can decode, its contents are never read
/// here.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChiomaAttribute {
    pub trait_type: String,
    pub value: String,
}

/// Cross-checks `payment`'s local agreement record against `chioma`'s
/// authoritative one before a payment is processed (#1559).
///
/// Before this fix, `payment` kept an entirely independent
/// `DataKey::Agreement` copy with no live link to `chioma` (or
/// `property_registry`), so the two could silently drift with no on-chain
/// signal -- a correctness risk for a protocol whose whole value
/// proposition is trustless on-chain state. This does not remove
/// `payment`'s local storage (it still owns payment-specific bookkeeping:
/// `next_payment_due`, `payment_history`, late fee/escalation config, none
/// of which `chioma` tracks), but it makes `chioma` the checked source of
/// truth for the fields both contracts claim to represent (tenant/landlord,
/// monthly rent, active status) by cross-contract call, on every payment,
/// rather than assuming payment's local copy is still correct.
///
/// Cross-contract call failure (the configured `chioma` contract address is
/// unset, unreachable, not actually a `chioma` instance, or reverts) is
/// handled explicitly via `try_invoke_contract` and returns
/// `ChiomaAgreementLookupFailed`/`ChiomaContractNotSet` rather than letting
/// the whole payment invocation panic and abort with an opaque host trap.
pub fn verify_agreement_with_chioma(
    env: &Env,
    chioma_contract: &Address,
    agreement_id: &String,
    local_agreement: &RentAgreement,
) -> Result<(), PaymentError> {
    let remote: ChiomaRentAgreement = match env
        .try_invoke_contract::<Option<ChiomaRentAgreement>, soroban_sdk::Error>(
            chioma_contract,
            &soroban_sdk::Symbol::new(env, "get_agreement"),
            soroban_sdk::vec![env, agreement_id.into_val(env)],
        ) {
        Ok(Ok(Some(agreement))) => agreement,
        Ok(Ok(None)) => return Err(PaymentError::ChiomaAgreementLookupFailed),
        Ok(Err(_)) | Err(_) => return Err(PaymentError::ChiomaAgreementLookupFailed),
    };

    let remote_active = remote.status == ChiomaAgreementStatus::Active;
    let local_active = local_agreement.status == AgreementStatus::Active;

    if remote.user != local_agreement.tenant
        || remote.admin != local_agreement.landlord
        || remote.monthly_rent != local_agreement.monthly_rent
        || remote_active != local_active
    {
        return Err(PaymentError::AgreementDataMismatch);
    }

    Ok(())
}

/// Calculate the rent amount for a specific period (payment number) with escalation
pub fn calculate_rent_for_period(
    base_rent: i128,
    payment_number: u32,
    config: &RentEscalationConfig,
) -> i128 {
    match config.escalation_type {
        EscalationType::None => base_rent,
        EscalationType::FixedAnnual => {
            if config.payments_per_year == 0 {
                return base_rent;
            }

            // Calculate how many years have passed since the first payment
            // payment_number is 1-indexed (1st payment, 2nd payment, etc.)
            let years_passed = (payment_number - 1) / config.payments_per_year;

            if years_passed == 0 {
                return base_rent;
            }

            // Calculate escalated rent: Rent = BaseRent * (1 + rate)^years
            let mut current_rent = base_rent;
            for _ in 0..years_passed {
                // annual_rate_bps is in basis points (1 bps = 0.01%).
                // Compounding is saturating: an extreme rate/term combination
                // must clamp rather than panic on overflow inside the contract.
                let increase = current_rent.saturating_mul(config.annual_rate_bps as i128) / 10000;
                current_rent = current_rent.saturating_add(increase);
            }
            current_rent
        }
    }
}

/// Create an immutable payment record
pub fn create_payment_record(
    _env: &Env,
    agreement_id: &String,
    amount: i128,
    landlord_amount: i128,
    agent_amount: i128,
    tenant: &Address,
    payment_number: u32,
    timestamp: u64,
) -> Result<PaymentRecord, PaymentError> {
    Ok(PaymentRecord {
        agreement_id: agreement_id.clone(),
        payment_number,
        amount,
        landlord_amount,
        agent_amount,
        timestamp,
        tenant: tenant.clone(),
    })
}

/// Calculate payment split between landlord and agent
pub fn calculate_payment_split(amount: &i128, commission_rate: &u32) -> (i128, i128) {
    // commission_rate is in basis points (1 basis point = 0.01%)
    let agent_amount = (amount * (*commission_rate as i128)) / 10000;
    let landlord_amount = amount - agent_amount;
    (landlord_amount, agent_amount)
}

/// Process rent payment with automatic commission splitting
/// This is the alternate implementation used by RentalContract
#[allow(deprecated)]
#[allow(dead_code)]
pub fn pay_rent_with_agent(
    env: Env,
    agreement_id: String,
    token: Address,
    amount: i128,
) -> Result<(), PaymentError> {
    use soroban_sdk::token::Client as TokenClient;

    // Load agreement
    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(PaymentError::InvalidAmount)?;

    // Validate agreement is active
    if agreement.status != AgreementStatus::Active {
        return Err(PaymentError::AgreementNotActive);
    }

    // Validate amount is strictly positive to prevent logical errors
    if amount <= 0 {
        return Err(PaymentError::InvalidAmount);
    }

    // Validate amount matches monthly rent exactly
    if amount != agreement.monthly_rent {
        return Err(PaymentError::InvalidAmount);
    }

    // Authorize tenant
    agreement.tenant.require_auth();

    // Calculate payment split
    let (landlord_amount, agent_amount) =
        calculate_payment_split(&amount, &agreement.agent_commission_rate);

    // Execute atomic token transfers
    let token_client = TokenClient::new(&env, &token);

    // Transfer to landlord
    token_client.transfer(&agreement.tenant, &agreement.landlord, &landlord_amount);

    // Transfer to agent if present
    if let Some(agent_address) = &agreement.agent {
        if agent_amount > 0 {
            token_client.transfer(&agreement.tenant, agent_address, &agent_amount);
        }
    }

    // Create payment record
    let timestamp = env.ledger().timestamp();
    let payment_record = create_payment_record(
        &env,
        &agreement_id,
        amount,
        landlord_amount,
        agent_amount,
        &agreement.tenant,
        agreement.payment_count + 1,
        timestamp,
    )?;

    // Update agreement totals
    agreement.total_rent_paid += amount;
    agreement.payment_count += 1;

    // Persist updated agreement
    let agreement_key = DataKey::Agreement(agreement_id.clone());
    env.storage().persistent().set(&agreement_key, &agreement);
    extend_persistent_ttl(&env, &agreement_key);

    // Persist payment record
    let payment_record_key = DataKey::PaymentRecord(agreement_id.clone(), agreement.payment_count);
    env.storage()
        .persistent()
        .set(&payment_record_key, &payment_record);
    extend_persistent_ttl(&env, &payment_record_key);

    // Emit event
    env.events().publish(
        (String::from_str(&env, "rent_paid"), agreement_id),
        (amount, landlord_amount, agent_amount, timestamp),
    );

    Ok(())
}

// --- Upgrade Functions ---

/// Propose a contract upgrade.
pub fn propose_upgrade(
    env: Env,
    proposer: Address,
    proposal_id: String,
    wasm_hash: soroban_sdk::Bytes,
    notes: String,
    delay_seconds: u64,
) -> Result<(), PaymentError> {
    upgrade::propose_upgrade(&env, proposer, proposal_id, wasm_hash, notes, delay_seconds)
}

/// Approve an upgrade proposal.
pub fn approve_upgrade(
    env: Env,
    approver: Address,
    proposal_id: String,
) -> Result<(), PaymentError> {
    upgrade::approve_upgrade(&env, approver, proposal_id)
}

/// Execute an approved upgrade.
pub fn execute_upgrade(
    env: Env,
    executor: Address,
    proposal_id: String,
) -> Result<(), PaymentError> {
    upgrade::execute_upgrade(&env, executor, proposal_id)
}

/// Get an upgrade proposal.
pub fn get_upgrade_proposal(
    env: Env,
    proposal_id: String,
) -> Result<upgrade::UpgradeProposal, PaymentError> {
    upgrade::get_upgrade_proposal(&env, proposal_id)
}
