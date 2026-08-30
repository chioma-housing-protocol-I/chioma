use soroban_sdk::{Address, Env, String};

use crate::errors::PropertyError;
use crate::events;
use crate::rate_limit;
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

    // Rate limiting check
    rate_limit::check_rate_limit(env, &landlord, "register_property")?;

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

    events::property_registered(env, property_id, landlord);

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

    // Rate limiting check
    rate_limit::check_rate_limit(env, &admin, "verify_property")?;

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

/// Transfer ownership of a property to a new landlord.
///
/// Requires authorization from the current landlord on record; the caller's
/// address alone is not sufficient, it must match `property.landlord`.
/// Verification status and metadata are left untouched by a transfer.
pub fn transfer_property(
    env: &Env,
    current_landlord: Address,
    new_landlord: Address,
    property_id: String,
) -> Result<(), PropertyError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(PropertyError::NotInitialized);
    }

    current_landlord.require_auth();

    // Rate limiting check
    rate_limit::check_rate_limit(env, &current_landlord, "transfer_property")?;

    let key = DataKey::Property(property_id.clone());
    let mut property: PropertyDetails = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(PropertyError::PropertyNotFound)?;

    if property.landlord != current_landlord {
        return Err(PropertyError::Unauthorized);
    }

    property.landlord = new_landlord.clone();

    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    events::property_transferred(env, property_id, current_landlord, new_landlord);

    Ok(())
}

/// Update the metadata hash of a registered property.
///
/// Only the landlord on record may update metadata. Since the new metadata
/// may describe a materially different property, verification is revoked
/// and must be re-granted by the admin.
pub fn update_property_metadata(
    env: &Env,
    landlord: Address,
    property_id: String,
    new_metadata_hash: String,
) -> Result<(), PropertyError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(PropertyError::NotInitialized);
    }

    landlord.require_auth();

    // Rate limiting check
    rate_limit::check_rate_limit(env, &landlord, "update_property_metadata")?;

    if new_metadata_hash.is_empty() {
        return Err(PropertyError::InvalidMetadata);
    }

    let key = DataKey::Property(property_id.clone());
    let mut property: PropertyDetails = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(PropertyError::PropertyNotFound)?;

    if property.landlord != landlord {
        return Err(PropertyError::Unauthorized);
    }

    property.metadata_hash = new_metadata_hash.clone();
    property.verified = false;
    property.verified_at = None;

    env.storage().persistent().set(&key, &property);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    events::property_metadata_updated(env, property_id, landlord, new_metadata_hash);

    Ok(())
}
