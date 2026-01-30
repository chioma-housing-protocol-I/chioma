use crate::types::{AgreementStatus, DataKey, Error, PaymentRecord, RentAgreement};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::{contract, contractimpl, Address, Env, String};

// Types are defined in `types.rs` and imported above.

#[contract]
#[allow(dead_code)]
pub struct RentalContract;

#[contractimpl]
#[allow(dead_code)]
impl RentalContract {
    /// Process rent payment with automatic commission splitting
    #[allow(deprecated)] // Suppress warning for env.events().publish
    pub fn pay_rent(
        env: Env,
        agreement_id: String,
        token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        // Load agreement
        let mut agreement: RentAgreement = env
            .storage()
            .persistent()
            .get(&DataKey::Agreement(agreement_id.clone()))
            .ok_or(Error::InvalidAmount)?;

        // Validate agreement is active
        if agreement.status != AgreementStatus::Active {
            return Err(Error::AgreementNotActive);
        }

        // Validate amount matches monthly rent exactly
        if amount != agreement.monthly_rent {
            return Err(Error::InvalidAmount);
        }

        // Authorize tenant
        agreement.tenant.require_auth();

        // Calculate payment split
        let (landlord_amount, agent_amount) =
            calculate_payment_split(&amount, &agreement.agent_commission_rate);

        // Execute atomic token transfers
        let token_client = TokenClient::new(&env, &token);

        // Transfer to landlord
        token_client.transfer(&agreement.tenant, &agreement.landlord, &landlord_amount);

        // Transfer to agent if present
        if let Some(agent_address) = &agreement.agent {
            if agent_amount > 0 {
                token_client.transfer(&agreement.tenant, agent_address, &agent_amount);
            }
        }

        // Create payment record
        let timestamp = env.ledger().timestamp();
        let payment_record = create_payment_record(
            &env,
            &agreement_id,
            amount,
            landlord_amount,
            agent_amount,
            &agreement.tenant,
            agreement.payment_count + 1,
            timestamp,
        )?;

        // Update agreement totals
        agreement.total_rent_paid += amount;
        agreement.payment_count += 1;

        // Persist updated agreement
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id.clone()), &agreement);

        // Persist payment record
        env.storage().persistent().set(
            &DataKey::PaymentRecord(agreement_id.clone(), agreement.payment_count),
            &payment_record,
        );

        // Emit event
        env.events().publish(
            (String::from_str(&env, "rent_paid"), agreement_id),
            (amount, landlord_amount, agent_amount, timestamp),
        );

        Ok(())
    }
}

/// Create an immutable payment record
#[allow(dead_code)]
pub(crate) fn create_payment_record(
    _env: &Env,
    agreement_id: &String,
    amount: i128,
    landlord_amount: i128,
    agent_amount: i128,
    tenant: &Address,
    payment_number: u32,
    timestamp: u64,
) -> Result<PaymentRecord, Error> {
    Ok(PaymentRecord {
        agreement_id: agreement_id.clone(),
        payment_number,
        amount,
        landlord_amount,
        agent_amount,
        timestamp,
        tenant: tenant.clone(),
    })
}

#[allow(dead_code)]
pub(crate) fn calculate_payment_split(amount: &i128, commission_rate: &u32) -> (i128, i128) {
    // commission_rate is in basis points (1 basis point = 0.01%)
    let agent_amount = (amount * (*commission_rate as i128)) / 10000;
    let landlord_amount = amount - agent_amount;
    (landlord_amount, agent_amount)
}

// Tests moved to a dedicated test module file: `payment_tests.rs`
