#![no_std]
#![allow(clippy::too_many_arguments)]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, vec, Address, Bytes, Env, String, Vec,
};

mod types;
use types::{AgreementStatus, DataKey, PaymentRecord, RentAgreement, UserProfile};

const MAX_DATA_HASH_LEN: u32 = 128;
const MIN_UPDATE_INTERVAL: u64 = 60;

pub mod escrow;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AgreementAlreadyExists = 4,
    InvalidAmount = 5,
    InvalidDate = 6,
    InvalidCommissionRate = 7,
    PaymentNotFound = 11,
    InvalidAccountType = 12,
    InvalidDataHash = 13,
    ProfileNotFound = 14,
    RateLimited = 15,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementCreatedEvent {
    pub agreement_id: String,
}

#[contract]
pub struct Contract;

#[allow(clippy::too_many_arguments)]
#[contractimpl]
impl Contract {
    pub fn hello(env: Env, to: String) -> Vec<String> {
        vec![&env, String::from_str(&env, "Hello"), to]
    }

    /// Creates a new rent agreement and stores it on-chain.
    ///
    /// Authorization:
    /// - Tenant MUST authorize creation (prevents landlord-only spoofing)
    #[allow(clippy::too_many_arguments)]
    pub fn create_agreement(
        env: Env,
        agreement_id: String,
        landlord: Address,
        tenant: Address,
        agent: Option<Address>,
        monthly_rent: i128,
        security_deposit: i128,
        start_date: u64,
        end_date: u64,
        agent_commission_rate: u32,
    ) -> Result<(), Error> {
        // Tenant MUST authorize creation
        tenant.require_auth();

        // Validate inputs
        Self::validate_agreement_params(
            &monthly_rent,
            &security_deposit,
            &start_date,
            &end_date,
            &agent_commission_rate,
        )?;

        // Check for duplicate agreement_id
        if env
            .storage()
            .persistent()
            .has(&DataKey::Agreement(agreement_id.clone()))
        {
            return Err(Error::AgreementAlreadyExists);
        }

        // Initialize agreement
        let agreement = RentAgreement {
            agreement_id: agreement_id.clone(),
            landlord,
            tenant,
            agent,
            monthly_rent,
            security_deposit,
            start_date,
            end_date,
            agent_commission_rate,
            status: AgreementStatus::Draft,
        };

        // Store agreement
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id.clone()), &agreement);

        // Update counter
        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::AgreementCount)
            .unwrap_or(0);
        count += 1;
        env.storage()
            .instance()
            .set(&DataKey::AgreementCount, &count);

        // Emit event
        AgreementCreatedEvent { agreement_id }.publish(&env);

        Ok(())
    }

    /// Retrieves a rent agreement by its unique identifier.
    pub fn get_agreement(env: Env, agreement_id: String) -> Option<RentAgreement> {
        env.storage()
            .persistent()
            .get(&DataKey::Agreement(agreement_id))
    }

    /// Checks whether a rent agreement exists for the given identifier.
    pub fn has_agreement(env: Env, agreement_id: String) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Agreement(agreement_id))
    }

    /// Returns the total number of rent agreements created.
    pub fn get_agreement_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::AgreementCount)
            .unwrap_or(0)
    }

    fn validate_agreement_params(
        monthly_rent: &i128,
        security_deposit: &i128,
        start_date: &u64,
        end_date: &u64,
        agent_commission_rate: &u32,
    ) -> Result<(), Error> {
        if *monthly_rent <= 0 || *security_deposit < 0 {
            return Err(Error::InvalidAmount);
        }

        if *start_date >= *end_date {
            return Err(Error::InvalidDate);
        }

        if *agent_commission_rate > 100 {
            return Err(Error::InvalidCommissionRate);
        }

        Ok(())
    }

    pub fn get_payment(env: Env, payment_id: String) -> Result<PaymentRecord, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Payment(payment_id))
            .ok_or(Error::PaymentNotFound)
    }

    pub fn get_payment_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::PaymentCount)
            .unwrap_or(0)
    }

    pub fn get_total_paid(env: Env, agreement_id: String) -> Result<i128, Error> {
        let payment_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::PaymentCount)
            .unwrap_or(0);

        let mut total: i128 = 0;

        for i in 0..payment_count {
            let payment_id = Self::u32_to_string(&env, i);
            if let Some(payment) = env
                .storage()
                .persistent()
                .get::<DataKey, PaymentRecord>(&DataKey::Payment(payment_id))
            {
                if payment.agreement_id == agreement_id {
                    total += payment.amount;
                }
            }
        }

        Ok(total)
    }

    pub fn update_profile(
        env: Env,
        account: Address,
        account_type: u8,
        data_hash: Bytes,
    ) -> Result<(), Error> {
        account.require_auth();

        Self::validate_account_type(&account_type)?;
        Self::validate_data_hash(&data_hash)?;

        let now = env.ledger().timestamp();
        if let Some(existing) = env
            .storage()
            .persistent()
            .get::<DataKey, UserProfile>(&DataKey::UserProfile(account.clone()))
        {
            if now.saturating_sub(existing.last_updated) < MIN_UPDATE_INTERVAL {
                return Err(Error::RateLimited);
            }
        }

        let is_verified = env
            .storage()
            .persistent()
            .get::<DataKey, UserProfile>(&DataKey::UserProfile(account.clone()))
            .map(|profile| profile.is_verified)
            .unwrap_or(false);

        let profile = UserProfile {
            account_id: account.clone(),
            account_type,
            data_hash,
            last_updated: now,
            is_verified,
        };

        env.storage()
            .persistent()
            .set(&DataKey::UserProfile(account), &profile);

        Ok(())
    }

    pub fn get_profile(env: Env, account: Address) -> Result<UserProfile, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::UserProfile(account))
            .ok_or(Error::ProfileNotFound)
    }

    pub fn delete_profile(env: Env, account: Address) -> Result<(), Error> {
        account.require_auth();

        if !env
            .storage()
            .persistent()
            .has(&DataKey::UserProfile(account.clone()))
        {
            return Err(Error::ProfileNotFound);
        }

        env.storage()
            .persistent()
            .remove(&DataKey::UserProfile(account));
        Ok(())
    }

    fn u32_to_string(env: &Env, num: u32) -> String {
        match num {
            0 => String::from_str(env, "0"),
            1 => String::from_str(env, "1"),
            2 => String::from_str(env, "2"),
            3 => String::from_str(env, "3"),
            4 => String::from_str(env, "4"),
            5 => String::from_str(env, "5"),
            6 => String::from_str(env, "6"),
            7 => String::from_str(env, "7"),
            8 => String::from_str(env, "8"),
            9 => String::from_str(env, "9"),
            10 => String::from_str(env, "10"),
            _ => String::from_str(env, "unknown"),
        }
    }

    fn validate_account_type(account_type: &u8) -> Result<(), Error> {
        if !(1..=3).contains(account_type) {
            return Err(Error::InvalidAccountType);
        }
        Ok(())
    }

    fn validate_data_hash(data_hash: &Bytes) -> Result<(), Error> {
        if data_hash.is_empty() || data_hash.len() > MAX_DATA_HASH_LEN {
            return Err(Error::InvalidDataHash);
        }
        Ok(())
    }
}

mod test;
