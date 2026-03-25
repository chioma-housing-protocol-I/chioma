use soroban_sdk::{contracttype, Address, Env, Map, String};

use crate::errors::DisputeError;
use crate::events;
use crate::rate_limit;
use crate::storage::DataKey;
use crate::types::{
    AppealStatus, AppealVote, Arbiter, ArbiterStats, ContractState, Dispute, DisputeAppeal,
    DisputeOutcome, TimeoutConfig, Vote, VotingWeight, WeightedDisputeVotes, WeightedVote,
};

const APPEAL_WINDOW_SECONDS: u64 = 7 * 24 * 60 * 60;
const APPEAL_MIN_ARBITERS: u32 = 3;
const APPEAL_FEE: i128 = 100;
const DEFAULT_ESCROW_TIMEOUT_DAYS: u64 = 14;
const DEFAULT_DISPUTE_TIMEOUT_DAYS: u64 = 30;
const DEFAULT_PAYMENT_TIMEOUT_DAYS: u64 = 7;

pub fn get_timeout_config(env: &Env) -> TimeoutConfig {
    env.storage()
        .instance()
        .get(&DataKey::TimeoutConfig)
        .unwrap_or(TimeoutConfig {
            escrow_timeout_days: DEFAULT_ESCROW_TIMEOUT_DAYS,
            dispute_timeout_days: DEFAULT_DISPUTE_TIMEOUT_DAYS,
            payment_timeout_days: DEFAULT_PAYMENT_TIMEOUT_DAYS,
        })
}

