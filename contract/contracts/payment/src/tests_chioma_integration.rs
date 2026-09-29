//! Cross-contract integration tests proving `pay_rent` genuinely cross-checks
//! agreement data against a `chioma` stand-in before processing a payment,
//! rather than trusting `payment`'s own local `Agreement` copy in isolation
//! (issue #1559).
//!
//! Uses the same multi-contract-in-one-`Env` mock convention already
//! established in `dispute_resolution::tests_raise_dispute` and
//! `escrow::tests_dispute_resolution_integration`: a `#[contract]` stand-in
//! exposing the same exported name and field-for-field type shape as the
//! real `chioma` contract, registered alongside the contract under test.

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;
use soroban_sdk::{contract, contractimpl, Address, Env, Map, String, Vec};

use crate::errors::PaymentError;
use crate::payment_impl::{ChiomaAgreementStatus, ChiomaRentAgreement};
use crate::storage::DataKey;
use crate::types::{AgreementStatus, RentAgreement};
use crate::{PaymentContract, PaymentContractClient};

/// Minimal Chioma stand-in exposing the real exported name (`get_agreement`)
/// and the real field-for-field `RentAgreement` shape, so a passing test
/// here is evidence `payment` can talk to a real `chioma` instance.
#[contract]
pub struct MockChiomaContract;

#[contractimpl]
impl MockChiomaContract {
    pub fn get_agreement(env: Env, agreement_id: String) -> Option<ChiomaRentAgreement> {
        env.storage().instance().get(&agreement_id)
    }
}

fn deploy_mock_chioma(env: &Env) -> Address {
    env.register(MockChiomaContract, ())
}

fn put_chioma_agreement(env: &Env, chioma: &Address, agreement: &ChiomaRentAgreement) {
    env.as_contract(chioma, || {
        env.storage()
            .instance()
            .set(&agreement.agreement_id, agreement);
    });
}

fn sample_chioma_agreement(
    env: &Env,
    agreement_id: &String,
    landlord: &Address,
    tenant: &Address,
    monthly_rent: i128,
    payment_token: &Address,
    status: ChiomaAgreementStatus,
) -> ChiomaRentAgreement {
    ChiomaRentAgreement {
        agreement_id: agreement_id.clone(),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        monthly_rent,
        security_deposit: 0,
        start_date: 0,
        end_date: 0,
        agent_commission_rate: 0,
        status,
        total_rent_paid: 0,
        payment_count: 0,
        signed_at: None,
        witness_id: None,
        payment_token: payment_token.clone(),
        next_payment_due: 0,
        metadata_uri: String::from_str(env, ""),
        attributes: Vec::new(env),
    }
}

fn setup(
    env: &Env,
) -> (
    PaymentContractClient<'_>,
    Address, // admin
    Address, // landlord
    Address, // tenant
    Address, // payment_token
    Address, // chioma (mock)
) {
    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(env, &contract_id);

    let admin = Address::generate(env);
    let landlord = Address::generate(env);
    let tenant = Address::generate(env);
    let token_admin = Address::generate(env);
    let payment_token = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();
    let chioma = deploy_mock_chioma(env);

    client.initialize_admin(&admin);
    client.set_chioma_contract(&admin, &chioma);
    client.set_platform_fee_collector(&Address::generate(env));

    (client, admin, landlord, tenant, payment_token, chioma)
}

fn seed_local_agreement(
    env: &Env,
    client: &PaymentContractClient<'_>,
    agreement_id: &String,
    landlord: &Address,
    tenant: &Address,
    monthly_rent: i128,
    payment_token: &Address,
    status: AgreementStatus,
) {
    let agreement = RentAgreement {
        agreement_id: agreement_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        monthly_rent,
        agent_commission_rate: 0,
        status,
        total_rent_paid: 0,
        payment_count: 0,
        security_deposit: 0,
        start_date: 0,
        end_date: 0,
        signed_at: None,
        payment_token: payment_token.clone(),
        next_payment_due: 0,
        payment_history: Map::new(env),
    };
    env.as_contract(&client.address, || {
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id.clone()), &agreement);
    });
}

/// A `pay_rent` call whose local agreement record matches chioma's
/// authoritative record exactly must succeed, and the payment must actually
/// move funds according to the 90/10 split.
#[test]
fn pay_rent_succeeds_when_local_agreement_matches_chioma() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let (client, _admin, landlord, tenant, payment_token, chioma) = setup(&env);
    let agreement_id = String::from_str(&env, "agr-match-1");
    let monthly_rent = 1_000i128;

    let chioma_agreement = sample_chioma_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        ChiomaAgreementStatus::Active,
    );
    put_chioma_agreement(&env, &chioma, &chioma_agreement);

    seed_local_agreement(
        &env,
        &client,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        AgreementStatus::Active,
    );

    let token_admin_client = TokenAdminClient::new(&env, &payment_token);
    token_admin_client.mint(&tenant, &monthly_rent);

    let result = client.try_pay_rent(&tenant, &agreement_id, &monthly_rent);
    assert_eq!(result, Ok(Ok(())));

    let token_client = TokenClient::new(&env, &payment_token);
    assert_eq!(token_client.balance(&tenant), 0);
    assert_eq!(token_client.balance(&landlord), 900);
}

