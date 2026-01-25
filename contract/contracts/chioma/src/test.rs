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
