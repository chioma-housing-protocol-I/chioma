use soroban_sdk::{contractevent, Address, Bytes, Env};
use crate::types::AccountType;

#[contractevent(topics = ["profile", "created"])]
pub struct ProfileCreated {
    #[topic]
    pub account_id: Address,
    pub account_type: AccountType,
    pub data_hash: Bytes,
}

#[contractevent(topics = ["profile", "updated"])]
pub struct ProfileUpdated {
    #[topic]
    pub account_id: Address,
    pub account_type: AccountType,
    pub data_hash: Bytes,
}

#[contractevent(topics = ["profile", "verified"])]
pub struct ProfileVerified {
    #[topic]
    pub account_id: Address,
}

#[contractevent(topics = ["profile", "unverified"])]
pub struct ProfileUnverified {
    #[topic]
    pub account_id: Address,
}

#[contractevent(topics = ["profile", "deleted"])]
pub struct ProfileDeleted {
    #[topic]
    pub account_id: Address,
}

#[contractevent(topics = ["init"])]
pub struct Initialized {
    #[topic]
    pub admin: Address,
}

/// Profile created event
pub fn profile_created(env: &Env, account_id: Address, account_type: AccountType, data_hash: Bytes) {
    ProfileCreated {
        account_id,
        account_type,
        data_hash,
    }
    .publish(env);
}

/// Profile updated event
pub fn profile_updated(env: &Env, account_id: Address, account_type: AccountType, data_hash: Bytes) {
    ProfileUpdated {
        account_id,
        account_type,
        data_hash,
    }
    .publish(env);
}

/// Profile verified event
pub fn profile_verified(env: &Env, account_id: Address) {
    ProfileVerified { account_id }.publish(env);
}

/// Profile unverified event
pub fn profile_unverified(env: &Env, account_id: Address) {
    ProfileUnverified { account_id }.publish(env);
}

/// Profile deleted event
pub fn profile_deleted(env: &Env, account_id: Address) {
    ProfileDeleted { account_id }.publish(env);
}

/// Contract initialized event
pub fn initialized(env: &Env, admin: Address) {
    Initialized { admin }.publish(env);
}
