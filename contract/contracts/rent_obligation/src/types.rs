use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RentObligation {
    pub agreement_id: String,
    pub owner: Address,
    pub minted_at: u64,
}
