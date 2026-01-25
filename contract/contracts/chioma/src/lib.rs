#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, vec, Address, Env, String, Vec,
};

mod types;
use types::{AgreementStatus, DataKey, RentAgreement};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AgreementAlreadyExists = 4,
    InvalidAmount = 5,
    InvalidDate = 6,
    InvalidCommissionRate = 7,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgreementCreatedEvent {
    pub agreement_id: String,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn hello(env: Env, to: String) -> Vec<String> {
        vec![&env, String::from_str(&env, "Hello"), to]
    }

    /// Creates a new rent agreement and stores it on-chain.
    ///
    /// Authorization:
    /// - Tenant MUST authorize creation (prevents landlord-only spoofing)
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
}

mod test;
