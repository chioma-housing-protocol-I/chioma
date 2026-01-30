use soroban_sdk::{contracterror, contracttype, Address, Bytes, Map, String};

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
pub struct PaymentRecord {
    pub agreement_id: String,
    pub payment_number: u32,
    pub amount: i128,
    pub landlord_amount: i128,
    pub agent_amount: i128,
    pub timestamp: u64,
    pub tenant: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserProfile {
    pub version: String,
    pub account_type: u32,
    pub updated: u64,
    pub data_hash: Bytes,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentSplit {
    pub landlord_amount: i128,
    pub platform_amount: i128,
    pub token: Address,
    pub payment_date: u64,
}

#[contracttype]
pub enum DataKey {
    Agreement(String),
    AgreementCount,
    Payment(String),
    PaymentRecord(String, u32),
    PaymentCount,
    UserProfile(Address),
    PlatformFeeCollector,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AgreementAlreadyExists = 4,
    InvalidAmount = 5,
    InvalidDate = 6,
    InvalidCommissionRate = 7,
    AgreementNotActive = 10,
    PaymentNotFound = 11,
    PaymentFailed = 12,
    AgreementNotFound = 13,
    NotTenant = 14,
    InvalidState = 15,
    Expired = 16,
    InvalidPaymentAmount = 17,
    PaymentNotDue = 18,
    RateLimited = 20,
    ProfileNotFound = 21,
    InvalidAccountType = 22,
    InvalidDataHash = 23,
    PlatformFeeCollector = 24,
}
