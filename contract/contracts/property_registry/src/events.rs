use soroban_sdk::{contractevent, Address, Env, String};

/// Event emitted when the contract is initialized
/// Topics: ["initialized", admin: Address]
#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
}

/// Event emitted when a property is registered
/// Topics: ["prop_reg", landlord: Address, property_id: String]
#[contractevent(topics = ["prop_reg"])]
pub struct PropertyRegistered {
    #[topic]
    pub landlord: Address,
    #[topic]
    pub property_id: String,
    pub metadata_hash: String,
}

/// Event emitted when a property is verified
/// Topics: ["prop_ver", admin: Address, property_id: String]
#[contractevent(topics = ["prop_ver"])]
pub struct PropertyVerified {
    #[topic]
    pub admin: Address,
    #[topic]
    pub property_id: String,
}

/// Helper function to emit contract initialized event
pub(crate) fn contract_initialized(env: &Env, admin: Address) {
    ContractInitialized { admin }.publish(env);
}

/// Helper function to emit property registered event
pub(crate) fn property_registered(
    env: &Env,
    property_id: String,
    landlord: Address,
    metadata_hash: String,
) {
    PropertyRegistered {
        landlord,
        property_id,
        metadata_hash,
    }
    .publish(env);
}

/// Helper function to emit property verified event
pub(crate) fn property_verified(env: &Env, property_id: String, admin: Address) {
    PropertyVerified { admin, property_id }.publish(env);
}