pub fn set_timeout_config(
    env: &Env,
    admin: Address,
    config: TimeoutConfig,
) -> Result<(), DisputeError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;

    admin.require_auth();
    if admin != state.admin {
        return Err(DisputeError::Unauthorized);
    }

    if config.escrow_timeout_days == 0
        || config.dispute_timeout_days == 0
        || config.payment_timeout_days == 0
    {
        return Err(DisputeError::InvalidTimeoutConfig);
    }

    env.storage()
        .instance()
        .set(&DataKey::TimeoutConfig, &config);
    env.storage().instance().extend_ttl(500000, 500000);
    Ok(())
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AgreementStatus {
    Draft,
    Pending,
    Active,
    Completed,
    Cancelled,
    Terminated,
    Disputed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RentAgreement {
    pub agreement_id: String,
    pub landlord: Address,
    pub tenant: Address,
    pub agent: Option<Address>,
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent_commission_rate: u32,
    pub status: AgreementStatus,
    pub total_rent_paid: i128,
    pub payment_count: u32,
    pub signed_at: Option<u64>,
    pub payment_token: Address,
    pub next_payment_due: u64,
    pub payment_history: Map<u32, PaymentSplit>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentSplit {
    pub landlord_amount: i128,
    pub platform_amount: i128,
    pub token: Address,
    pub payment_date: u64,
    pub payer: Address,
}

pub fn add_arbiter(env: &Env, admin: Address, arbiter: Address) -> Result<(), DisputeError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;

    admin.require_auth();

    if admin != state.admin {
        return Err(DisputeError::Unauthorized);
    }

    let key = DataKey::Arbiter(arbiter.clone());
    if env.storage().persistent().has(&key) {
        return Err(DisputeError::ArbiterAlreadyExists);
    }

    let arbiter_info = Arbiter {
        address: arbiter.clone(),
        added_at: env.ledger().timestamp(),
        active: true,
    };

    env.storage().persistent().set(&key, &arbiter_info);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    let list_key = DataKey::ArbiterList;
    let mut arbiter_list: soroban_sdk::Vec<Address> = env
        .storage()
        .persistent()
        .get(&list_key)
        .unwrap_or(soroban_sdk::Vec::new(env));
    arbiter_list.push_back(arbiter.clone());
    env.storage().persistent().set(&list_key, &arbiter_list);
    env.storage()
        .persistent()
        .extend_ttl(&list_key, 500000, 500000);

    let count_key = DataKey::ArbiterCount;
    let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
    env.storage().persistent().set(&count_key, &(count + 1));
    env.storage()
        .persistent()
        .extend_ttl(&count_key, 500000, 500000);

    events::arbiter_added(env, admin, arbiter);

    Ok(())
}

pub fn raise_dispute(
    env: &Env,
    raiser: Address,
    agreement_id: String,
    details_hash: String,
) -> Result<(), DisputeError> {
    raiser.require_auth();

    // Rate limiting check
    rate_limit::check_rate_limit(env, &raiser, "raise_dispute")?;

    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;

    if details_hash.is_empty() {
        return Err(DisputeError::InvalidDetailsHash);
    }

    let key = DataKey::Dispute(agreement_id.clone());
    if env.storage().persistent().has(&key) {
        return Err(DisputeError::DisputeAlreadyExists);
    }

    // Cross-contract call to get agreement from chioma contract
    let agreement: Option<RentAgreement> = env.invoke_contract(
        &state.chioma_contract,
        &soroban_sdk::symbol_short!("get_agr"),
        soroban_sdk::vec![env, agreement_id.clone().into()],
    );

    let agreement = agreement.ok_or(DisputeError::AgreementNotFound)?;

    // Validate agreement is in Active status
    if agreement.status != AgreementStatus::Active {
        return Err(DisputeError::InvalidAgreementState);
    }

    // Validate raiser is either tenant or landlord
    if raiser != agreement.tenant && raiser != agreement.landlord {
        return Err(DisputeError::Unauthorized);
    }

    let dispute = Dispute {
        agreement_id: agreement_id.clone(),
        details_hash: details_hash.clone(),
        raised_at: env.ledger().timestamp(),
        resolved: false,
        resolved_at: None,
        votes_favor_landlord: 0,
        votes_favor_tenant: 0,
        voters: soroban_sdk::Vec::new(env),
    };

    env.storage().persistent().set(&key, &dispute);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    events::dispute_raised(env, agreement_id, details_hash);

    Ok(())
}

pub fn vote_on_dispute(
    env: &Env,
    arbiter: Address,
    agreement_id: String,
    favor_landlord: bool,
) -> Result<(), DisputeError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(DisputeError::NotInitialized);
    }

    arbiter.require_auth();

    // Rate limiting check
    rate_limit::check_rate_limit(env, &arbiter, "vote_on_dispute")?;

    let arbiter_key = DataKey::Arbiter(arbiter.clone());
    let arbiter_info: Arbiter = env
        .storage()
        .persistent()
        .get(&arbiter_key)
        .ok_or(DisputeError::ArbiterNotFound)?;

    if !arbiter_info.active {
        return Err(DisputeError::ArbiterNotFound);
    }

    let dispute_key = DataKey::Dispute(agreement_id.clone());
    let mut dispute: Dispute = env
        .storage()
        .persistent()
        .get(&dispute_key)
        .ok_or(DisputeError::DisputeNotFound)?;

    if dispute.resolved {
        return Err(DisputeError::DisputeAlreadyResolved);
    }

    let vote_key = DataKey::Vote(agreement_id.clone(), arbiter.clone());
    if env.storage().persistent().has(&vote_key) {
        return Err(DisputeError::AlreadyVoted);
    }

    let vote = Vote {
        arbiter: arbiter.clone(),
        agreement_id: agreement_id.clone(),
        favor_landlord,
        voted_at: env.ledger().timestamp(),
    };

    env.storage().persistent().set(&vote_key, &vote);
    env.storage()
        .persistent()
        .extend_ttl(&vote_key, 500000, 500000);

    if favor_landlord {
        dispute.votes_favor_landlord += 1;
    } else {
        dispute.votes_favor_tenant += 1;
    }
    dispute.voters.push_back(arbiter.clone());

    env.storage().persistent().set(&dispute_key, &dispute);
    env.storage()
        .persistent()
        .extend_ttl(&dispute_key, 500000, 500000);

    events::vote_cast(env, agreement_id, arbiter, favor_landlord);

    Ok(())
}

pub fn resolve_dispute(env: &Env, agreement_id: String) -> Result<DisputeOutcome, DisputeError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;

    let dispute_key = DataKey::Dispute(agreement_id.clone());
    let mut dispute: Dispute = env
        .storage()
        .persistent()
        .get(&dispute_key)
        .ok_or(DisputeError::DisputeNotFound)?;

    if dispute.resolved {
        return Err(DisputeError::DisputeAlreadyResolved);
    }

    let total_votes = dispute.votes_favor_landlord + dispute.votes_favor_tenant;

    if total_votes < state.min_votes_required {
        return Err(DisputeError::InsufficientVotes);
    }

    dispute.resolved = true;
    dispute.resolved_at = Some(env.ledger().timestamp());

    env.storage().persistent().set(&dispute_key, &dispute);
    env.storage()
        .persistent()
        .extend_ttl(&dispute_key, 500000, 500000);

    let outcome = if dispute.votes_favor_landlord > dispute.votes_favor_tenant {
        DisputeOutcome::FavorLandlord
    } else {
        DisputeOutcome::FavorTenant
    };

    events::dispute_resolved(
        env,
        agreement_id,
        outcome.clone(),
        dispute.votes_favor_landlord,
        dispute.votes_favor_tenant,
    );

    Ok(outcome)
}

