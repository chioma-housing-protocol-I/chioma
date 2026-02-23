use crate::Config;
use soroban_sdk::{contractevent, Address, Env, String};

/// Event emitted when the contract is initialized
/// Topics: ["initialized", admin: Address]
#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub fee_bps: u32,
    pub fee_collector: Address,
    pub paused: bool,
}

/// Event emitted when an agreement is created
/// Topics: ["agr_created", tenant: Address, landlord: Address]
#[contractevent(topics = ["agr_created"])]
pub struct AgreementCreated {
    #[topic]
    pub tenant: Address,
    #[topic]
    pub landlord: Address,
    pub agreement_id: String,
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent: Option<Address>,
}

/// Event emitted when an agreement is signed
/// Topics: ["agr_signed", tenant: Address, landlord: Address]
#[contractevent(topics = ["agr_signed"])]
pub struct AgreementSigned {
    #[topic]
    pub tenant: Address,
    #[topic]
    pub landlord: Address,
    pub agreement_id: String,
    pub signed_at: u64,
}

/// Event emitted when the contract configuration is updated
/// Topics: ["cfg_updated", admin: Address]
#[contractevent(topics = ["cfg_updated"])]
pub struct ConfigUpdated {
    #[topic]
    pub admin: Address,
    pub old_fee_bps: u32,
    pub new_fee_bps: u32,
    pub old_fee_collector: Address,
    pub new_fee_collector: Address,
    pub old_paused: bool,
    pub new_paused: bool,
}

/// Helper function to emit contract initialized event
pub(crate) fn contract_initialized(env: &Env, admin: Address, config: Config) {
    ContractInitialized {
        admin,
        fee_bps: config.fee_bps,
        fee_collector: config.fee_collector,
        paused: config.paused,
    }
    .publish(env);
}

/// Helper function to emit agreement created event
#[allow(clippy::too_many_arguments)]
pub(crate) fn agreement_created(
    env: &Env,
    agreement_id: String,
    tenant: Address,
    landlord: Address,
    monthly_rent: i128,
    security_deposit: i128,
    start_date: u64,
    end_date: u64,
    agent: Option<Address>,
) {
    AgreementCreated {
        tenant,
        landlord,
        agreement_id,
        monthly_rent,
        security_deposit,
        start_date,
        end_date,
        agent,
    }
    .publish(env);
}

/// Helper function to emit agreement signed event
pub(crate) fn agreement_signed(
    env: &Env,
    agreement_id: String,
    tenant: Address,
    landlord: Address,
    signed_at: u64,
) {
    AgreementSigned {
        tenant,
        landlord,
        agreement_id,
        signed_at,
    }
    .publish(env);
}

/// Helper function to emit config updated event
pub(crate) fn config_updated(env: &Env, admin: Address, old_config: Config, new_config: Config) {
    ConfigUpdated {
        admin,
        old_fee_bps: old_config.fee_bps,
        new_fee_bps: new_config.fee_bps,
        old_fee_collector: old_config.fee_collector,
        new_fee_collector: new_config.fee_collector,
        old_paused: old_config.paused,
        new_paused: new_config.paused,
    }
    .publish(env);
}
