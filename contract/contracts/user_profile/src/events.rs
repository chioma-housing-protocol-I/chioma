use soroban_sdk::{contractevent, Address, Bytes, Env, String};

use crate::types::AccountType;

/// Event emitted when a user profile is created
/// Topics: ["profile_created", account_id: Address]
#[contractevent(topics = ["profile_created"])]
pub struct ProfileCreated {
    #[topic]
    pub account_id: Address,
    pub account_type: AccountType,
    pub data_hash: Bytes,
}

/// Event emitted when a user profile is updated
/// Topics: ["profile_updated", account_id: Address]
#[contractevent(topics = ["profile_updated"])]
pub struct ProfileUpdated {
    #[topic]
    pub account_id: Address,
    pub account_type: AccountType,
    pub data_hash: Bytes,
}

/// Event emitted when a user profile is verified
/// Topics: ["profile_verified", account_id: Address]
#[contractevent(topics = ["profile_verified"])]
pub struct ProfileVerified {
    #[topic]
    pub account_id: Address,
    pub verified_by: Address,
    pub verified_at: u64,
}

/// Event emitted when a user profile is unverified
/// Topics: ["profile_unverified", account_id: Address]
#[contractevent(topics = ["profile_unverified"])]
pub struct ProfileUnverified {
    #[topic]
    pub account_id: Address,
    pub unverified_by: Address,
    pub reason: String,
}

/// Event emitted when a user profile is deleted
/// Topics: ["profile_deleted", account_id: Address]
#[contractevent(topics = ["profile_deleted"])]
pub struct ProfileDeleted {
    #[topic]
    pub account_id: Address,
    pub deleted_by: Address,
    pub deleted_at: u64,
}

/// Event emitted when the platform admin is updated
/// Topics: ["platform_admin_updated", old_admin: Address, new_admin: Address]
#[contractevent(topics = ["platform_admin_updated"])]
pub struct PlatformAdminUpdated {
    #[topic]
    pub old_admin: Address,
    #[topic]
    pub new_admin: Address,
    pub updated_at: u64,
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

/// Helper function to emit profile created event
pub(crate) fn profile_created(
    env: &Env,
    account_id: Address,
    account_type: AccountType,
    data_hash: Bytes,
) {
    ProfileCreated {
        account_id,
        account_type,
        data_hash,
    }
    .publish(env);
}

/// Helper function to emit profile updated event
pub(crate) fn profile_updated(
    env: &Env,
    account_id: Address,
    account_type: AccountType,
    data_hash: Bytes,
) {
    ProfileUpdated {
        account_id,
        account_type,
        data_hash,
    }
    .publish(env);
}

/// Helper function to emit profile verified event
pub(crate) fn profile_verified(env: &Env, account_id: Address, verified_by: Address) {
    ProfileVerified {
        account_id,
        verified_by,
        verified_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit profile unverified event
pub(crate) fn profile_unverified(
    env: &Env,
    account_id: Address,
    unverified_by: Address,
    reason: String,
) {
    ProfileUnverified {
        account_id,
        unverified_by,
        reason,
    }
    .publish(env);
}

/// Helper function to emit profile deleted event
pub(crate) fn profile_deleted(env: &Env, account_id: Address, deleted_by: Address) {
    ProfileDeleted {
        account_id,
        deleted_by,
        deleted_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit platform admin updated event
pub(crate) fn platform_admin_updated(env: &Env, old_admin: Address, new_admin: Address) {
    PlatformAdminUpdated {
        old_admin,
        new_admin,
        updated_at: env.ledger().timestamp(),
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
