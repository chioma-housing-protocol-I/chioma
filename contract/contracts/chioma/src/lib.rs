#![no_std]
#![allow(clippy::too_many_arguments)]
use soroban_sdk::{contract, contractevent, contractimpl, token, vec, Address, Bytes, Env, Map, String, Vec};

mod types;
use types::{AgreementStatus, DataKey, Error, PaymentRecord, PaymentSplit, RentAgreement, UserProfile};

const SEP29_PROFILE_VERSION: &str = "1.0";
const MAX_DATA_HASH_LEN: u32 = 128;
const MIN_UPDATE_INTERVAL: u64 = 60;

pub mod escrow;

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementCreatedEvent {
    pub agreement_id: String,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementSigned {
    pub agreement_id: String,
    pub landlord: Address,
    pub tenant: Address,
    pub signed_at: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RentPaid {
    pub agreement_id: String,
    pub payer: Address,
    pub landlord: Address,
    pub amount: i128,
    pub platform_fee: i128,
    pub payment_date: u64,
    pub token: Address,
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
        payment_token: Address,
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
            total_rent_paid: 0,
            payment_count: 0,
            signed_at: None,
            payment_token,
            next_payment_due: start_date,
            payment_history: Map::new(&env),
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

    /// Allows a tenant to sign and accept a rental agreement.
    /// Transitions the agreement from Pending to Active state.
    ///
    /// Authorization:
    /// - Tenant MUST authorize the signing
    pub fn sign_agreement(env: Env, tenant: Address, agreement_id: String) -> Result<(), Error> {
        // Tenant MUST authorize signing
        tenant.require_auth();

        // Retrieve the agreement
        let mut agreement: RentAgreement = env
            .storage()
            .persistent()
            .get(&DataKey::Agreement(agreement_id.clone()))
            .ok_or(Error::AgreementNotFound)?;

        // Validate caller is the intended tenant
        if agreement.tenant != tenant {
            return Err(Error::NotTenant);
        }

        // Validate agreement is in Pending status
        if agreement.status != AgreementStatus::Pending {
            return Err(Error::InvalidState);
        }

        // Validate agreement has not expired
        let current_time = env.ledger().timestamp();
        if current_time > agreement.end_date {
            return Err(Error::Expired);
        }

        // Update agreement status and record signing time
        agreement.status = AgreementStatus::Active;
        agreement.signed_at = Some(current_time);

        // Save updated agreement
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id.clone()), &agreement);

        // Emit AgreementSigned event
        AgreementSigned {
            agreement_id,
            landlord: agreement.landlord.clone(),
            tenant: tenant.clone(),
            signed_at: current_time,
        }
        .publish(&env);

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
        account_type: u32,
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
            if now.saturating_sub(existing.updated) < MIN_UPDATE_INTERVAL {
                return Err(Error::RateLimited);
            }
        }

        let profile = UserProfile {
            version: String::from_str(&env, SEP29_PROFILE_VERSION),
            account_type,
            updated: now,
            data_hash,
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

    fn validate_account_type(account_type: &u32) -> Result<(), Error> {
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
    /// Sets the platform fee collector address
    pub fn set_platform_fee_collector(env: Env, collector: Address) {
        collector.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeCollector, &collector);
    }

    /// Process rent payment with 90/10 landlord/platform split
    /// Follows checks-effects-interactions pattern for reentrancy safety
    pub fn pay_rent(
        env: Env,
        from: Address,
        agreement_id: String,
        payment_amount: i128,
    ) -> Result<(), Error> {
        // Authorization
        from.require_auth();

        // Load agreement
        let mut agreement: RentAgreement = env
            .storage()
            .persistent()
            .get(&DataKey::Agreement(agreement_id.clone()))
            .ok_or(Error::AgreementNotFound)?;

        // Validation
        if agreement.status != AgreementStatus::Active {
            return Err(Error::AgreementNotActive);
        }

        if from != agreement.tenant {
            return Err(Error::NotTenant);
        }

        if payment_amount != agreement.monthly_rent {
            return Err(Error::InvalidPaymentAmount);
        }

        let current_time = env.ledger().timestamp();
        if current_time < agreement.next_payment_due {
            return Err(Error::PaymentNotDue);
        }

        // Calculate 90/10 split
        let landlord_amount = (payment_amount * 90) / 100;
        let platform_amount = payment_amount - landlord_amount;

        let platform_collector: Address = env
            .storage()
            .instance()
            .get(&DataKey::PlatformFeeCollector)
            .ok_or(Error::PaymentFailed)?;

        // Effects: Update state BEFORE external calls
        let payment_month = agreement.payment_history.len();
        agreement.payment_history.set(
            payment_month,
            PaymentSplit {
                landlord_amount,
                platform_amount,
                token: agreement.payment_token.clone(),
                payment_date: current_time,
            },
        );
        agreement.next_payment_due = current_time + 2_592_000; // 30 days

        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id.clone()), &agreement);

        // Interactions: External calls AFTER state updates
        let token_client = token::Client::new(&env, &agreement.payment_token);
        token_client.transfer(&from, &agreement.landlord, &landlord_amount);
        token_client.transfer(&from, &platform_collector, &platform_amount);

        // Event
        RentPaid {
            agreement_id,
            payer: from,
            landlord: agreement.landlord.clone(),
            amount: payment_amount,
            platform_fee: platform_amount,
            payment_date: current_time,
            token: agreement.payment_token.clone(),
        }
        .publish(&env);

        Ok(())
    }

    /// Get payment details for a specific month
    pub fn get_payment_split(
        env: Env,
        agreement_id: String,
        month: u32,
    ) -> Result<PaymentSplit, Error> {
        let agreement: RentAgreement = env
            .storage()
            .persistent()
            .get(&DataKey::Agreement(agreement_id))
            .ok_or(Error::AgreementNotFound)?;

        agreement
            .payment_history
            .get(month)
            .ok_or(Error::PaymentNotFound)
    }
}
mod payment;
#[cfg(test)]
mod test;

// Only compile the payment tests during `cargo test`
#[cfg(test)]
mod payment_tests;
