use soroban_sdk::{contract, contractimpl, Address, Bytes, Env, String};

use crate::storage::DataKey;
use crate::types::{AccountType, UserProfile};

#[contract]
pub struct UserProfileContract;

#[contractimpl]
impl UserProfileContract {
    /// Initialize the contract with an admin address
    /// Can only be called once
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("Contract already initialized");
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Initialized, &true);
    }

    /// Create a new user profile
    /// Only the account owner can create their profile
    pub fn create_profile(
        env: Env,
        account_id: Address,
        account_type: AccountType,
        data_hash: Bytes,
    ) -> UserProfile {
        // Require authorization from the account owner
        account_id.require_auth();

        let key = DataKey::Profile(account_id.clone());

        // Check if profile already exists
        if env.storage().persistent().has(&key) {
            panic!("Profile already exists for this account");
        }

        // Validate data hash length (should be 32 bytes for SHA-256 or 46 bytes for IPFS CID)
        let hash_len = data_hash.len();
        if hash_len != 32 && hash_len != 46 {
            panic!("Invalid data hash length");
        }

        // Create profile with current timestamp
        let timestamp = env.ledger().timestamp();
        let version = String::from_str(&env, "1.0");

        let profile = UserProfile {
            account_id: account_id.clone(),
            version,
            account_type,
            last_updated: timestamp,
            data_hash,
            is_verified: false,
        };

        // Store profile in persistent storage
        env.storage().persistent().set(&key, &profile);

        profile
    }

    /// Update an existing profile
    /// Only the account owner can update their profile
    pub fn update_profile(
        env: Env,
        account_id: Address,
        account_type: Option<AccountType>,
        data_hash: Option<Bytes>,
    ) -> UserProfile {
        // Require authorization from the account owner
        account_id.require_auth();

        let key = DataKey::Profile(account_id.clone());

        // Get existing profile
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Profile not found"));

        // Update account type if provided
        if let Some(new_type) = account_type {
            profile.account_type = new_type;
        }

        // Update data hash if provided
        if let Some(new_hash) = data_hash {
            let hash_len = new_hash.len();
            if hash_len != 32 && hash_len != 46 {
                panic!("Invalid data hash length");
            }
            profile.data_hash = new_hash;
        }

        // Update timestamp
        profile.last_updated = env.ledger().timestamp();

        // Save updated profile
        env.storage().persistent().set(&key, &profile);

        profile
    }

    /// Get a user profile by account address
    /// Public read access
    pub fn get_profile(env: Env, account_id: Address) -> Option<UserProfile> {
        let key = DataKey::Profile(account_id);
        env.storage().persistent().get(&key)
    }

    /// Check if a profile exists for an account
    /// Public read access
    pub fn has_profile(env: Env, account_id: Address) -> bool {
        let key = DataKey::Profile(account_id);
        env.storage().persistent().has(&key)
    }

    /// Verify a user profile (admin only)
    /// Sets is_verified flag to true
    pub fn verify_profile(env: Env, admin: Address, account_id: Address) -> UserProfile {
        // Require admin authorization
        admin.require_auth();

        // Verify admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not configured"));

        if admin != stored_admin {
            panic!("Unauthorized: caller is not admin");
        }

        let key = DataKey::Profile(account_id.clone());

        // Get profile
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Profile not found"));

        // Set verification status
        profile.is_verified = true;
        profile.last_updated = env.ledger().timestamp();

        // Save updated profile
        env.storage().persistent().set(&key, &profile);

        profile
    }

    /// Unverify a user profile (admin only)
    /// Sets is_verified flag to false
    pub fn unverify_profile(env: Env, admin: Address, account_id: Address) -> UserProfile {
        // Require admin authorization
        admin.require_auth();

        // Verify admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not configured"));

        if admin != stored_admin {
            panic!("Unauthorized: caller is not admin");
        }

        let key = DataKey::Profile(account_id.clone());

        // Get profile
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Profile not found"));

        // Remove verification status
        profile.is_verified = false;
        profile.last_updated = env.ledger().timestamp();

        // Save updated profile
        env.storage().persistent().set(&key, &profile);

        profile
    }

    /// Get the contract admin address
    /// Public read access
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not configured"))
    }

    /// Delete a profile (owner only)
    /// Removes all on-chain data for the account
    pub fn delete_profile(env: Env, account_id: Address) {
        // Require authorization from the account owner
        account_id.require_auth();

        let key = DataKey::Profile(account_id.clone());

        if !env.storage().persistent().has(&key) {
            panic!("Profile not found");
        }

        // Remove profile from storage
        env.storage().persistent().remove(&key);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Bytes, Env};

    #[test]
    fn test_initialize_contract() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        env.mock_all_auths();

        client.initialize(&admin);

        let stored_admin = client.get_admin();
        assert_eq!(stored_admin, admin);
    }

    #[test]
    #[should_panic(expected = "Contract already initialized")]
    fn test_initialize_twice_fails() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        env.mock_all_auths();

        client.initialize(&admin);
        client.initialize(&admin);
    }

    #[test]
    fn test_create_profile() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();

        client.initialize(&admin);

        let profile = client.create_profile(&user, &AccountType::Tenant, &data_hash);

        assert_eq!(profile.account_id, user);
        assert_eq!(profile.account_type, AccountType::Tenant);
        assert!(!profile.is_verified);
        assert_eq!(profile.data_hash, data_hash);
    }

    #[test]
    #[should_panic(expected = "Profile already exists")]
    fn test_create_duplicate_profile_fails() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();

        client.initialize(&admin);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);
        client.create_profile(&user, &AccountType::Landlord, &data_hash);
    }

    #[test]
    fn test_get_profile() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();

        client.initialize(&admin);
        client.create_profile(&user, &AccountType::Landlord, &data_hash);

        let profile = client.get_profile(&user);
        assert!(profile.is_some());

        let profile = profile.unwrap();
        assert_eq!(profile.account_id, user);
        assert_eq!(profile.account_type, AccountType::Landlord);
    }

    #[test]
    fn test_has_profile() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let non_existent = Address::generate(&env);
        let data_hash = Bytes::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();

        client.initialize(&admin);

        assert!(!client.has_profile(&user));

        client.create_profile(&user, &AccountType::Agent, &data_hash);

        assert!(client.has_profile(&user));
        assert!(!client.has_profile(&non_existent));
    }

    #[test]
    fn test_update_profile() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_array(&env, &[0u8; 32]);
        let new_hash = Bytes::from_array(&env, &[1u8; 32]);

        env.mock_all_auths();

        client.initialize(&admin);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);

        let updated =
            client.update_profile(&user, &Some(AccountType::Landlord), &Some(new_hash.clone()));

        assert_eq!(updated.account_type, AccountType::Landlord);
        assert_eq!(updated.data_hash, new_hash);
    }

    #[test]
    fn test_update_profile_partial() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();

        client.initialize(&admin);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);

        // Update only account type
        let updated = client.update_profile(&user, &Some(AccountType::Agent), &None);

        assert_eq!(updated.account_type, AccountType::Agent);
        assert_eq!(updated.data_hash, data_hash);
    }

    #[test]
    fn test_verify_profile() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();

        client.initialize(&admin);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);

        let verified = client.verify_profile(&admin, &user);

        assert!(verified.is_verified);
    }

    #[test]
    fn test_unverify_profile() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();

        client.initialize(&admin);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);
        client.verify_profile(&admin, &user);

        let unverified = client.unverify_profile(&admin, &user);

        assert!(!unverified.is_verified);
    }

    #[test]
    fn test_delete_profile() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_array(&env, &[0u8; 32]);

        env.mock_all_auths();

        client.initialize(&admin);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);

        assert!(client.has_profile(&user));

        client.delete_profile(&user);

        assert!(!client.has_profile(&user));
    }

    #[test]
    #[should_panic(expected = "Invalid data hash length")]
    fn test_invalid_hash_length() {
        let env = Env::default();
        let contract_id = env.register(UserProfileContract, ());
        let client = UserProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let invalid_hash = Bytes::from_array(&env, &[0u8; 16]); // Wrong length

        env.mock_all_auths();

        client.initialize(&admin);
        client.create_profile(&user, &AccountType::Tenant, &invalid_hash);
    }
}
