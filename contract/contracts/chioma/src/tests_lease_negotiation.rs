//! Integration-style tests for the lease extension (negotiation) flow:
//! propose → counterparty accept → landlord activate, plus error paths and queries.

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String, Vec,
};

const SECONDS_PER_MONTH: u64 = 30 * 24 * 60 * 60;

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

/// Initialize contract (system admin + config) and set a stable ledger time for date validation.
fn setup_initialized_client(env: &Env) -> (ContractClient<'_>, Address) {
    env.mock_all_auths();
    let client = create_contract(env);
    let system_admin = Address::generate(env);
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
        paused: false,
    };
    client.initialize(&system_admin, &config);
    env.ledger().with_mut(|li| li.timestamp = 100);
    (client, system_admin)
}

/// Draft agreement then force Pending (same pattern as `tests.rs`) so tenant can sign.
fn create_pending_agreement(
    env: &Env,
    client: &ContractClient<'_>,
    agreement_id: &str,
    tenant: &Address,
    landlord: &Address,
) {
    client.create_agreement(&AgreementInput {
        agreement_id: String::from_str(env, agreement_id).clone(),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(env).clone(),
        metadata_uri: String::from_str(env, "").clone(),
        attributes: Vec::new(env).clone(),
    });

    let mut agreement = client
        .get_agreement(&String::from_str(env, agreement_id))
        .unwrap();
    agreement.status = AgreementStatus::Pending;

    env.as_contract(&client.address, || {
        env.storage().persistent().set(
            &DataKey::Agreement(String::from_str(env, agreement_id)),
            &agreement,
        );
    });
}

/// Pending → tenant signs → witness approves → Active.
fn create_active_agreement(
    env: &Env,
    client: &ContractClient<'_>,
    agreement_id: &str,
    tenant: &Address,
    landlord: &Address,
    witness: &Address,
) {
    create_pending_agreement(env, client, agreement_id, tenant, landlord);
    let aid = String::from_str(env, agreement_id);
    client.sign_agreement(tenant, &aid);
    client.approve_agreement(witness, &aid);
    let agr = client.get_agreement(&aid).unwrap();
    assert_eq!(agr.status, AgreementStatus::Active);
}

#[test]
fn lease_extension_landlord_proposes_tenant_accepts_landlord_activates() {
    let env = Env::default();
    let (client, _system_admin) = setup_initialized_client(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_001";
    let agreement_id = String::from_str(&env, agreement_id_str);

    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let before = client.get_agreement(&agreement_id).unwrap();
    let expected_end = before.end_date + 3 * SECONDS_PER_MONTH;

    let extension_id = client.propose_extension(
        &landlord,
        &agreement_id,
        &3u32,
        &Some(1500_i128),
        &Some(2500_i128),
    );
    assert_eq!(extension_id, agreement_id);

    let ext_proposed = client.get_extension(&extension_id);
    assert_eq!(ext_proposed.status, ExtensionStatus::Proposed);
    assert!(ext_proposed.landlord_accepted);
    assert!(!ext_proposed.tenant_accepted);
    assert_eq!(ext_proposed.extension_rent, 1500);
    assert_eq!(ext_proposed.extension_deposit, 2500);
    assert_eq!(ext_proposed.extension_start, before.end_date);
    assert_eq!(ext_proposed.extension_end, expected_end);

    let hist1 = client.get_extension_history(&agreement_id);
    assert_eq!(hist1.total_extensions, 1);
    assert_eq!(hist1.extensions.len(), 1);

    client.accept_extension(&tenant, &extension_id);

    let ext_accepted = client.get_extension(&extension_id);
    assert_eq!(ext_accepted.status, ExtensionStatus::Accepted);
    assert!(ext_accepted.landlord_accepted && ext_accepted.tenant_accepted);

    client.activate_extension(&landlord, &extension_id);

    let ext_active = client.get_extension(&extension_id);
    assert_eq!(ext_active.status, ExtensionStatus::Active);

    let after = client.get_agreement(&agreement_id).unwrap();
    assert_eq!(after.end_date, expected_end);
    assert_eq!(after.monthly_rent, 1500);
    assert_eq!(after.security_deposit, 2500);
    assert_eq!(
        client.get_current_agreement_end(&agreement_id),
        expected_end
    );
}

#[test]
fn lease_extension_tenant_proposes_landlord_accepts_landlord_activates() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_002";
    let agreement_id = String::from_str(&env, agreement_id_str);

    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let before_end = client.get_agreement(&agreement_id).unwrap().end_date;
    let months = 2u32;
    let extension_id = client.propose_extension(&tenant, &agreement_id, &months, &None, &None);

    let ext = client.get_extension(&extension_id);
    assert_eq!(ext.status, ExtensionStatus::Proposed);
    assert!(ext.tenant_accepted);
    assert!(!ext.landlord_accepted);
    assert_eq!(ext.extension_rent, 1000);
    assert_eq!(ext.extension_deposit, 2000);

    client.accept_extension(&landlord, &extension_id);
    client.activate_extension(&landlord, &extension_id);

    let expected_end = before_end + u64::from(months) * SECONDS_PER_MONTH;
    assert_eq!(
        client.get_agreement(&agreement_id).unwrap().end_date,
        expected_end
    );
}

