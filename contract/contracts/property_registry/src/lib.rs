#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String};

mod errors;
mod events;
mod property;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use errors::PropertyError;
pub use property::{
    get_property, get_property_count, has_property, register_property, verify_property,
};
pub use storage::DataKey;
pub use types::{ContractState, PropertyDetails};

#[contract]
pub struct PropertyRegistryContract;

#[contractimpl]
impl PropertyRegistryContract {
    /// Initialize the contract with an admin address.
    ///
    /// # Arguments
    /// * `admin` - The address that will have admin privileges to verify properties
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    pub fn initialize(env: Env, admin: Address) -> Result<(), PropertyError> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(PropertyError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Initialized, 500000, 500000);

        let state = ContractState {
            admin: admin.clone(),
            initialized: true,
        };

        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::contract_initialized(&env, admin);

        Ok(())
    }

    /// Get the current contract state.
    ///
    /// # Returns
    /// * `Option<ContractState>` - The contract state if initialized
    pub fn get_state(env: Env) -> Option<ContractState> {
        env.storage().instance().get(&DataKey::State)
    }

    /// Register a new property on-chain.
    ///
    /// # Arguments
    /// * `landlord` - The address of the property owner
    /// * `property_id` - A unique identifier for the property
    /// * `metadata_hash` - IPFS hash or other reference to property metadata
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `PropertyAlreadyExists` - If a property with this ID already exists
    /// * `InvalidPropertyId` - If the property ID is empty
    /// * `InvalidMetadata` - If the metadata hash is empty
    pub fn register_property(
        env: Env,
        landlord: Address,
        property_id: String,
        metadata_hash: String,
    ) -> Result<(), PropertyError> {
        property::register_property(&env, landlord, property_id, metadata_hash)
    }

    /// Verify a registered property (admin only).
    ///
    /// # Arguments
    /// * `admin` - The admin address performing the verification
    /// * `property_id` - The ID of the property to verify
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the admin
    /// * `PropertyNotFound` - If the property doesn't exist
    /// * `AlreadyVerified` - If the property is already verified
    pub fn verify_property(
        env: Env,
        admin: Address,
        property_id: String,
    ) -> Result<(), PropertyError> {
        property::verify_property(&env, admin, property_id)
    }

    /// Get details of a registered property.
    ///
    /// # Arguments
    /// * `property_id` - The ID of the property to retrieve
    ///
    /// # Returns
    /// * `Option<PropertyDetails>` - The property details if it exists
    pub fn get_property(env: Env, property_id: String) -> Option<PropertyDetails> {
        property::get_property(&env, property_id)
    }

    /// Check if a property exists in the registry.
    ///
    /// # Arguments
    /// * `property_id` - The ID of the property to check
    ///
    /// # Returns
    /// * `bool` - True if the property exists
    pub fn has_property(env: Env, property_id: String) -> bool {
        property::has_property(&env, property_id)
    }

    /// Get the total count of registered properties.
    ///
    /// # Returns
    /// * `u32` - The total number of properties registered
    pub fn get_property_count(env: Env) -> u32 {
        property::get_property_count(&env)
    }
}
