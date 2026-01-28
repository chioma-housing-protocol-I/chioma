#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events},
    vec, Address, Env, String,
};

#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let words = client.hello(&String::from_str(&env, "Dev"));
    assert_eq!(
        words,
        vec![
            &env,
            String::from_str(&env, "Hello"),
            String::from_str(&env, "Dev"),
        ]
    );
}

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

#[test]
fn test_create_agreement_success() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agent = Some(Address::generate(&env));

    let agreement_id = String::from_str(&env, "AGREEMENT_001");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &agent,
        &1000, // monthly_rent
        &2000, // security_deposit
        &100,  // start_date
        &200,  // end_date
        &10,   // agent_commission_rate
    );

    // Check events
    let events = env.events().all();
    assert_eq!(events.len(), 1);
    let event = events.last().unwrap();
    // event.1 is the topics vector
    assert_eq!(event.1.len(), 1);
    // event.1.get(0) returns the topic
    use soroban_sdk::{Symbol, TryIntoVal};
    let topic: Symbol = event.1.get(0).unwrap().try_into_val(&env).unwrap();
    assert_eq!(topic, Symbol::new(&env, "agreement_created_event"));

    // Verify persistence
    let stored_agreement: types::RentAgreement = env.as_contract(&client.address, || {
        env.storage()
            .persistent()
            .get(&types::DataKey::Agreement(agreement_id.clone()))
            .unwrap()
    });

    assert_eq!(stored_agreement.agreement_id, agreement_id);
    assert_eq!(stored_agreement.monthly_rent, 1000);
    assert_eq!(stored_agreement.status, types::AgreementStatus::Draft);
    assert_eq!(stored_agreement.landlord, landlord);
    assert_eq!(stored_agreement.tenant, tenant);

    // Verify counter
    let count: u32 = env.as_contract(&client.address, || {
        env.storage()
            .instance()
            .get(&types::DataKey::AgreementCount)
            .unwrap()
    });
    assert_eq!(count, 1);
}

#[test]
fn test_create_agreement_with_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agent = Address::generate(&env);

    let agreement_id = String::from_str(&env, "AGREEMENT_WITH_AGENT");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &Some(agent.clone()),
        &1500,
        &3000,
        &1000,
        &2000,
        &5,
    );

    // Verify persistence (not directly accessible via client unless we add a getter,
    // but successful execution implies no panic)
}

#[test]
fn test_create_agreement_without_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "AGREEMENT_NO_AGENT");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1200,
        &2400,
        &500,
        &1500,
        &0,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_negative_rent_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "BAD_RENT");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &-100, // Negative rent
        &1000,
        &100,
        &200,
        &0,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_invalid_dates_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "BAD_DATES");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &200, // start_date
        &100, // end_date < start_date
        &0,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_duplicate_agreement_id() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "DUPLICATE_ID");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
    );

    // Try to create again with same ID
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_invalid_commission_rate() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "BAD_COMMISSION");

    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &101, // > 100
    );
}

fn create_test_payment(
    env: &Env,
    client: &ContractClient,
    payment_id: &str,
    agreement_id: &str,
    amount: i128,
) {
    let payer = Address::generate(env);
    let payment = types::PaymentRecord {
        payment_id: String::from_str(env, payment_id),
        agreement_id: String::from_str(env, agreement_id),
        amount,
        payment_date: 1000,
        payer,
    };

    env.as_contract(&client.address, || {
        env.storage().persistent().set(
            &types::DataKey::Payment(String::from_str(env, payment_id)),
            &payment,
        );

        let mut count: u32 = env
            .storage()
            .instance()
            .get(&types::DataKey::PaymentCount)
            .unwrap_or(0);
        count += 1;
        env.storage()
            .instance()
            .set(&types::DataKey::PaymentCount, &count);
    });
}

#[test]
fn test_get_payment() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    create_test_payment(&env, &client, "PAY_001", "AGR_001", 1000);

    let payment = client.get_payment(&String::from_str(&env, "PAY_001"));

    assert_eq!(payment.payment_id, String::from_str(&env, "PAY_001"));
    assert_eq!(payment.agreement_id, String::from_str(&env, "AGR_001"));
    assert_eq!(payment.amount, 1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_get_nonexistent_payment() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    client.get_payment(&String::from_str(&env, "NONEXISTENT"));
}

