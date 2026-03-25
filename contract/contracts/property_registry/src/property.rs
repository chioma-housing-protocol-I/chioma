use soroban_sdk::{Address, Env, String};

use crate::errors::PropertyError;
use crate::events;
use crate::storage::DataKey;
use crate::types::{ContractState, PropertyDetails};

pub fn register_property(
    env: &Env,
    landlord: Address,
    property_id: String,
    metadata_hash: String,
) -> Result<(), PropertyError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(PropertyError::NotInitialized);
    }

    landlord.require_auth();

    if property_id.is_empty() {
        return Err(PropertyError::InvalidPropertyId);
    }

    if metadata_hash.is_empty() {
        return Err(PropertyError::InvalidMetadata);
    }

    let key = DataKey::Property(property_id.clone());
    if env.storage().persistent().has(&key) {
        return Err(PropertyError::PropertyAlreadyExists);
    }

    let property = PropertyDetails {
        property_id: property_id.clone(),
        landlord: landlord.clone(),
        metadata_hash: metadata_hash.clone(),
        verified: false,
        registered_at: env.ledger().timestamp(),
        verified_at: None,
    };

    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    let count_key = DataKey::PropertyCount;
    let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
    env.storage().persistent().set(&count_key, &(count + 1));
    env.storage()
        .persistent()
        .extend_ttl(&count_key, 500000, 500000);

    events::property_registered(env, property_id, landlord, metadata_hash);

    Ok(())
}

pub fn verify_property(
    env: &Env,
    admin: Address,
    property_id: String,
) -> Result<(), PropertyError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(PropertyError::NotInitialized)?;

    admin.require_auth();

    if admin != state.admin {
        return Err(PropertyError::Unauthorized);
    }

    let key = DataKey::Property(property_id.clone());
    let mut property: PropertyDetails = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(PropertyError::PropertyNotFound)?;

    if property.verified {
        return Err(PropertyError::AlreadyVerified);
    }

    property.verified = true;
    property.verified_at = Some(env.ledger().timestamp());

    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    events::property_verified(env, property_id, admin);

    Ok(())
}

pub fn get_property(env: &Env, property_id: String) -> Option<PropertyDetails> {
    let key = DataKey::Property(property_id);
    env.storage().persistent().get(&key)
}

pub fn has_property(env: &Env, property_id: String) -> bool {
    let key = DataKey::Property(property_id);
    env.storage().persistent().has(&key)
}

pub fn get_property_count(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::PropertyCount)
        .unwrap_or(0)
}