#[test]
fn propose_extension_zero_months_returns_invalid_input() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_BAD_MONTHS";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let res = client.try_propose_extension(&landlord, &agreement_id, &0u32, &None, &None);
    assert_eq!(res, Err(Ok(RentalError::InvalidInput)));
}

#[test]
fn propose_extension_stranger_unauthorized() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let stranger = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_UNAUTH_PROP";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let res = client.try_propose_extension(&stranger, &agreement_id, &1u32, &None, &None);
    assert_eq!(res, Err(Ok(RentalError::Unauthorized)));
}

#[test]
fn propose_extension_agreement_not_found() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let landlord = Address::generate(&env);
    let missing = String::from_str(&env, "NO_SUCH_AGR");

    let res = client.try_propose_extension(&landlord, &missing, &1u32, &None, &None);
    assert_eq!(res, Err(Ok(RentalError::AgreementNotFound)));
}

#[test]
fn accept_extension_stranger_unauthorized() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let stranger = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_UNAUTH_ACC";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let extension_id = client.propose_extension(&landlord, &agreement_id, &1u32, &None, &None);

    let res = client.try_accept_extension(&stranger, &extension_id);
    assert_eq!(res, Err(Ok(RentalError::Unauthorized)));
}

#[test]
fn accept_extension_after_fully_accepted_is_invalid_state() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_DOUBLE_ACC";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let extension_id = client.propose_extension(&landlord, &agreement_id, &1u32, &None, &None);
    client.accept_extension(&tenant, &extension_id);

    let res = client.try_accept_extension(&landlord, &extension_id);
    assert_eq!(res, Err(Ok(RentalError::InvalidState)));
}

#[test]
fn activate_extension_before_accepted_invalid_state() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_ACT_EARLY";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let extension_id = client.propose_extension(&landlord, &agreement_id, &1u32, &None, &None);

    let res = client.try_activate_extension(&landlord, &extension_id);
    assert_eq!(res, Err(Ok(RentalError::InvalidState)));
}

#[test]
fn activate_extension_non_landlord_unauthorized() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_ACT_NON_ADMIN";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let extension_id = client.propose_extension(&landlord, &agreement_id, &1u32, &None, &None);
    client.accept_extension(&tenant, &extension_id);

    let res = client.try_activate_extension(&tenant, &extension_id);
    assert_eq!(res, Err(Ok(RentalError::Unauthorized)));
}

#[test]
fn reject_extension_sets_status_and_reason() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_REJECT";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let extension_id = client.propose_extension(&landlord, &agreement_id, &2u32, &None, &None);

    let reason = String::from_str(&env, "terms not acceptable");
    client.reject_extension(&tenant, &extension_id, &reason);

    let ext = client.get_extension(&extension_id);
    assert_eq!(ext.status, ExtensionStatus::Rejected);
    assert_eq!(ext.last_reason, Some(reason));

    let res_activate = client.try_activate_extension(&landlord, &extension_id);
    assert_eq!(res_activate, Err(Ok(RentalError::InvalidState)));
}

#[test]
fn cancel_extension_after_accept_prevents_activation() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_CANCEL_POST_ACC";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let extension_id = client.propose_extension(&landlord, &agreement_id, &1u32, &None, &None);
    client.accept_extension(&tenant, &extension_id);

    client.cancel_extension(
        &tenant,
        &extension_id,
        &String::from_str(&env, "changed mind"),
    );

    let ext = client.get_extension(&extension_id);
    assert_eq!(ext.status, ExtensionStatus::Cancelled);

    let res = client.try_activate_extension(&landlord, &extension_id);
    assert_eq!(res, Err(Ok(RentalError::InvalidState)));
}

#[test]
fn cancel_extension_twice_second_call_invalid_state() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_CANCEL_TWICE";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let extension_id = client.propose_extension(&landlord, &agreement_id, &1u32, &None, &None);

    let r = String::from_str(&env, "r1");
    client.cancel_extension(&landlord, &extension_id, &r);

    let res = client.try_cancel_extension(&tenant, &extension_id, &String::from_str(&env, "r2"));
    assert_eq!(res, Err(Ok(RentalError::InvalidState)));
}

#[test]
fn get_extension_not_found() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let res = client.try_get_extension(&String::from_str(&env, "missing_ext"));
    assert_eq!(res, Err(Ok(RentalError::AgreementNotFound)));
}

#[test]
fn get_extension_history_not_found_before_any_proposal() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_NO_HIST";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    let res = client.try_get_extension_history(&agreement_id);
    assert_eq!(res, Err(Ok(RentalError::AgreementNotFound)));
}

#[test]
fn propose_extension_while_paused_returns_contract_paused() {
    let env = Env::default();
    let (client, _) = setup_initialized_client(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id_str = "LEASE_EXT_PAUSED";
    let agreement_id = String::from_str(&env, agreement_id_str);
    create_active_agreement(
        &env,
        &client,
        agreement_id_str,
        &tenant,
        &landlord,
        &landlord,
    );

    client.pause(&String::from_str(&env, "maintenance"));

    let res = client.try_propose_extension(&landlord, &agreement_id, &1u32, &None, &None);
    assert_eq!(res, Err(Ok(RentalError::ContractPaused)));
}
