use soroban_sdk::{contracttype, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Agreement(String),
    AgreementCount,
    State,
    PauseState,
    Initialized,
    SupportedToken(soroban_sdk::Address),
    SupportedTokens,
    ExchangeRate(soroban_sdk::Address, soroban_sdk::Address),
    AgreementToken(String),
    DepositInterestConfig(String),
    DepositInterest(String),
    ErrorLog(u32),
    ErrorLogCount,
    RoyaltyConfig(String),
    RoyaltyPayments(String),
    PaymentRecord(String, u32),
}