/// A `pay_rent` call must be rejected, not silently trust the local copy,
/// when payment's own record has drifted from chioma's (different tenant
/// here) -- this is exactly the drift scenario #1559 exists to close.
#[test]
fn pay_rent_fails_when_local_tenant_diverges_from_chioma() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, landlord, tenant, payment_token, chioma) = setup(&env);
    let agreement_id = String::from_str(&env, "agr-drift-tenant");
    let monthly_rent = 1_000i128;
    let real_tenant_on_chioma = Address::generate(&env);

    let chioma_agreement = sample_chioma_agreement(
        &env,
        &agreement_id,
        &landlord,
        &real_tenant_on_chioma,
        monthly_rent,
        &payment_token,
        ChiomaAgreementStatus::Active,
    );
    put_chioma_agreement(&env, &chioma, &chioma_agreement);

    // Payment's local copy disagrees about who the tenant is.
    seed_local_agreement(
        &env,
        &client,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        AgreementStatus::Active,
    );

    let token_admin_client = TokenAdminClient::new(&env, &payment_token);
    token_admin_client.mint(&tenant, &monthly_rent);

    let result = client.try_pay_rent(&tenant, &agreement_id, &monthly_rent);
    assert_eq!(result, Err(Ok(PaymentError::AgreementDataMismatch)));
}

/// A rent amount drift (local copy has a stale `monthly_rent`) must also be
/// caught, not just party-identity drift.
#[test]
fn pay_rent_fails_when_local_monthly_rent_diverges_from_chioma() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, landlord, tenant, payment_token, chioma) = setup(&env);
    let agreement_id = String::from_str(&env, "agr-drift-rent");

    let chioma_agreement = sample_chioma_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        1_000,
        &payment_token,
        ChiomaAgreementStatus::Active,
    );
    put_chioma_agreement(&env, &chioma, &chioma_agreement);

    // Local copy thinks rent is 500, chioma says 1000.
    seed_local_agreement(
        &env,
        &client,
        &agreement_id,
        &landlord,
        &tenant,
        500,
        &payment_token,
        AgreementStatus::Active,
    );

    let token_admin_client = TokenAdminClient::new(&env, &payment_token);
    token_admin_client.mint(&tenant, &500);

    let result = client.try_pay_rent(&tenant, &agreement_id, &500);
    assert_eq!(result, Err(Ok(PaymentError::AgreementDataMismatch)));
}

/// A status drift (chioma says the agreement is no longer Active, e.g. it
/// was terminated there, but payment's local copy is stale and still says
/// Active) must also be caught.
#[test]
fn pay_rent_fails_when_local_status_diverges_from_chioma() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, landlord, tenant, payment_token, chioma) = setup(&env);
    let agreement_id = String::from_str(&env, "agr-drift-status");
    let monthly_rent = 1_000i128;

    let chioma_agreement = sample_chioma_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        ChiomaAgreementStatus::Terminated,
    );
    put_chioma_agreement(&env, &chioma, &chioma_agreement);

    seed_local_agreement(
        &env,
        &client,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        AgreementStatus::Active,
    );

    let token_admin_client = TokenAdminClient::new(&env, &payment_token);
    token_admin_client.mint(&tenant, &monthly_rent);

    let result = client.try_pay_rent(&tenant, &agreement_id, &monthly_rent);
    assert_eq!(result, Err(Ok(PaymentError::AgreementDataMismatch)));
}

/// `pay_rent` must fail explicitly, not panic, when chioma has no record of
/// this agreement id at all (e.g. payment's local copy references an
/// agreement id chioma never created).
#[test]
fn pay_rent_fails_explicitly_when_chioma_has_no_such_agreement() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, landlord, tenant, payment_token, _chioma) = setup(&env);
    let agreement_id = String::from_str(&env, "agr-missing-on-chioma");
    let monthly_rent = 1_000i128;

    // Deliberately never put an agreement into the mock chioma contract.
    seed_local_agreement(
        &env,
        &client,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        AgreementStatus::Active,
    );

    let token_admin_client = TokenAdminClient::new(&env, &payment_token);
    token_admin_client.mint(&tenant, &monthly_rent);

    let result = client.try_pay_rent(&tenant, &agreement_id, &monthly_rent);
    assert_eq!(result, Err(Ok(PaymentError::ChiomaAgreementLookupFailed)));
}

