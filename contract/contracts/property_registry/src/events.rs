use soroban_sdk::{contractevent, Address, Bytes, Env, String};

/// Event emitted when the contract is initialized
/// Topics: ["initialized", admin: Address]
#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub initialized_at: u64,
}

/// Event emitted when a property is registered
/// Topics: ["property_registered", property_id: String, owner: Address]
#[contractevent(topics = ["property_registered"])]
pub struct PropertyRegistered {
    #[topic]
    pub property_id: String,
    #[topic]
    pub owner: Address,
    pub registered_at: u64,
}

/// Event emitted when a property is verified
/// Topics: ["property_verified", property_id: String, admin: Address]
#[contractevent(topics = ["property_verified"])]
pub struct PropertyVerified {
    #[topic]
    pub property_id: String,
    #[topic]
    pub admin: Address,
    pub verified_at: u64,
}

/// Event emitted when a property is updated
/// Topics: ["property_updated", property_id: String, updater: Address]
#[contractevent(topics = ["property_updated"])]
pub struct PropertyUpdated {
    #[topic]
    pub property_id: String,
    #[topic]
    pub updater: Address,
    pub updated_at: u64,
}

/// Event emitted when property admin is updated
/// Topics: ["admin_updated", old_admin: Address, new_admin: Address]
#[contractevent(topics = ["admin_updated"])]
pub struct AdminUpdated {
    #[topic]
    pub old_admin: Address,
    #[topic]
    pub new_admin: Address,
    pub updated_at: u64,
}

/// Event emitted when property metadata is updated
/// Topics: ["metadata_updated", property_id: String, owner: Address]
#[contractevent(topics = ["metadata_updated"])]
pub struct MetadataUpdated {
    #[topic]
    pub property_id: String,
    #[topic]
    pub owner: Address,
    pub data_hash: Bytes,
}

/// Event emitted when a property ownership is transferred
/// Topics: ["ownership_transferred", property_id: String, new_owner: Address]
#[contractevent(topics = ["ownership_transferred"])]
pub struct OwnershipTransferred {
    #[topic]
    pub property_id: String,
    #[topic]
    pub new_owner: Address,
    pub transferred_at: u64,
}

/// Event emitted when a contract upgrade is proposed
/// Topics: ["upgrade_proposed", proposal_id: String]
#[contractevent(topics = ["upgrade_proposed"])]
pub struct UpgradeProposed {
    #[topic]
    pub proposal_id: String,
    pub proposer: Address,
    pub eta: u64,
    pub created_at: u64,
}

/// Event emitted when a contract upgrade proposal is approved
/// Topics: ["upgrade_approved", proposal_id: String]
#[contractevent(topics = ["upgrade_approved"])]
pub struct UpgradeApproved {
    #[topic]
    pub proposal_id: String,
    pub approver: Address,
    pub approval_count: u32,
}

/// Event emitted when a contract upgrade is executed
/// Topics: ["upgrade_executed", proposal_id: String]
#[contractevent(topics = ["upgrade_executed"])]
pub struct UpgradeExecuted {
    #[topic]
    pub proposal_id: String,
    pub executor: Address,
    pub executed_at: u64,
}

/// Helper function to emit contract initialized event
pub(crate) fn contract_initialized(env: &Env, admin: Address) {
    ContractInitialized {
        admin,
        initialized_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit property registered event
pub(crate) fn property_registered(env: &Env, property_id: String, owner: Address) {
    PropertyRegistered {
        property_id,
        owner,
        registered_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit property verified event
pub(crate) fn property_verified(env: &Env, property_id: String, admin: Address) {
    PropertyVerified {
        property_id,
        admin,
        verified_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit property updated event
pub(crate) fn property_updated(env: &Env, property_id: String, updater: Address) {
    PropertyUpdated {
        property_id,
        updater,
        updated_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit admin updated event
pub(crate) fn admin_updated(env: &Env, old_admin: Address, new_admin: Address) {
    AdminUpdated {
        old_admin,
        new_admin,
        updated_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit metadata updated event
pub(crate) fn metadata_updated(env: &Env, property_id: String, owner: Address, data_hash: Bytes) {
    MetadataUpdated {
        property_id,
        owner,
        data_hash,
    }
    .publish(env);
}

/// Helper function to emit ownership transferred event
pub(crate) fn ownership_transferred(env: &Env, property_id: String, new_owner: Address) {
    OwnershipTransferred {
        property_id,
        new_owner,
        transferred_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit upgrade proposed event
pub(crate) fn upgrade_proposed(
    env: &Env,
    proposal_id: String,
    proposer: Address,
    eta: u64,
) {
    UpgradeProposed {
        proposal_id,
        proposer,
        eta,
        created_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit upgrade approved event
pub(crate) fn upgrade_approved(
    env: &Env,
    proposal_id: String,
    approver: Address,
    approval_count: u32,
) {
    UpgradeApproved {
        proposal_id,
        approver,
        approval_count,
    }
    .publish(env);
}

/// Helper function to emit upgrade executed event
pub(crate) fn upgrade_executed(env: &Env, proposal_id: String, executor: Address) {
    UpgradeExecuted {
        proposal_id,
        executor,
        executed_at: env.ledger().timestamp(),
    }
    .publish(env);
}
