#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, Env, Symbol, Vec};

// Profile data structure version
const PROFILE_VERSION: u32 = 1;

// Account type enum
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AccountType {
    Tenant = 0,
    Landlord = 1,
    Agent = 2,
}

// User profile structure stored on-chain
#[contracttype]
#[derive(Clone, Debug)]
pub struct UserProfile {
    pub owner: Address,
    pub version: u32,
    pub account_type: AccountType,
    pub last_updated: u64,
    pub data_hash: Bytes,
    pub is_verified: bool,
}

// Storage keys
#[contracttype]
#[derive(Clone)]
enum DataKey {
    Profile(Address),
    Admin,
}

#[contract]
pub struct ProfileContract;

#[contractimpl]
impl ProfileContract {
    /// Initialize the contract with an admin address
    pub fn init_profiles(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Create a new user profile
    pub fn create_profile(
        env: Env,
        owner: Address,
        account_type: AccountType,
        data_hash: Bytes,
    ) -> UserProfile {
        owner.require_auth();

        let key = DataKey::Profile(owner.clone());
        
        if env.storage().persistent().has(&key) {
            panic!("Profile already exists");
        }

        let profile = UserProfile {
            owner: owner.clone(),
            version: PROFILE_VERSION,
            account_type,
            last_updated: env.ledger().timestamp(),
            data_hash,
            is_verified: false,
        };

        env.storage().persistent().set(&key, &profile);
        
        profile
    }

    /// Update an existing profile
    pub fn update_profile(
        env: Env,
        owner: Address,
        account_type: Option<AccountType>,
        data_hash: Option<Bytes>,
    ) -> UserProfile {
        owner.require_auth();

        let key = DataKey::Profile(owner.clone());
        
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Profile not found"));

        if let Some(new_type) = account_type {
            profile.account_type = new_type;
        }

        if let Some(new_hash) = data_hash {
            profile.data_hash = new_hash;
        }

        profile.last_updated = env.ledger().timestamp();

        env.storage().persistent().set(&key, &profile);
        
        profile
    }

    /// Get a user profile
    pub fn get_profile(env: Env, owner: Address) -> Option<UserProfile> {
        let key = DataKey::Profile(owner);
        env.storage().persistent().get(&key)
    }

    /// Check if a profile exists
    pub fn has_profile(env: Env, owner: Address) -> bool {
        let key = DataKey::Profile(owner);
        env.storage().persistent().has(&key)
    }

    /// Verify a user profile (admin only)
    pub fn verify_profile(env: Env, admin: Address, owner: Address) -> UserProfile {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not set"));

        if admin != stored_admin {
            panic!("Unauthorized: only admin can verify profiles");
        }

        let key = DataKey::Profile(owner.clone());
        
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Profile not found"));

        profile.is_verified = true;
        profile.last_updated = env.ledger().timestamp();

        env.storage().persistent().set(&key, &profile);
        
        profile
    }

    /// Get contract admin
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not set"))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_create_and_get_profile() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ProfileContract);
        let client = ProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_slice(&env, &[1, 2, 3, 4]);

        env.mock_all_auths();

        client.init_profiles(&admin);
        
        let profile = client.create_profile(&user, &AccountType::Tenant, &data_hash);

        assert_eq!(profile.owner, user);
        assert_eq!(profile.version, PROFILE_VERSION);
        assert_eq!(profile.account_type, AccountType::Tenant);
        assert_eq!(profile.is_verified, false);

        let retrieved = client.get_profile(&user);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().owner, user);
    }

    #[test]
    fn test_update_profile() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ProfileContract);
        let client = ProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_slice(&env, &[1, 2, 3, 4]);
        let new_hash = Bytes::from_slice(&env, &[5, 6, 7, 8]);

        env.mock_all_auths();

        client.init_profiles(&admin);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);

        let updated = client.update_profile(
            &user,
            &Some(AccountType::Landlord),
            &Some(new_hash.clone()),
        );

        assert_eq!(updated.account_type, AccountType::Landlord);
        assert_eq!(updated.data_hash, new_hash);
    }

    #[test]
    fn test_verify_profile() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ProfileContract);
        let client = ProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_slice(&env, &[1, 2, 3, 4]);

        env.mock_all_auths();

        client.init_profiles(&admin);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);

        let verified = client.verify_profile(&admin, &user);
        assert_eq!(verified.is_verified, true);
    }

    #[test]
    #[should_panic(expected = "Profile already exists")]
    fn test_duplicate_profile() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ProfileContract);
        let client = ProfileContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let data_hash = Bytes::from_slice(&env, &[1, 2, 3, 4]);

        env.mock_all_auths();

        client.init_profiles(&admin);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);
        client.create_profile(&user, &AccountType::Tenant, &data_hash);
    }
}
