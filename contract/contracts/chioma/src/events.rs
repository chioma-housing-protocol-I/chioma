use crate::Config;
use soroban_sdk::{contractevent, Address, Env, String};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementCreatedEvent {
    pub agreement_id: String,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementSigned {
    pub agreement_id: String,
    pub landlord: Address,
    pub tenant: Address,
    pub signed_at: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractInitialized {
    pub admin: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigUpdated {
    pub old_fee_bps: u32,
    pub new_fee_bps: u32,
    pub old_fee_collector: Address,
    pub new_fee_collector: Address,
    pub old_paused: bool,
    pub new_paused: bool,
}

pub(crate) fn contract_initialized(env: &Env, admin: Address) {
    ContractInitialized { admin }.publish(env);
}

pub(crate) fn config_updated(env: &Env, old_config: Config, new_config: Config) {
    ConfigUpdated {
        old_fee_bps: old_config.fee_bps,
        new_fee_bps: new_config.fee_bps,
        old_fee_collector: old_config.fee_collector,
        new_fee_collector: new_config.fee_collector,
        old_paused: old_config.paused,
        new_paused: new_config.paused,
    }
    .publish(env);
}
