use soroban_sdk::{contracttype, Address, String, Vec};

// ── Weighted Voting Types ──────────────────────────────────────────────────

/// Admin-set stats used to compute an arbiter's voting weight.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ArbiterStats {
    /// 0-100; drives rating_multiplier (rating/50 → 0.0x-2.0x)
    pub rating: u32,
    /// Total disputes the arbiter has resolved; drives experience_multiplier
    pub disputes_resolved: u32,
}

/// Computed voting weight for an arbiter.
/// Multipliers are stored scaled ×100 (e.g. 50 = 0.50×, 200 = 2.00×).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VotingWeight {
    pub arbiter: Address,
    /// Always 100
    pub base_weight: u32,
    /// rating × 2  (range 0–200, representing 0.0×–2.0×)
    pub rating_multiplier: u32,
    /// min(disputes_resolved × 2, 200)  (range 0–200)
    pub experience_multiplier: u32,
    /// base × rating_mult/100 × exp_mult/100, minimum 1
    pub total_weight: u32,
}

/// A single weighted vote cast by an arbiter.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WeightedVote {
    pub arbiter: Address,
    pub vote: DisputeOutcome,
    pub weight: u32,
    pub timestamp: u64,
}

/// Accumulated weighted-voting state for a dispute.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WeightedDisputeVotes {
    pub weighted_votes_favor_landlord: u32,
    pub weighted_votes_favor_tenant: u32,
    /// Ordered list of arbiters who have cast a weighted vote.
    /// voters[0] is used for tie-breaking (first vote wins).
    pub voters: Vec<Address>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeOutcome {
    FavorLandlord,
    FavorTenant,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractState {
    pub admin: Address,
    pub initialized: bool,
    pub min_votes_required: u32,
    pub chioma_contract: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TimeoutConfig {
    pub escrow_timeout_days: u64,
    pub dispute_timeout_days: u64,
    pub payment_timeout_days: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Arbiter {
    pub address: Address,
    pub added_at: u64,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Dispute {
    pub agreement_id: String,
    pub details_hash: String,
    pub raised_at: u64,
    pub resolved: bool,
    pub resolved_at: Option<u64>,
    pub votes_favor_landlord: u32,
    pub votes_favor_tenant: u32,
    pub voters: Vec<Address>,
}

impl Dispute {
    pub fn get_outcome(&self) -> Option<DisputeOutcome> {
        if !self.resolved {
            return None;
        }

        if self.votes_favor_landlord > self.votes_favor_tenant {
            Some(DisputeOutcome::FavorLandlord)
        } else {
            Some(DisputeOutcome::FavorTenant)
        }
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Vote {
    pub arbiter: Address,
    pub agreement_id: String,
    pub favor_landlord: bool,
    pub voted_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AppealStatus {
    Pending,
    InProgress,
    Approved,
    Rejected,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AppealVote {
    pub arbiter: Address,
    pub vote: DisputeOutcome,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisputeAppeal {
    pub id: String,
    pub dispute_id: String,
    pub appellant: Address,
    pub reason: String,
    pub status: AppealStatus,
    pub appeal_arbiters: Vec<Address>,
    pub votes: Vec<AppealVote>,
    pub created_at: u64,
    pub resolved_at: Option<u64>,
}

// ─── Rate Limiting Types ──────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RateLimitConfig {
    pub max_calls_per_block: u32,
    pub max_calls_per_user_per_day: u32,
    pub cooldown_blocks: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserCallCount {
    pub user: Address,
    pub call_count: u32,
    pub last_call_block: u64,
    pub daily_count: u32,
    pub daily_reset_block: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RateLimitReason {
    BlockLimitExceeded,
    DailyLimitExceeded,
    CooldownNotMet,
}