#[test]
fn test_get_payment_count() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    assert_eq!(client.get_payment_count(), 0);

    create_test_payment(&env, &client, "PAY_001", "AGR_001", 500);
    assert_eq!(client.get_payment_count(), 1);

    create_test_payment(&env, &client, "PAY_002", "AGR_002", 750);
    assert_eq!(client.get_payment_count(), 2);

    create_test_payment(&env, &client, "PAY_003", "AGR_001", 300);
    assert_eq!(client.get_payment_count(), 3);
}

#[test]
fn test_get_total_paid() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    create_test_payment(&env, &client, "0", "AGR_001", 1000);
    create_test_payment(&env, &client, "1", "AGR_001", 1500);
    create_test_payment(&env, &client, "2", "AGR_002", 2000);
    create_test_payment(&env, &client, "3", "AGR_001", 500);

    let total_agr_001 = client.get_total_paid(&String::from_str(&env, "AGR_001"));
    assert_eq!(total_agr_001, 3000);

    let total_agr_002 = client.get_total_paid(&String::from_str(&env, "AGR_002"));
    assert_eq!(total_agr_002, 2000);

    let total_nonexistent = client.get_total_paid(&String::from_str(&env, "NONEXISTENT"));
    assert_eq!(total_nonexistent, 0);
}

#[test]
fn test_get_agreement() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR_GET_TEST");

    // Create agreement first
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
    );

    // Retrieve agreement
    let agreement = client.get_agreement(&agreement_id);
    assert!(agreement.is_some());
    let agreement = agreement.unwrap();
    assert_eq!(agreement.agreement_id, agreement_id);
    assert_eq!(agreement.monthly_rent, 1000);
    assert_eq!(agreement.landlord, landlord);
    assert_eq!(agreement.tenant, tenant);
}

#[test]
fn test_get_nonexistent_agreement() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let agreement_id = String::from_str(&env, "NONEXISTENT_AGR");
    let agreement = client.get_agreement(&agreement_id);
    assert!(agreement.is_none());
}

#[test]
fn test_has_agreement() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR_HAS_TEST");

    // Agreement doesn't exist yet
    assert!(!client.has_agreement(&agreement_id));

    // Create agreement
    client.create_agreement(
        &agreement_id,
        &landlord,
        &tenant,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
    );

    // Agreement should exist now
    assert!(client.has_agreement(&agreement_id));
}

#[test]
fn test_get_agreement_count() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);

    // Initially zero
    assert_eq!(client.get_agreement_count(), 0);

    let tenant1 = Address::generate(&env);
    let landlord1 = Address::generate(&env);
    let agreement_id1 = String::from_str(&env, "AGR_COUNT_1");

    client.create_agreement(
        &agreement_id1,
        &landlord1,
        &tenant1,
        &None,
        &1000,
        &2000,
        &100,
        &200,
        &0,
    );
    assert_eq!(client.get_agreement_count(), 1);

    let tenant2 = Address::generate(&env);
    let landlord2 = Address::generate(&env);
    let agreement_id2 = String::from_str(&env, "AGR_COUNT_2");

    client.create_agreement(
        &agreement_id2,
        &landlord2,
        &tenant2,
        &None,
        &1500,
        &3000,
        &200,
        &300,
        &0,
    );
    assert_eq!(client.get_agreement_count(), 2);
}

// Note: Escrow tests are commented out because escrow functions are not yet exposed
// in the main Contract impl. Once escrow functions are exposed in lib.rs, these tests
// can be uncommented and updated to use the ContractClient.
//
// To expose escrow functions, add them to the Contract impl in lib.rs, for example:
// pub fn create_escrow(env: Env, depositor: Address, beneficiary: Address, ...) -> Result<BytesN<32>, EscrowError> {
//     EscrowContract::create(&env, depositor, beneficiary, ...)
// }