/// `pay_rent` must fail explicitly, not panic or silently proceed, when no
/// `chioma` contract has been configured at all (#1559's "cross-contract
/// call failure modes ... handled explicitly" acceptance criterion).
#[test]
fn pay_rent_fails_explicitly_when_chioma_contract_not_configured() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let payment_token = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();

    client.initialize_admin(&admin);
    client.set_platform_fee_collector(&Address::generate(&env));
    // Deliberately never calling set_chioma_contract.

    let agreement_id = String::from_str(&env, "agr-no-chioma-configured");
    let monthly_rent = 1_000i128;
    seed_local_agreement(
        &env,
        &client,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        AgreementStatus::Active,
    );

    let token_admin_client = TokenAdminClient::new(&env, &payment_token);
    token_admin_client.mint(&tenant, &monthly_rent);

    let result = client.try_pay_rent(&tenant, &agreement_id, &monthly_rent);
    assert_eq!(result, Err(Ok(PaymentError::ChiomaContractNotSet)));
}

/// Only the admin may configure the `chioma` contract address.
#[test]
fn set_chioma_contract_requires_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let chioma = deploy_mock_chioma(&env);
    let outsider = Address::generate(&env);

    let result = client.try_set_chioma_contract(&outsider, &chioma);
    assert_eq!(result, Err(Ok(PaymentError::Unauthorized)));

    let ok = client.try_set_chioma_contract(&admin, &chioma);
    assert_eq!(ok, Ok(Ok(())));
    assert_eq!(client.get_chioma_contract(), Some(chioma));
}

// ── Fee accounting (#1563) ──────────────────────────────────────────────────

/// The platform fee (10% of each payment) accrues into an on-chain running
/// total that grows by exactly the fee amount on every successful payment,
/// rather than only being reconstructable after the fact from event logs.
#[test]
fn pay_rent_accrues_platform_fee_into_running_total() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, landlord, tenant, payment_token, chioma) = setup(&env);
    let agreement_id = String::from_str(&env, "agr-fee-accrual");
    let monthly_rent = 1_000i128;

    let chioma_agreement = sample_chioma_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        ChiomaAgreementStatus::Active,
    );
    put_chioma_agreement(&env, &chioma, &chioma_agreement);
    seed_local_agreement(
        &env,
        &client,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        AgreementStatus::Active,
    );

    let token_admin_client = TokenAdminClient::new(&env, &payment_token);
    token_admin_client.mint(&tenant, &monthly_rent);

    assert_eq!(client.get_total_fees_collected(), 0);

    let result = client.try_pay_rent(&tenant, &agreement_id, &monthly_rent);
    assert_eq!(result, Ok(Ok(())));

    // 90/10 split: 100 of 1000 is the platform fee.
    assert_eq!(client.get_total_fees_collected(), 100);
}

/// The running fee total accumulates across multiple agreements/payments
/// rather than being overwritten or scoped per agreement.
#[test]
fn pay_rent_fee_total_accumulates_across_agreements() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, landlord, tenant, payment_token, chioma) = setup(&env);
    let monthly_rent = 1_000i128;

    let agreement_ids = [
        String::from_str(&env, "agr-fee-accum-1"),
        String::from_str(&env, "agr-fee-accum-2"),
    ];

    for agreement_id in &agreement_ids {
        let chioma_agreement = sample_chioma_agreement(
            &env,
            agreement_id,
            &landlord,
            &tenant,
            monthly_rent,
            &payment_token,
            ChiomaAgreementStatus::Active,
        );
        put_chioma_agreement(&env, &chioma, &chioma_agreement);
        seed_local_agreement(
            &env,
            &client,
            agreement_id,
            &landlord,
            &tenant,
            monthly_rent,
            &payment_token,
            AgreementStatus::Active,
        );

        let token_admin_client = TokenAdminClient::new(&env, &payment_token);
        token_admin_client.mint(&tenant, &monthly_rent);

        let result = client.try_pay_rent(&tenant, agreement_id, &monthly_rent);
        assert_eq!(result, Ok(Ok(())));
    }

    // Two payments of 1000 each, 10% fee each: 100 + 100 = 200.
    assert_eq!(client.get_total_fees_collected(), 200);
}

/// A rejected payment (e.g. drifted agreement data) must not accrue any
/// fee into the running total.
#[test]
fn pay_rent_rejected_payment_does_not_accrue_fee() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, landlord, tenant, payment_token, chioma) = setup(&env);
    let agreement_id = String::from_str(&env, "agr-fee-rejected");
    let monthly_rent = 1_000i128;
    let real_tenant_on_chioma = Address::generate(&env);

    let chioma_agreement = sample_chioma_agreement(
        &env,
        &agreement_id,
        &landlord,
        &real_tenant_on_chioma,
        monthly_rent,
        &payment_token,
        ChiomaAgreementStatus::Active,
    );
    put_chioma_agreement(&env, &chioma, &chioma_agreement);
    seed_local_agreement(
        &env,
        &client,
        &agreement_id,
        &landlord,
        &tenant,
        monthly_rent,
        &payment_token,
        AgreementStatus::Active,
    );

    let token_admin_client = TokenAdminClient::new(&env, &payment_token);
    token_admin_client.mint(&tenant, &monthly_rent);

    let result = client.try_pay_rent(&tenant, &agreement_id, &monthly_rent);
    assert_eq!(result, Err(Ok(PaymentError::AgreementDataMismatch)));
    assert_eq!(client.get_total_fees_collected(), 0);
}