pub fn resolve_dispute_on_timeout(
    env: &Env,
    agreement_id: String,
) -> Result<DisputeOutcome, DisputeError> {
    let dispute_key = DataKey::Dispute(agreement_id.clone());
    let mut dispute: Dispute = env
        .storage()
        .persistent()
        .get(&dispute_key)
        .ok_or(DisputeError::DisputeNotFound)?;

    if dispute.resolved {
        return Err(DisputeError::DisputeAlreadyResolved);
    }

    let timeout_days = get_timeout_config(env).dispute_timeout_days;
    let timeout_seconds = timeout_days.saturating_mul(86_400);
    let deadline = dispute.raised_at.saturating_add(timeout_seconds);
    let now = env.ledger().timestamp();
    if now <= deadline {
        return Err(DisputeError::TimeoutNotReached);
    }

    dispute.resolved = true;
    dispute.resolved_at = Some(now);
    env.storage().persistent().set(&dispute_key, &dispute);
    env.storage()
        .persistent()
        .extend_ttl(&dispute_key, 500000, 500000);

    let outcome = if dispute.votes_favor_landlord > dispute.votes_favor_tenant {
        DisputeOutcome::FavorLandlord
    } else {
        DisputeOutcome::FavorTenant
    };

    events::dispute_timeout(env, agreement_id.clone());
    events::dispute_resolved(
        env,
        agreement_id,
        outcome.clone(),
        dispute.votes_favor_landlord,
        dispute.votes_favor_tenant,
    );
    Ok(outcome)
}

pub fn get_dispute(env: &Env, agreement_id: String) -> Option<Dispute> {
    let key = DataKey::Dispute(agreement_id);
    env.storage().persistent().get(&key)
}

pub fn get_arbiter(env: &Env, arbiter: Address) -> Option<Arbiter> {
    let key = DataKey::Arbiter(arbiter);
    env.storage().persistent().get(&key)
}

pub fn get_arbiter_count(env: &Env) -> u32 {
    let key = DataKey::ArbiterCount;
    env.storage().persistent().get(&key).unwrap_or(0)
}

pub fn get_vote(env: &Env, agreement_id: String, arbiter: Address) -> Option<Vote> {
    let key = DataKey::Vote(agreement_id, arbiter);
    env.storage().persistent().get(&key)
}

