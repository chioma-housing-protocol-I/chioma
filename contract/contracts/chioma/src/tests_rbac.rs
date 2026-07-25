//! Role-Based Access Control tests for the Chioma contract.
//!
//! Verifies that privileged functions enforce admin-only access and that
//! agreement signing is restricted to the specific tenant on each agreement.

use super::*;
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    Address, Env, IntoVal, String, Vec,
};

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

fn initialized_client<'a>(env: &'a Env, admin: &Address) -> ContractClient<'a> {
    let client = create_contract(env);
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
        paused: false,
    };
    client
        .mock_auths(&[MockAuth {
            address: admin,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "initialize",
                args: (admin.clone(), config.clone()).into_val(env),
                sub_invokes: &[],
            },
        }])
        .initialize(admin, &config);
    client
}

fn create_pending_agreement<'a>(
    env: &'a Env,
    client: &ContractClient<'a>,
    agreement_id: &str,
    tenant: &Address,
    landlord: &Address,
) {
    client.create_agreement(&AgreementInput {
        agreement_id: String::from_str(env, agreement_id),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 10,
        },
        payment_token: Address::generate(env),
        metadata_uri: String::from_str(env, ""),
        attributes: Vec::new(env),
    });

    let mut agreement = client
        .get_agreement(&String::from_str(env, agreement_id))
        .unwrap();
    agreement.status = AgreementStatus::Pending;

    env.as_contract(&client.address, || {
        env.storage().persistent().set(
            &storage::DataKey::Agreement(String::from_str(env, agreement_id)),
            &agreement,
        );
    });
}

// ── record_version ─────────────────────────────────────────────────────────

#[test]
fn test_record_version_admin_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let client = initialized_client(&env, &admin);

    let version = ContractVersion {
        major: 1,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v1"),
        status: VersionStatus::Active,
        hash: soroban_sdk::Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    };

    let result = client.try_record_version(&version);
    assert!(result.is_ok(), "admin should be able to record a version");
}

#[test]
#[should_panic]
fn test_record_version_non_admin_rejected() {
    let env = Env::default();

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let client = initialized_client(&env, &admin);

    let version = ContractVersion {
        major: 1,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "malicious"),
        status: VersionStatus::Active,
        hash: soroban_sdk::Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    };

    // Authenticate as attacker — must panic because only admin is authorised
    client
        .mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "record_version",
                args: (version.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .record_version(&version);
}

// ── freeze_escrow / unfreeze_escrow ────────────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #18)")]
fn test_freeze_escrow_non_admin_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let tenant = Address::generate(&env);
    let payment_token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();

    let client = initialized_client(&env, &admin);

    let agreement_id = String::from_str(&env, "RBAC_FREEZE_001");
    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        admin: admin.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token,
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });

    client.freeze_escrow(&attacker, &agreement_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #18)")]
fn test_unfreeze_escrow_non_admin_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let tenant = Address::generate(&env);
    let payment_token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();

    let client = initialized_client(&env, &admin);

    let agreement_id = String::from_str(&env, "RBAC_UNFREEZE_001");
    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        admin: admin.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token,
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });

    client.freeze_escrow(&admin, &agreement_id);
    client.unfreeze_escrow(&attacker, &agreement_id);
}

// ── sign_agreement: user-specific access ───────────────────────────────────

#[test]
fn test_only_the_agreement_tenant_can_sign() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id = "RBAC_SIGN_OWN";

    create_pending_agreement(&env, &client, agreement_id, &tenant, &landlord);

    // Tenant signs their own agreement — must succeed
    let result = client.try_sign_agreement(&tenant, &String::from_str(&env, agreement_id));
    assert!(
        result.is_ok(),
        "tenant should be able to sign their own agreement"
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_tenant_cannot_sign_another_tenants_agreement() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let real_tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let impostor = Address::generate(&env);
    let agreement_id = "RBAC_SIGN_OTHER";

    create_pending_agreement(&env, &client, agreement_id, &real_tenant, &landlord);

    // Impostor tries to sign another tenant's agreement — must fail with #14
    client.sign_agreement(&impostor, &String::from_str(&env, agreement_id));
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_admin_cannot_sign_as_tenant() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let tenant = Address::generate(&env);
    let client = initialized_client(&env, &admin);

    let agreement_id = "RBAC_ADMIN_SIGN";
    create_pending_agreement(&env, &client, agreement_id, &tenant, &admin);

    // Admin tries to sign as tenant — must fail with #14
    client.sign_agreement(&admin, &String::from_str(&env, agreement_id));
}

// ── submit_agreement: admin-only ────────────────────────────────────────────

#[test]
fn test_agreement_admin_can_submit() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let agreement_id = String::from_str(&env, "RBAC_SUBMIT_OK");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });

    let result = client.try_submit_agreement(&landlord, &agreement_id);
    assert!(result.is_ok(), "agreement admin should be able to submit");
}

#[test]
#[should_panic(expected = "Error(Contract, #18)")]
fn test_non_admin_cannot_submit_agreement() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let impostor = Address::generate(&env);

    let agreement_id = String::from_str(&env, "RBAC_SUBMIT_UNAUTH");

    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 200,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });

    client.submit_agreement(&impostor, &agreement_id);
}

// ── update_config: admin-only ────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_update_config_specific_auth_required() {
    let env = Env::default();

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let client = initialized_client(&env, &admin);

    let new_config = Config {
        fee_bps: 500,
        fee_collector: Address::generate(&env),
        paused: false,
    };

    // Explicitly authenticate as attacker — must panic
    client
        .mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "update_config",
                args: (new_config.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .update_config(&new_config);
}

// ── pause / unpause: admin-only ──────────────────────────────────────────────

#[test]
#[should_panic]
fn test_pause_specific_auth_required() {
    let env = Env::default();

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let client = initialized_client(&env, &admin);

    let reason = String::from_str(&env, "attacker pause attempt");

    client
        .mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "pause",
                args: (reason.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .pause(&reason);
}
