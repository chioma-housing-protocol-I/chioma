use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RentObligation {
    pub agreement_id: String,
    pub owner: Address,
    pub minted_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BurnRecord {
    pub token_id: String,
    pub burned_by: Address,
    pub burned_at: u64,
    pub reason: String,
}