pub fn create_appeal(
    env: &Env,
    appellant: Address,
    dispute_id: String,
    reason: String,
) -> Result<String, DisputeError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(DisputeError::NotInitialized);
    }

    appellant.require_auth();

    if reason.is_empty() {
        return Err(DisputeError::InvalidDetailsHash);
    }

    let dispute_key = DataKey::Dispute(dispute_id.clone());
    let dispute: Dispute = env
        .storage()
        .persistent()
        .get(&dispute_key)
        .ok_or(DisputeError::DisputeNotFound)?;

    if !dispute.resolved {
        return Err(DisputeError::InvalidAgreementState);
    }

    let resolved_at = dispute
        .resolved_at
        .ok_or(DisputeError::DisputeAlreadyResolved)?;
    let now = env.ledger().timestamp();

    if now > resolved_at + APPEAL_WINDOW_SECONDS {
        return Err(DisputeError::AppealWindowExpired);
    }

    let existing_appeal_key = DataKey::AppealForDispute(dispute_id.clone());
    if env.storage().persistent().has(&existing_appeal_key) {
        return Err(DisputeError::AppealAlreadyExists);
    }

    let arbiter_list_key = DataKey::ArbiterList;
    let arbiter_list: soroban_sdk::Vec<Address> = env
        .storage()
        .persistent()
        .get(&arbiter_list_key)
        .unwrap_or(soroban_sdk::Vec::new(env));

    let mut selected_arbiters = soroban_sdk::Vec::new(env);

    for arbiter in arbiter_list.iter() {
        if dispute.voters.contains(arbiter.clone()) {
            continue;
        }

        let arbiter_info: Option<Arbiter> = env
            .storage()
            .persistent()
            .get(&DataKey::Arbiter(arbiter.clone()));

        if let Some(info) = arbiter_info {
            if info.active {
                selected_arbiters.push_back(arbiter.clone());
            }
        }

        if selected_arbiters.len() >= APPEAL_MIN_ARBITERS {
            break;
        }
    }

    if selected_arbiters.len() < APPEAL_MIN_ARBITERS {
        return Err(DisputeError::InsufficientAppealArbiters);
    }

    let appeal_count_key = DataKey::AppealCount;
    let appeal_count: u32 = env
        .storage()
        .persistent()
        .get(&appeal_count_key)
        .unwrap_or(0);
    let next_count = appeal_count + 1;
    let appeal_id = dispute_id.clone();

    let appeal = DisputeAppeal {
        id: appeal_id.clone(),
        dispute_id: dispute_id.clone(),
        appellant,
        reason,
        status: AppealStatus::Pending,
        appeal_arbiters: selected_arbiters,
        votes: soroban_sdk::Vec::new(env),
        created_at: now,
        resolved_at: None,
    };

    let appeal_key = DataKey::Appeal(appeal_id.clone());
    env.storage().persistent().set(&appeal_key, &appeal);
    env.storage()
        .persistent()
        .extend_ttl(&appeal_key, 500000, 500000);

    env.storage()
        .persistent()
        .set(&existing_appeal_key, &appeal_id);
    env.storage()
        .persistent()
        .extend_ttl(&existing_appeal_key, 500000, 500000);

    env.storage()
        .persistent()
        .set(&appeal_count_key, &next_count);
    env.storage()
        .persistent()
        .extend_ttl(&appeal_count_key, 500000, 500000);

    env.storage()
        .persistent()
        .set(&DataKey::AppealFeePaid(appeal_id.clone()), &APPEAL_FEE);
    env.storage()
        .persistent()
        .set(&DataKey::AppealFeeRefunded(appeal_id.clone()), &false);

    events::appeal_created(env, appeal_id.clone(), dispute_id);

    Ok(appeal_id)
}

pub fn vote_on_appeal(
    env: &Env,
    arbiter: Address,
    appeal_id: String,
    vote: DisputeOutcome,
) -> Result<(), DisputeError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(DisputeError::NotInitialized);
    }

    arbiter.require_auth();

    let appeal_key = DataKey::Appeal(appeal_id.clone());
    let mut appeal: DisputeAppeal = env
        .storage()
        .persistent()
        .get(&appeal_key)
        .ok_or(DisputeError::AppealNotFound)?;

    match appeal.status {
        AppealStatus::Approved | AppealStatus::Rejected | AppealStatus::Cancelled => {
            return Err(DisputeError::AppealAlreadyResolved);
        }
        _ => {}
    }

    if !appeal.appeal_arbiters.contains(arbiter.clone()) {
        return Err(DisputeError::ArbiterNotEligibleForAppeal);
    }

    for existing_vote in appeal.votes.iter() {
        if existing_vote.arbiter == arbiter {
            return Err(DisputeError::AppealAlreadyVoted);
        }
    }

    if appeal.status == AppealStatus::Pending {
        appeal.status = AppealStatus::InProgress;
    }

    appeal.votes.push_back(AppealVote {
        arbiter: arbiter.clone(),
        vote,
        timestamp: env.ledger().timestamp(),
    });

    env.storage().persistent().set(&appeal_key, &appeal);
    env.storage()
        .persistent()
        .extend_ttl(&appeal_key, 500000, 500000);

    events::appeal_voted(env, appeal_id, arbiter);

    Ok(())
}

