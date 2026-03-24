use soroban_sdk::{contracttype, Address, String, Vec};

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
