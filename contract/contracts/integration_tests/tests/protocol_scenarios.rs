//! Multi-contract integration scenarios for the Chioma protocol (#1687).
//!
//! Every contract's own test suite only registers itself in a fresh `Env`.
//! These tests register several *real* contracts (not mocks) in one `Env`
//! and drive them the way an off-chain caller (backend/frontend/indexer)
//! actually orchestrates the protocol: by calling each contract's public
//! API in sequence, since a workspace-wide audit for #1685/#1687 found the
//! contracts here almost never call each other directly on-chain -- the
//! one exception is exercised in scenario 1 below.

use agent_registry::AgentRegistryContract;
use chioma::{AgreementInput, AgreementTerms, Config, Contract as ChiomaContract};
use dispute_resolution::DisputeResolutionContract;
use escrow::{EscrowContract, EscrowStatus};
use payment::{PaymentContract, PaymentFrequency};
use property_registry::PropertyRegistryContract;

use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env, String, Vec,
};

fn register_all(
    env: &Env,
) -> (
    property_registry::PropertyRegistryContractClient<'_>,
    agent_registry::AgentRegistryContractClient<'_>,
    escrow::escrow_impl::EscrowContractClient<'_>,
    dispute_resolution::DisputeResolutionContractClient<'_>,
    payment::PaymentContractClient<'_>,
    chioma::ContractClient<'_>,
) {
    let property = property_registry::PropertyRegistryContractClient::new(
        env,
        &env.register(PropertyRegistryContract, ()),
    );
    let agent = agent_registry::AgentRegistryContractClient::new(
        env,
        &env.register(AgentRegistryContract, ()),
    );
    let escrow =
        escrow::escrow_impl::EscrowContractClient::new(env, &env.register(EscrowContract, ()));
    let dispute = dispute_resolution::DisputeResolutionContractClient::new(
        env,
        &env.register(DisputeResolutionContract, ()),
    );
    let payment = payment::PaymentContractClient::new(env, &env.register(PaymentContract, ()));
    let chioma = chioma::ContractClient::new(env, &env.register(ChiomaContract, ()));

    (property, agent, escrow, dispute, payment, chioma)
}

/// Scenario 1: an agreement created in `chioma`, then disputed via
/// `dispute_resolution`.
///
/// This is the *only* place in the entire workspace where one project
/// contract calls another on-chain: `dispute_resolution::raise_dispute`
/// calls `chioma`'s agreement lookup via `env.invoke_contract` (see
/// `dispute_resolution/src/dispute.rs`) to confirm the dispute raiser is
/// actually a party to the agreement, rather than trusting the caller's
/// own claim.
///
/// Registering the real `chioma` contract here (not a mock) surfaces two
/// pre-existing bugs that `dispute_resolution`'s own test suite never
/// caught, because it only ever exercises this call against a
/// hand-written `MockChiomaContract` whose function is deliberately named
/// to match the (wrong) symbol the caller invokes:
///
/// 1. `dispute.rs` invokes the symbol `"get_agr"` (via `symbol_short!`,
///    which is capped at 9 characters and can't hold the real function
///    name), but `chioma`'s actual exported function is `get_agreement`.
///    Soroban resolves contract functions by their exact exported name, so
///    this call never reaches `chioma::get_agreement` in production.
/// 2. Even if the symbol were fixed, `dispute_resolution`'s local
///    `RentAgreement` type (fields: `landlord`, `tenant`,
///    `payment_history: Map<u32, PaymentSplit>`) does not structurally
///    match `chioma`'s real `RentAgreement` (fields: `admin`, `user`,
///    `witness_id`, `metadata_uri`, `attributes`) -- decoding one as the
///    other would fail or silently misread fields.
///
/// This test documents the current (broken) behavior rather than papering
/// over it: `raise_dispute` against a real, freshly-created, Active
/// agreement in `chioma` does not succeed.
#[test]
fn scenario_1_raise_dispute_against_real_chioma_agreement_is_currently_broken() {
    let env = Env::default();
    env.mock_all_auths();

    let (_property, _agent, _escrow, dispute, _payment, chioma) = register_all(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    chioma.initialize(
        &admin,
        &Config {
            fee_bps: 100,
            fee_collector,
            paused: false,
        },
    );

    let agreement_id = String::from_str(&env, "INTEGRATION-AGR-1");
    chioma.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1_000,
            security_deposit: 2_000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });
    chioma.submit_agreement(&landlord, &agreement_id);
    chioma.sign_agreement(&tenant, &agreement_id);
    chioma.approve_agreement(&landlord, &agreement_id);

    let agreement = chioma.get_agreement(&agreement_id).unwrap();
    assert_eq!(agreement.status, chioma::AgreementStatus::Active);

    let arbiter_admin = Address::generate(&env);
    dispute.initialize(&arbiter_admin, &1, &chioma.address);

    let details_hash = String::from_str(&env, "QmEvidence");
    let result = dispute.try_raise_dispute(&tenant, &agreement_id, &details_hash);

    // See the module-level doc comment above: this currently fails against
    // a real chioma contract because of the wrong invoke symbol and the
    // mismatched RentAgreement shape, not because the scenario itself is
    // invalid (the agreement genuinely is Active and `tenant` genuinely is
    // a party to it).
    assert!(
        result.is_err(),
        "raise_dispute unexpectedly succeeded against the real chioma contract -- \
         if this now passes, the #1684-adjacent get_agr symbol/RentAgreement \
         shape mismatch documented above has been fixed and this test (and its \
         doc comment) should be updated to reflect the fix, not just relaxed."
    );
}