pub fn resolve_appeal(env: &Env, appeal_id: String) -> Result<(), DisputeError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(DisputeError::NotInitialized);
    }

    let appeal_key = DataKey::Appeal(appeal_id.clone());
    let mut appeal: DisputeAppeal = env
        .storage()
        .persistent()
        .get(&appeal_key)
        .ok_or(DisputeError::AppealNotFound)?;

    match appeal.status {
        AppealStatus::Approved | AppealStatus::Rejected | AppealStatus::Cancelled => {
            return Err(DisputeError::AppealAlreadyResolved);
        }
        _ => {}
    }

    if appeal.votes.len() < APPEAL_MIN_ARBITERS {
        return Err(DisputeError::InsufficientAppealVotes);
    }

    let mut votes_favor_landlord = 0u32;
    let mut votes_favor_tenant = 0u32;

    for appeal_vote in appeal.votes.iter() {
        if appeal_vote.vote == DisputeOutcome::FavorLandlord {
            votes_favor_landlord += 1;
        } else {
            votes_favor_tenant += 1;
        }
    }

    let appeal_outcome = if votes_favor_landlord > votes_favor_tenant {
        DisputeOutcome::FavorLandlord
    } else {
        DisputeOutcome::FavorTenant
    };

    let dispute: Dispute = env
        .storage()
        .persistent()
        .get(&DataKey::Dispute(appeal.dispute_id.clone()))
        .ok_or(DisputeError::DisputeNotFound)?;

    let original_outcome = dispute
        .get_outcome()
        .ok_or(DisputeError::DisputeAlreadyResolved)?;

    if appeal_outcome != original_outcome {
        appeal.status = AppealStatus::Approved;
        env.storage()
            .persistent()
            .set(&DataKey::AppealFeeRefunded(appeal_id.clone()), &true);
    } else {
        appeal.status = AppealStatus::Rejected;
        env.storage()
            .persistent()
            .set(&DataKey::AppealFeeRefunded(appeal_id.clone()), &false);
    }

    appeal.resolved_at = Some(env.ledger().timestamp());

    env.storage().persistent().set(&appeal_key, &appeal);
    env.storage()
        .persistent()
        .extend_ttl(&appeal_key, 500000, 500000);

    events::appeal_resolved(env, appeal_id, appeal_outcome);

    Ok(())
}

pub fn cancel_appeal(env: &Env, appellant: Address, appeal_id: String) -> Result<(), DisputeError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(DisputeError::NotInitialized);
    }

    appellant.require_auth();

    let appeal_key = DataKey::Appeal(appeal_id.clone());
    let mut appeal: DisputeAppeal = env
        .storage()
        .persistent()
        .get(&appeal_key)
        .ok_or(DisputeError::AppealNotFound)?;

    if appeal.appellant != appellant {
        return Err(DisputeError::Unauthorized);
    }

    match appeal.status {
        AppealStatus::Pending | AppealStatus::InProgress => {}
        _ => return Err(DisputeError::AppealNotCancelable),
    }

    appeal.status = AppealStatus::Cancelled;
    appeal.resolved_at = Some(env.ledger().timestamp());

    env.storage().persistent().set(&appeal_key, &appeal);
    env.storage()
        .persistent()
        .extend_ttl(&appeal_key, 500000, 500000);

    events::appeal_cancelled(env, appeal_id);

    Ok(())
}

pub fn get_appeal(env: &Env, appeal_id: String) -> Option<DisputeAppeal> {
    env.storage().persistent().get(&DataKey::Appeal(appeal_id))
}

// ── Weighted Voting ────────────────────────────────────────────────────────

/// Set rating and disputes-resolved count for an arbiter (admin only).
/// Rating must be 0-100.
pub fn set_arbiter_stats(
    env: &Env,
    admin: Address,
    arbiter: Address,
    rating: u32,
    disputes_resolved: u32,
) -> Result<(), DisputeError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;

    admin.require_auth();
    if admin != state.admin {
        return Err(DisputeError::Unauthorized);
    }

    if !env
        .storage()
        .persistent()
        .has(&DataKey::Arbiter(arbiter.clone()))
    {
        return Err(DisputeError::ArbiterNotFound);
    }

    if rating > 100 {
        return Err(DisputeError::InvalidRating);
    }

    let stats = ArbiterStats {
        rating,
        disputes_resolved,
    };
    let key = DataKey::ArbiterStats(arbiter.clone());
    env.storage().persistent().set(&key, &stats);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    Ok(())
}

