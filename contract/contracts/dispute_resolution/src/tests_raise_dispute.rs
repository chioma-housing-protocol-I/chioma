use crate::dispute::{AgreementStatus, RentAgreement};
use crate::{
    DisputeError, DisputeOutcome, DisputeResolutionContract, DisputeResolutionContractClient,
};
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, Map, String};

fn create_contract(env: &Env) -> DisputeResolutionContractClient<'_> {
    let contract_id = env.register(DisputeResolutionContract, ());
    DisputeResolutionContractClient::new(env, &contract_id)
}

/// Minimal Chioma stand-in used to validate `dispute_resolution::raise_dispute`'s
/// cross-contract agreement fetch (`symbol_short!("get_agr")`).
///
/// Storage layout:
/// - instance key: `agreement_id` -> `RentAgreement`
#[contract]
pub struct MockChiomaContract;

#[contractimpl]
impl MockChiomaContract {
    pub fn get_agr(env: Env, agreement_id: String) -> Option<RentAgreement> {
        env.storage().instance().get(&agreement_id)
    }
}

fn deploy_mock_chioma(env: &Env) -> Address {
    env.register(MockChiomaContract, ())
}

fn put_agreement(env: &Env, chioma: &Address, agreement: &RentAgreement) {
    env.as_contract(chioma, || {
        env.storage()
            .instance()
            .set(&agreement.agreement_id, agreement);
    });
}

fn sample_agreement(
    env: &Env,
    agreement_id: &String,
    landlord: &Address,
    tenant: &Address,
    status: AgreementStatus,
) -> RentAgreement {
    let token = Address::generate(env);
    RentAgreement {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: None,
        monthly_rent: 1_000,
        security_deposit: 2_000,
        start_date: 1,
        end_date: 2,
        agent_commission_rate: 0,
        status,
        total_rent_paid: 0,
        payment_count: 0,
        signed_at: None,
        payment_token: token,
        next_payment_due: 0,
        payment_history: Map::new(env),
    }
}

#[test]
fn raise_dispute_success_cross_contract_tenant() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);

    let agreement_id = String::from_str(&env, "agr-tenant-1");
    let agreement = sample_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        AgreementStatus::Active,
    );
    put_agreement(&env, &chioma, &agreement);

    client.initialize(&admin, &3, &chioma);

    let details_hash = String::from_str(&env, "QmDetails");
    let result = client.try_raise_dispute(&tenant, &agreement_id, &details_hash);
    assert_eq!(result, Ok(Ok(())));

    let dispute = client.get_dispute(&agreement_id).unwrap();
    assert_eq!(dispute.agreement_id, agreement_id);
    assert_eq!(dispute.details_hash, details_hash);
    assert!(!dispute.resolved);
}

#[test]
fn raise_dispute_success_cross_contract_landlord() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);

    let agreement_id = String::from_str(&env, "agr-landlord-1");
    let agreement = sample_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        AgreementStatus::Active,
    );
    put_agreement(&env, &chioma, &agreement);

    client.initialize(&admin, &3, &chioma);

    let details_hash = String::from_str(&env, "QmDetails");
    let result = client.try_raise_dispute(&landlord, &agreement_id, &details_hash);
    assert_eq!(result, Ok(Ok(())));
}

#[test]
fn raise_dispute_fails_invalid_details_hash() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agr-empty-details");
    let agreement = sample_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        AgreementStatus::Active,
    );
    put_agreement(&env, &chioma, &agreement);

    client.initialize(&admin, &3, &chioma);

    let empty = String::from_str(&env, "");
    let result = client.try_raise_dispute(&tenant, &agreement_id, &empty);
    assert_eq!(result, Err(Ok(DisputeError::InvalidDetailsHash)));
}

#[test]
fn raise_dispute_fails_agreement_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    client.initialize(&admin, &3, &chioma);

    let tenant = Address::generate(&env);
    let missing_id = String::from_str(&env, "missing");
    let details_hash = String::from_str(&env, "QmDetails");

    let result = client.try_raise_dispute(&tenant, &missing_id, &details_hash);
    assert_eq!(result, Err(Ok(DisputeError::AgreementNotFound)));
}

#[test]
fn raise_dispute_fails_invalid_agreement_state() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agr-draft");
    let agreement = sample_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        AgreementStatus::Draft,
    );
    put_agreement(&env, &chioma, &agreement);

    client.initialize(&admin, &3, &chioma);

    let details_hash = String::from_str(&env, "QmDetails");
    let result = client.try_raise_dispute(&tenant, &agreement_id, &details_hash);
    assert_eq!(result, Err(Ok(DisputeError::InvalidAgreementState)));
}

