use soroban_sdk::{contracttype, String, Symbol};

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
    RateLimitConfig,
    UserCallCount(soroban_sdk::Address, String), // (user, function_name)
    BlockCallCount(u64, String),                 // (block_number, function_name)
    PaymentRecord(String, u32),
    // Multi-sig keys
    MultiSigConfig,
    AdminProposal(String),
    ProposalCount,
    ActiveProposals,
    // Timelock keys
    TimelockAction(String),
    TimelockActionCount,
    ActiveTimelockActions,
    // Versioning keys
    CurrentVersion,
    VersionHistory,
    AgreementExtension(String),
    ExtensionHistory(String),
    EscrowFrozen(String),
    UpgradeProposal(String),
    UpgradeProposalCount,
    ActiveUpgradeProposals,
    // Gas optimisation metrics (keyed by operation name string)
    GasMetrics(String),
    // Per-function emergency pause (keyed by contract function name)
    PausedFunction(Symbol),
    // Storage layout version, bumped by `migrate` after a WASM upgrade
    StorageVersion,
    // Running contract-wide metrics (#2088), incremented on each
    // make_payment_with_token call.
    TotalTransactionCount,
    TotalTransactionVolume,
    // Manager role set (#2086): a manager can call pause() in addition to
    // the single contract admin, but cannot unpause, cannot be granted or
    // revoked by anyone other than admin, and has no other authority.
    Manager(soroban_sdk::Address),
    // Emergency withdrawal requests (#2087), keyed by the underlying
    // multi-sig proposal's id.
    EmergencyWithdrawal(String),
}
