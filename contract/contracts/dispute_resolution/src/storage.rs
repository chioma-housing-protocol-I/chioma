use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Arbiter(Address),
    ArbiterList,
    State,
    Initialized,
    ArbiterCount,
    Dispute(String),
    Vote(String, Address),
    Appeal(String),
    AppealForDispute(String),
    AppealCount,
    AppealFeePaid(String),
    AppealFeeRefunded(String),
}
