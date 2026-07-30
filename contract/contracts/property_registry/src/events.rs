use soroban_sdk::{contractevent, Address, Env, String};

/// Event emitted when the contract is initialized
/// Topics: ["initialized", admin: Address]
#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
}

/// Event emitted when a property is registered
/// Topics: ["property_registered", landlord: Address, property_id: String]
#[contractevent(topics = ["property_registered"])]
pub struct PropertyRegistered {
    #[topic]
    pub landlord: Address,
    #[topic]
    pub property_id: String,
    pub metadata_hash: String,
}

/// Event emitted when a property is verified
/// Topics: ["property_verified", admin: Address, property_id: String]
#[contractevent(topics = ["property_verified"])]
pub struct PropertyVerified {
    #[topic]
    pub admin: Address,
    #[topic]
    pub property_id: String,
}

/// Event emitted when a property's ownership is transferred
/// Topics: ["property_transferred", previous_landlord: Address, property_id: String]
#[contractevent(topics = ["property_transferred"])]
pub struct PropertyTransferred {
    #[topic]
    pub previous_landlord: Address,
    #[topic]
    pub property_id: String,
    pub new_landlord: Address,
}

/// Event emitted when a property's metadata is updated
/// Topics: ["property_metadata_updated", landlord: Address, property_id: String]
#[contractevent(topics = ["property_metadata_updated"])]
pub struct PropertyMetadataUpdated {
    #[topic]
    pub landlord: Address,
    #[topic]
    pub property_id: String,
    pub new_metadata_hash: String,
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

/// Helper function to emit property transferred event
pub(crate) fn property_transferred(
    env: &Env,
    property_id: String,
    previous_landlord: Address,
    new_landlord: Address,
) {
    PropertyTransferred {
        previous_landlord,
        property_id,
        new_landlord,
    }
    .publish(env);
}

/// Helper function to emit property metadata updated event
pub(crate) fn property_metadata_updated(
    env: &Env,
    property_id: String,
    landlord: Address,
    new_metadata_hash: String,
) {
    PropertyMetadataUpdated {
        landlord,
        property_id,
        new_metadata_hash,
    }
    .publish(env);
}
