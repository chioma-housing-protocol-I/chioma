use soroban_sdk::{contracttype, Address, Map, String, Vec};

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