/// Scenario 2: property registration, agent verification, and an escrow
/// funded and released -- the realistic sequence an off-chain caller drives
/// across three independently-deployed contracts that never call each
/// other on-chain.
#[test]
fn scenario_2_property_agent_and_escrow_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let (property, agent, escrow, _dispute, _payment, _chioma) = register_all(&env);

    let admin = Address::generate(&env);
    property.initialize(&admin);
    agent.initialize(&admin);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let realtor = Address::generate(&env);

    let property_id = String::from_str(&env, "PROP-INTEGRATION-1");
    property.register_property(
        &landlord,
        &property_id,
        &String::from_str(&env, "ipfs://metadata"),
    );
    property.verify_property(&admin, &property_id);
    assert!(property.get_property(&property_id).unwrap().verified);

    agent.register_agent(&realtor, &String::from_str(&env, "ipfs://realtor-profile"));
    agent.verify_agent(&admin, &realtor);
    assert!(agent.get_agent_info(&realtor).unwrap().verified);

    // The escrow contract has no knowledge of property_registry or
    // agent_registry -- an off-chain caller is what ties "this escrow is
    // for that verified property, brokered by that verified agent"
    // together. The escrow itself only tracks the token amount and the
    // three parties to the release.
    let token_admin = Address::generate(&env);
    let token = env.register_stellar_asset_contract_v2(token_admin);
    let token_client = soroban_sdk::token::StellarAssetClient::new(&env, &token.address());
    let amount = 2_000i128;
    token_client.mint(&tenant, &amount);

    let escrow_id = escrow.create(
        &tenant,
        &landlord,
        &admin,
        &landlord,
        &realtor,
        &amount,
        &token.address(),
    );
    escrow.fund_escrow(&escrow_id, &tenant);

    escrow.approve_release(&escrow_id, &tenant, &landlord);
    escrow.approve_release(&escrow_id, &admin, &landlord);

    let final_escrow = escrow.get_escrow(&escrow_id);
    assert_eq!(final_escrow.status, EscrowStatus::Released);

    let token_reader = soroban_sdk::token::Client::new(&env, &token.address());
    assert_eq!(token_reader.balance(&landlord), amount);
    assert_eq!(token_reader.balance(&tenant), 0);
}

/// Scenario 3: a recurring payment created, executed, and a late fee
/// applied -- the payment contract's self-contained lifecycle, run
/// alongside a verified property in the same `Env` to confirm nothing
/// about registering multiple contracts together changes either one's
/// independent behavior.
#[test]
fn scenario_3_property_and_recurring_payment_with_late_fee() {
    let env = Env::default();
    env.mock_all_auths();

    let (property, _agent, _escrow, _dispute, payment, _chioma) = register_all(&env);

    let admin = Address::generate(&env);
    property.initialize(&admin);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let property_id = String::from_str(&env, "PROP-INTEGRATION-2");
    property.register_property(
        &landlord,
        &property_id,
        &String::from_str(&env, "ipfs://metadata-2"),
    );

    // payment's Agreement record is independent of property_registry's --
    // seed it directly the same way payment's own test suite does, since
    // payment has no public "create agreement" entrypoint of its own (the
    // agreement is expected to already exist before payment is used).
    let token_admin = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();
    let agreement_key = payment::DataKey::Agreement(property_id.clone());
    let agreement = payment::types::RentAgreement {
        agreement_id: property_id.clone(),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        monthly_rent: 1_000,
        agent_commission_rate: 0,
        status: payment::types::AgreementStatus::Active,
        total_rent_paid: 0,
        payment_count: 0,
        security_deposit: 0,
        start_date: 0,
        end_date: 0,
        signed_at: None,
        payment_token: token,
        next_payment_due: 0,
        payment_history: soroban_sdk::Map::new(&env),
    };
    env.as_contract(&payment.address, || {
        env.storage().persistent().set(&agreement_key, &agreement);
    });

    let recurring_id = payment.create_recurring_payment(
        &property_id,
        &1_000,
        &PaymentFrequency::Monthly,
        &0,
        &(2_592_000 * 12),
        &true,
    );

    payment.execute_recurring_payment(&recurring_id);
    let executions = payment.get_payment_executions(&recurring_id);
    assert_eq!(executions.len(), 1);

    payment.set_late_fee_config(&property_id, &5, &5, &200, &false);

    // next_payment_due (0) plus the 5-day grace period must be in the past
    // for apply_late_fee to consider the payment actually late.
    env.ledger().with_mut(|l| {
        l.timestamp = 86_400 * 10;
    });

    let fee_record = payment.apply_late_fee(&property_id, &String::from_str(&env, "payment-1"));
    assert!(fee_record.late_fee > 0);

    // The property registered alongside all this is untouched by any of
    // it -- confirms registering multiple contracts in one Env doesn't
    // leak state between them.
    assert!(!property.get_property(&property_id).unwrap().verified);
}