/// Compute the voting weight for an arbiter.
///
/// Formula (integer arithmetic, scale ×100):
///   base_weight          = 100
///   rating_multiplier    = rating × 2              (0–200 representing 0.0×–2.0×)
///   experience_multiplier = min(disputes_resolved × 2, 200)
///   total_weight         = base × rating_mult/100 × exp_mult/100
///                        = rating_mult × exp_mult / 100 (minimum 1)
pub fn calculate_voting_weight(env: &Env, arbiter: Address) -> Result<u32, DisputeError> {
    let arbiter_info: Arbiter = env
        .storage()
        .persistent()
        .get(&DataKey::Arbiter(arbiter.clone()))
        .ok_or(DisputeError::ArbiterNotFound)?;

    if !arbiter_info.active {
        return Err(DisputeError::ArbiterNotFound);
    }

    let stats: ArbiterStats = env
        .storage()
        .persistent()
        .get(&DataKey::ArbiterStats(arbiter))
        .unwrap_or(ArbiterStats {
            rating: 50,
            disputes_resolved: 0,
        });

    let rating_mult = stats.rating * 2; // 0–200
    let exp_mult = if stats.disputes_resolved * 2 < 200 {
        stats.disputes_resolved * 2
    } else {
        200u32
    };

    // base(100) × rating_mult/100 × exp_mult/100 = rating_mult × exp_mult / 100
    let computed = rating_mult * exp_mult / 100;
    let total_weight = if computed == 0 { 1 } else { computed };

    Ok(total_weight)
}

/// Return the full VotingWeight breakdown for an arbiter.
pub fn get_voting_weight(env: &Env, arbiter: Address) -> Result<VotingWeight, DisputeError> {
    let arbiter_info: Arbiter = env
        .storage()
        .persistent()
        .get(&DataKey::Arbiter(arbiter.clone()))
        .ok_or(DisputeError::ArbiterNotFound)?;

    if !arbiter_info.active {
        return Err(DisputeError::ArbiterNotFound);
    }

    let stats: ArbiterStats = env
        .storage()
        .persistent()
        .get(&DataKey::ArbiterStats(arbiter.clone()))
        .unwrap_or(ArbiterStats {
            rating: 50,
            disputes_resolved: 0,
        });

    let rating_mult = stats.rating * 2;
    let exp_mult = if stats.disputes_resolved * 2 < 200 {
        stats.disputes_resolved * 2
    } else {
        200u32
    };

    let computed = rating_mult * exp_mult / 100;
    let total_weight = if computed == 0 { 1 } else { computed };

    Ok(VotingWeight {
        arbiter,
        base_weight: 100,
        rating_multiplier: rating_mult,
        experience_multiplier: exp_mult,
        total_weight,
    })
}

/// Cast a weighted vote on an open dispute.
pub fn vote_on_dispute_weighted(
    env: &Env,
    arbiter: Address,
    dispute_id: String,
    vote: DisputeOutcome,
) -> Result<(), DisputeError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(DisputeError::NotInitialized);
    }

    arbiter.require_auth();

    // Rate limiting check
    rate_limit::check_rate_limit(env, &arbiter, "vote_on_dispute_weighted")?;

    let arbiter_info: Arbiter = env
        .storage()
        .persistent()
        .get(&DataKey::Arbiter(arbiter.clone()))
        .ok_or(DisputeError::ArbiterNotFound)?;

    if !arbiter_info.active {
        return Err(DisputeError::ArbiterNotFound);
    }

    let dispute_key = DataKey::Dispute(dispute_id.clone());
    let dispute: Dispute = env
        .storage()
        .persistent()
        .get(&dispute_key)
        .ok_or(DisputeError::DisputeNotFound)?;

    if dispute.resolved {
        return Err(DisputeError::DisputeAlreadyResolved);
    }

    let wvote_key = DataKey::WeightedVote(dispute_id.clone(), arbiter.clone());
    if env.storage().persistent().has(&wvote_key) {
        return Err(DisputeError::AlreadyVoted);
    }

    let weight = calculate_voting_weight(env, arbiter.clone())?;

    let weighted_vote = WeightedVote {
        arbiter: arbiter.clone(),
        vote: vote.clone(),
        weight,
        timestamp: env.ledger().timestamp(),
    };
    env.storage().persistent().set(&wvote_key, &weighted_vote);
    env.storage()
        .persistent()
        .extend_ttl(&wvote_key, 500000, 500000);

    let wdisp_key = DataKey::WeightedDisputeVotes(dispute_id.clone());
    let mut wdisp: WeightedDisputeVotes =
        env.storage()
            .persistent()
            .get(&wdisp_key)
            .unwrap_or(WeightedDisputeVotes {
                weighted_votes_favor_landlord: 0,
                weighted_votes_favor_tenant: 0,
                voters: soroban_sdk::Vec::new(env),
            });

    match vote.clone() {
        DisputeOutcome::FavorLandlord => wdisp.weighted_votes_favor_landlord += weight,
        DisputeOutcome::FavorTenant => wdisp.weighted_votes_favor_tenant += weight,
    }

    wdisp.voters.push_back(arbiter.clone());

    env.storage().persistent().set(&wdisp_key, &wdisp);
    env.storage()
        .persistent()
        .extend_ttl(&wdisp_key, 500000, 500000);

    events::weighted_vote_cast(env, dispute_id, arbiter, weight);

    Ok(())
}

