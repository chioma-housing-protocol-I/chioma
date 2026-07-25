use soroban_sdk::{contracttype, Address, Bytes, String, Vec};

// ─── Timelock Types ───────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TimelockActionType {
    UpdateAdmin,
    UpdateConfig,
    UpdateRates,
    PauseContract,
    UnpauseContract,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TimelockAction {
    pub id: String,
    pub action_type: TimelockActionType,
    pub target: Address,
    pub data: Bytes,
    pub eta: u64, // Execution timestamp (Unix seconds)
    pub executed: bool,
    pub cancelled: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AgreementStatus {
    Draft,
    Pending,
    PendingApproval,
    Active,
    Completed,
    Cancelled,
    Terminated,
    Disputed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ExtensionStatus {
    Proposed,
    Accepted,
    Rejected,
    Active,
    Completed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementExtension {
    pub id: String,
    pub original_agreement_id: String,
    pub extension_start: u64,
    pub extension_end: u64,
    pub extension_rent: i128,
    pub extension_deposit: i128,
    pub status: ExtensionStatus,
    pub created_at: u64,
    pub proposed_by: Address,
    pub landlord_accepted: bool,
    pub tenant_accepted: bool,
    pub last_reason: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExtensionHistory {
    pub agreement_id: String,
    pub extensions: Vec<AgreementExtension>,
    pub total_extensions: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractUpgradeProposal {
    pub id: String,
    pub proposer: Address,
    pub wasm_hash: Bytes,
    pub approvals: Vec<Address>,
    pub required_signatures: u32,
    pub eta: u64,
    pub executed: bool,
    pub cancelled: bool,
    pub notes: String,
    pub created_at: u64,
}

// ─── Multi-Sig Types ──────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MultiSigConfig {
    pub admins: Vec<Address>,
    pub required_signatures: u32,
    pub total_admins: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ActionType {
    Pause,
    Unpause,
    UpdateConfig,
    UpdateRate,
    AddAdmin,
    RemoveAdmin,
    UpdateRequiredSignatures,
    EmergencyAction,
    SetRateLimit,
    AddToken,
    RemoveToken,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminProposal {
    pub id: String,
    pub proposer: Address,
    pub action_type: ActionType,
    pub target: Option<Address>,
    pub data: Bytes,
    pub approvals: Vec<Address>,
    pub approval_count: u32,
    pub executed: bool,
    pub created_at: u64,
    pub expiry: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Attribute {
    pub trait_type: String,
    pub value: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RentAgreement {
    pub agreement_id: String,
    pub admin: Address,
    pub user: Address,
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
    pub witness_id: Option<Address>,
    pub payment_token: Address,
    pub next_payment_due: u64,
    pub metadata_uri: String,
    pub attributes: Vec<Attribute>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentSplit {
    pub admin_amount: i128,
    pub platform_amount: i128,
    pub token: Address,
    pub payment_date: u64,
    pub payer: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub struct Config {
    pub fee_bps: u32,
    pub fee_collector: Address,
    pub paused: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractState {
    pub admin: Address,
    pub config: Config,
    pub initialized: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PauseState {
    pub is_paused: bool,
    pub paused_at: u64,
    pub paused_by: Address,
    pub pause_reason: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SupportedToken {
    pub token_address: Address,
    pub symbol: String,
    pub decimals: u32,
    pub enabled: bool,
    pub min_amount: i128,
    pub max_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementWithToken {
    pub agreement_id: String,
    pub payment_token: Address,
    pub rent_amount: i128,
    pub deposit_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenExchangeRate {
    pub from_token: Address,
    pub to_token: Address,
    pub rate: i128, // Scaled by 10^18
    pub updated_at: u64,
}

// ─── Security Deposit Interest ────────────────────────────────────────────────

/// How often interest compounds.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CompoundingFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Annually,
}

/// Who receives accrued interest.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InterestRecipient {
    Tenant,
    Landlord,
    Split, // 50/50
}

/// Configuration for deposit interest on a specific agreement.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositInterestConfig {
    pub agreement_id: String,
    /// Annual interest rate in basis points (0–10 000 = 0–100 %).
    pub annual_rate: u32,
    pub compounding_frequency: CompoundingFrequency,
    pub interest_recipient: InterestRecipient,
}

/// A single interest-accrual snapshot.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InterestAccrual {
    pub accrued_at: u64,
    pub amount: i128,
    pub rate: u32,
    pub balance: i128,
}

/// Cumulative interest state for a deposit (keyed by agreement / escrow id).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositInterest {
    pub escrow_id: String,
    pub principal: i128,
    pub accrued_interest: i128,
    pub total_with_interest: i128,
    pub last_accrual_date: u64,
    pub accrual_history: Vec<InterestAccrual>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ErrorContext {
    pub error_code: u32,
    pub error_message: String,
    pub details: String,
    pub timestamp: u64,
    pub operation: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltyConfig {
    pub token_id: String,
    pub creator: Address,
    pub royalty_percentage: u32, // basis points (0-2500 for 0-25%)
    pub royalty_recipient: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltyPayment {
    pub token_id: String,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub royalty_amount: i128,
    pub timestamp: u64,
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
pub struct AgreementTerms {
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent_commission_rate: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RateLimitReason {
    BlockLimitExceeded,
    DailyLimitExceeded,
    CooldownNotMet,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementInput {
    pub agreement_id: String,
    pub admin: Address,
    pub user: Address,
    pub agent: Option<Address>,
    pub terms: AgreementTerms,
    pub payment_token: Address,
    pub metadata_uri: String,
    pub attributes: Vec<Attribute>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum VersionStatus {
    Active,
    Deprecated,
    Archived,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub label: String,
    pub status: VersionStatus,
    pub hash: Bytes,
    pub updated_at: u64,
}