#[test]
fn raise_dispute_fails_unauthorized_raiser() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let stranger = Address::generate(&env);

    let agreement_id = String::from_str(&env, "agr-stranger");
    let agreement = sample_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        AgreementStatus::Active,
    );
    put_agreement(&env, &chioma, &agreement);

    client.initialize(&admin, &3, &chioma);

    let details_hash = String::from_str(&env, "QmDetails");
    let result = client.try_raise_dispute(&stranger, &agreement_id, &details_hash);
    assert_eq!(result, Err(Ok(DisputeError::Unauthorized)));
}

#[test]
fn raise_dispute_fails_when_dispute_already_exists() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agr-dup");
    let agreement = sample_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        AgreementStatus::Active,
    );
    put_agreement(&env, &chioma, &agreement);

    client.initialize(&admin, &3, &chioma);

    let details_hash = String::from_str(&env, "QmDetails");
    let first = client.try_raise_dispute(&tenant, &agreement_id, &details_hash);
    assert_eq!(first, Ok(Ok(())));

    let second = client.try_raise_dispute(&tenant, &agreement_id, &details_hash);
    assert_eq!(second, Err(Ok(DisputeError::DisputeAlreadyExists)));
}

#[test]
fn vote_on_dispute_happy_path_after_raise_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let arbiter = Address::generate(&env);

    let agreement_id = String::from_str(&env, "agr-vote-1");
    let agreement = sample_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        AgreementStatus::Active,
    );
    put_agreement(&env, &chioma, &agreement);

    client.initialize(&admin, &3, &chioma);
    client.add_arbiter(&admin, &arbiter);

    let details_hash = String::from_str(&env, "QmDetails");
    let raise = client.try_raise_dispute(&tenant, &agreement_id, &details_hash);
    assert_eq!(raise, Ok(Ok(())));

    let vote = client.try_vote_on_dispute(&arbiter, &agreement_id, &true);
    assert_eq!(vote, Ok(Ok(())));

    let dispute = client.get_dispute(&agreement_id).unwrap();
    assert_eq!(dispute.votes_favor_landlord, 1);
    assert_eq!(dispute.votes_favor_tenant, 0);
}

#[test]
fn resolve_dispute_favor_landlord_after_raise_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let a1 = Address::generate(&env);
    let a2 = Address::generate(&env);
    let a3 = Address::generate(&env);

    let agreement_id = String::from_str(&env, "agr-resolve-ll");
    let agreement = sample_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        AgreementStatus::Active,
    );
    put_agreement(&env, &chioma, &agreement);

    client.initialize(&admin, &3, &chioma);
    client.add_arbiter(&admin, &a1);
    client.add_arbiter(&admin, &a2);
    client.add_arbiter(&admin, &a3);

    let details_hash = String::from_str(&env, "QmDetails");
    let raise = client.try_raise_dispute(&tenant, &agreement_id, &details_hash);
    assert_eq!(raise, Ok(Ok(())));

    assert_eq!(
        client.try_vote_on_dispute(&a1, &agreement_id, &true),
        Ok(Ok(()))
    );
    assert_eq!(
        client.try_vote_on_dispute(&a2, &agreement_id, &true),
        Ok(Ok(()))
    );
    assert_eq!(
        client.try_vote_on_dispute(&a3, &agreement_id, &false),
        Ok(Ok(()))
    );

    let resolved = client.try_resolve_dispute(&agreement_id);
    assert_eq!(resolved, Ok(Ok(DisputeOutcome::FavorLandlord)));
}

#[test]
fn resolve_dispute_insufficient_votes_after_raise_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let chioma = deploy_mock_chioma(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let a1 = Address::generate(&env);

    let agreement_id = String::from_str(&env, "agr-resolve-insufficient");
    let agreement = sample_agreement(
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        AgreementStatus::Active,
    );
    put_agreement(&env, &chioma, &agreement);

    client.initialize(&admin, &3, &chioma);
    client.add_arbiter(&admin, &a1);

    let details_hash = String::from_str(&env, "QmDetails");
    let raise = client.try_raise_dispute(&tenant, &agreement_id, &details_hash);
    assert_eq!(raise, Ok(Ok(())));

    assert_eq!(
        client.try_vote_on_dispute(&a1, &agreement_id, &true),
        Ok(Ok(()))
    );

    let resolved = client.try_resolve_dispute(&agreement_id);
    assert_eq!(resolved, Err(Ok(DisputeError::InsufficientVotes)));
}