/// Resolve a dispute using weighted vote totals.
///
/// Resolution rules:
/// - Requires `min_votes_required` weighted voters.
/// - Outcome with the highest total weight wins.
/// - Tie broken by the outcome of the first vote cast (first vote wins).
pub fn resolve_dispute_weighted(
    env: &Env,
    dispute_id: String,
) -> Result<DisputeOutcome, DisputeError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;

    let dispute_key = DataKey::Dispute(dispute_id.clone());
    let mut dispute: Dispute = env
        .storage()
        .persistent()
        .get(&dispute_key)
        .ok_or(DisputeError::DisputeNotFound)?;

    if dispute.resolved {
        return Err(DisputeError::DisputeAlreadyResolved);
    }

    let wdisp_key = DataKey::WeightedDisputeVotes(dispute_id.clone());
    let wdisp: WeightedDisputeVotes =
        env.storage()
            .persistent()
            .get(&wdisp_key)
            .unwrap_or(WeightedDisputeVotes {
                weighted_votes_favor_landlord: 0,
                weighted_votes_favor_tenant: 0,
                voters: soroban_sdk::Vec::new(env),
            });

    if wdisp.voters.len() < state.min_votes_required {
        return Err(DisputeError::InsufficientVotes);
    }

    let total_weight = wdisp.weighted_votes_favor_landlord + wdisp.weighted_votes_favor_tenant;

    let outcome = match wdisp
        .weighted_votes_favor_landlord
        .cmp(&wdisp.weighted_votes_favor_tenant)
    {
        core::cmp::Ordering::Greater => DisputeOutcome::FavorLandlord,
        core::cmp::Ordering::Less => DisputeOutcome::FavorTenant,
        core::cmp::Ordering::Equal => {
            // Tie: first vote wins — look up voters[0]'s WeightedVote
            let first_voter = wdisp.voters.get(0).unwrap();
            let first_wvote: WeightedVote = env
                .storage()
                .persistent()
                .get(&DataKey::WeightedVote(dispute_id.clone(), first_voter))
                .unwrap();
            first_wvote.vote
        }
    };

    dispute.resolved = true;
    dispute.resolved_at = Some(env.ledger().timestamp());
    env.storage().persistent().set(&dispute_key, &dispute);
    env.storage()
        .persistent()
        .extend_ttl(&dispute_key, 500000, 500000);

    events::dispute_resolved_by_weight(env, dispute_id, outcome.clone(), total_weight);

    Ok(outcome)
}

/// Return all weighted votes cast for a dispute.
pub fn get_dispute_votes_weighted(
    env: &Env,
    dispute_id: String,
) -> Result<soroban_sdk::Vec<WeightedVote>, DisputeError> {
    let wdisp_key = DataKey::WeightedDisputeVotes(dispute_id.clone());
    let wdisp: WeightedDisputeVotes =
        env.storage()
            .persistent()
            .get(&wdisp_key)
            .unwrap_or(WeightedDisputeVotes {
                weighted_votes_favor_landlord: 0,
                weighted_votes_favor_tenant: 0,
                voters: soroban_sdk::Vec::new(env),
            });

    let mut votes = soroban_sdk::Vec::new(env);
    for voter in wdisp.voters.iter() {
        let wvote_key = DataKey::WeightedVote(dispute_id.clone(), voter.clone());
        if let Some(wv) = env
            .storage()
            .persistent()
            .get::<_, WeightedVote>(&wvote_key)
        {
            votes.push_back(wv);
        }
    }
    Ok(votes)
}
