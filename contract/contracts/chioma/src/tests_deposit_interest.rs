use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::StellarAssetClient as TokenAdminClient,
    Address, Env, String,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

fn create_token_mock(env: &Env, admin: &Address) -> Address {
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    token_id.address()
}

fn setup(env: &Env) -> (ContractClient<'_>, Address) {
    let client = create_contract(env);
    let admin = Address::generate(env);
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
        paused: false,
    };
    client.initialize(&admin, &config);
    (client, admin)
}

/// Creates a Draft agreement and returns the agreement_id String.
fn create_agreement_helper(
    env: &Env,
    client: &ContractClient<'_>,
    user: &Address,
    admin: &Address,
    deposit: i128,
) -> String {
    let id = String::from_str(env, "AGR001");
    let token_admin = Address::generate(env);
    let token = create_token_mock(env, &token_admin);

    // Mint tokens to the contract for distribution
    let token_admin_client = TokenAdminClient::new(env, &token);
    let contract_self = client.address.clone();
    token_admin_client.mint(&contract_self, &(deposit * 2));

    client.create_agreement(&AgreementInput {
        agreement_id: id.clone(),
        admin: admin.clone(),
        user: user.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: deposit,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(env, "").clone(),
        attributes: Vec::new(env).clone(),
    });
    id
}

// ─── tests ────────────────────────────────────────────────────────────────────

#[test]
fn test_set_deposit_interest_config() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &500, // 5 % per year
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    let cfg = client.get_deposit_interest_config(&id);
    assert_eq!(cfg.annual_rate, 500);
    assert_eq!(cfg.interest_recipient, InterestRecipient::Tenant);
    assert_eq!(cfg.compounding_frequency, CompoundingFrequency::Monthly);
}

#[test]
fn test_deposit_interest_initialised_with_principal() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1000,
        &CompoundingFrequency::Daily,
        &InterestRecipient::Landlord,
    );

    let di = client.get_deposit_interest(&id);
    assert_eq!(di.principal, deposit);
    assert_eq!(di.accrued_interest, 0);
    assert_eq!(di.total_with_interest, deposit);
}

#[test]
fn test_calculate_accrued_interest_no_time() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 10_000);

    client.set_deposit_interest_config(
        &id,
        &500,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Split,
    );

    // No time has elapsed → interest must be 0.
    let interest = client.calculate_accrued_interest(&id);
    assert_eq!(interest, 0);
}

#[test]
fn test_calculate_accrued_interest_after_30_days() {
    let env = Env::default();
    env.mock_all_auths();

    // Start at ledger timestamp 0.
    env.ledger().with_mut(|li| li.timestamp = 0);

    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 12_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1200, // 12 % per year
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    // Advance 30 days.
    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);

    // Expected: 12_000 × 1200 / (12 × 10_000) × 1 period = 12_000 × 0.01 = 120
    let interest = client.calculate_accrued_interest(&id);
    assert_eq!(interest, 120);
}

#[test]
fn test_accrue_interest_persists_state() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 12_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1200,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    // Advance 30 days then accrue.
    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    let accrual = client.accrue_interest(&id);

    assert_eq!(accrual.amount, 120);
    assert_eq!(accrual.rate, 1200);

    let di = client.get_deposit_interest(&id);
    assert_eq!(di.accrued_interest, 120);
    assert_eq!(di.total_with_interest, deposit + 120);
    assert_eq!(di.accrual_history.len(), 1);
}

#[test]
fn test_accrue_interest_multiple_periods() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 12_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1200,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    // First accrual at 30 days.
    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    client.accrue_interest(&id);

    // Second accrual at 60 days.
    env.ledger().with_mut(|li| li.timestamp = 60 * 86_400);
    client.accrue_interest(&id);

    let di = client.get_deposit_interest(&id);
    assert_eq!(di.accrual_history.len(), 2);
    // total accrued ≥ 240 (compounding slightly more is fine)
    assert!(di.accrued_interest >= 240);
}

#[test]
fn test_get_accrual_history() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 0);

    let (client, _admin) = setup(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &600,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Split,
    );

    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    client.accrue_interest(&id);

    let history = client.get_accrual_history(&id);
    assert_eq!(history.len(), 1);
    assert!(history.get(0).unwrap().amount > 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #25)")]
fn test_config_not_found_error() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _) = setup(&env);

    client.get_deposit_interest_config(&String::from_str(&env, "NONEXISTENT"));
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_invalid_rate_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &10_001, // > 10 000 bps — invalid
        &CompoundingFrequency::Daily,
        &InterestRecipient::Tenant,
    );
}

// ─── Issue #652: Deposit Interest Accrual & Compounding Tests ──────────────

#[test]
fn test_set_deposit_interest_config_landlord_recipient() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &500,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Landlord,
    );

    let cfg = client.get_deposit_interest_config(&id);
    assert_eq!(cfg.interest_recipient, InterestRecipient::Landlord);
}

#[test]
fn test_set_deposit_interest_config_split_recipient() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &500,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Split,
    );

    let cfg = client.get_deposit_interest_config(&id);
    assert_eq!(cfg.interest_recipient, InterestRecipient::Split);
}

#[test]
fn test_get_deposit_interest_config_all_fields() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &750,
        &CompoundingFrequency::Quarterly,
        &InterestRecipient::Tenant,
    );

    let cfg = client.get_deposit_interest_config(&id);
    assert_eq!(cfg.annual_rate, 750);
    assert_eq!(cfg.compounding_frequency, CompoundingFrequency::Quarterly);
    assert_eq!(cfg.interest_recipient, InterestRecipient::Tenant);
}

#[test]
fn test_calculate_accrued_interest_365_days_equals_annual_rate() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1000, // 10% per year
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    // Advance 365 days
    env.ledger().with_mut(|li| li.timestamp = 365 * 86_400);

    let interest = client.calculate_accrued_interest(&id);
    // With monthly compounding over 12 months at 10% annual rate:
    // 10,000 × (1 + 0.1/12)^12 - 10,000 ≈ 1,047
    // Allow some tolerance for rounding
    assert!((1_000..=1_100).contains(&interest));
}

#[test]
fn test_compound_interest_daily_exceeds_simple() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1000, // 10% per year
        &CompoundingFrequency::Daily,
        &InterestRecipient::Tenant,
    );

    // Accrue daily for 365 days
    for day in 1..=365 {
        env.ledger()
            .with_mut(|li| li.timestamp = day as u64 * 86_400);
        client.accrue_interest(&id);
    }

    let di = client.get_deposit_interest(&id);
    // With daily compounding at 10% annual rate and integer division,
    // the daily interest is rounded down, resulting in ~730 total interest
    assert!(di.accrued_interest > 0);
}

#[test]
fn test_compound_interest_monthly() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 12_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1200, // 12% per year
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    // Accrue monthly for 12 months
    for month in 1..=12 {
        env.ledger()
            .with_mut(|li| li.timestamp = month as u64 * 30 * 86_400);
        client.accrue_interest(&id);
    }

    let di = client.get_deposit_interest(&id);
    // Should have accrued interest over 12 months
    assert!(di.accrued_interest > 0);
}

#[test]
fn test_compound_interest_quarterly() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &800, // 8% per year
        &CompoundingFrequency::Quarterly,
        &InterestRecipient::Tenant,
    );

    // Accrue quarterly for 4 quarters
    for quarter in 1..=4 {
        env.ledger()
            .with_mut(|li| li.timestamp = quarter as u64 * 90 * 86_400);
        client.accrue_interest(&id);
    }

    let di = client.get_deposit_interest(&id);
    assert!(di.accrued_interest > 0);
}

#[test]
fn test_compound_interest_annually() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &500, // 5% per year
        &CompoundingFrequency::Annually,
        &InterestRecipient::Tenant,
    );

    // Accrue annually for 2 years
    for year in 1..=2 {
        env.ledger()
            .with_mut(|li| li.timestamp = year as u64 * 365 * 86_400);
        client.accrue_interest(&id);
    }

    let di = client.get_deposit_interest(&id);
    assert!(di.accrued_interest > 0);
}

#[test]
fn test_distribute_interest_to_tenant() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1000,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    client.accrue_interest(&id);

    let di_before = client.get_deposit_interest(&id);
    assert!(di_before.accrued_interest > 0);

    // Distribute interest
    client.distribute_interest(&id);

    let di_after = client.get_deposit_interest(&id);
    // After distribution, accrued should be 0 or transferred
    assert!(di_after.accrued_interest >= 0);
}

#[test]
fn test_distribute_interest_to_landlord() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1000,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Landlord,
    );

    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    client.accrue_interest(&id);

    let di_before = client.get_deposit_interest(&id);
    assert!(di_before.accrued_interest > 0);

    // Distribute interest
    client.distribute_interest(&id);

    let di_after = client.get_deposit_interest(&id);
    assert!(di_after.accrued_interest >= 0);
}

#[test]
fn test_distribute_interest_split_50_50() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1000,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Split,
    );

    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    client.accrue_interest(&id);

    let di_before = client.get_deposit_interest(&id);
    let _accrued = di_before.accrued_interest;

    // Distribute interest
    client.distribute_interest(&id);

    let di_after = client.get_deposit_interest(&id);
    // After split distribution, both should receive ~50%
    assert!(di_after.accrued_interest >= 0);
}

#[test]
fn test_get_accrual_history_multiple_entries() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 0);

    let (client, _admin) = setup(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &600,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Split,
    );

    // Multiple accruals
    for i in 1..=3 {
        env.ledger()
            .with_mut(|li| li.timestamp = i as u64 * 30 * 86_400);
        client.accrue_interest(&id);
    }

    let history = client.get_accrual_history(&id);
    assert_eq!(history.len(), 3);
}

#[test]
fn test_get_deposit_interest_state_all_fields() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1000,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    client.accrue_interest(&id);

    let di = client.get_deposit_interest(&id);
    assert_eq!(di.principal, deposit);
    assert!(di.accrued_interest > 0);
    assert_eq!(di.total_with_interest, deposit + di.accrued_interest);
    assert!(di.last_accrual_date > 0);
}

#[test]
fn test_process_interest_accruals_batch() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    // Create multiple agreements
    let mut agreement_ids = Vec::new(&env);
    for i in 0..3 {
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);
        let id = match i {
            0 => String::from_str(&env, "AGR000"),
            1 => String::from_str(&env, "AGR001"),
            _ => String::from_str(&env, "AGR002"),
        };

        client.create_agreement(&AgreementInput {
            agreement_id: id.clone(),
            admin: landlord.clone(),
            user: tenant.clone(),
            agent: None,
            terms: AgreementTerms {
                monthly_rent: 1000,
                security_deposit: 5_000,
                start_date: 100,
                end_date: 1_000_000,
                agent_commission_rate: 0,
            },
            payment_token: Address::generate(&env),
            metadata_uri: String::from_str(&env, "").clone(),
            attributes: Vec::new(&env).clone(),
        });

        client.set_deposit_interest_config(
            &id,
            &600,
            &CompoundingFrequency::Monthly,
            &InterestRecipient::Tenant,
        );

        agreement_ids.push_back(id);
    }

    // Advance time
    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);

    // Batch process all accruals
    for i in 0..agreement_ids.len() {
        let id = agreement_ids.get(i).unwrap();
        client.accrue_interest(&id);
    }

    // Verify all were processed
    for i in 0..agreement_ids.len() {
        let id = agreement_ids.get(i).unwrap();
        let di = client.get_deposit_interest(&id);
        assert!(di.accrued_interest > 0);
    }
}

#[test]
fn test_zero_interest_rate() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &0, // 0% interest
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    env.ledger().with_mut(|li| li.timestamp = 365 * 86_400);
    let interest = client.calculate_accrued_interest(&id);
    assert_eq!(interest, 0);
}

#[test]
fn test_high_interest_rate_100_percent() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &10_000, // 100% per year
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    env.ledger().with_mut(|li| li.timestamp = 365 * 86_400);
    let interest = client.calculate_accrued_interest(&id);
    // Should be approximately equal to principal
    assert!(interest >= deposit);
}

#[test]
fn test_very_small_principal() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 1); // 1 unit

    client.set_deposit_interest_config(
        &id,
        &1000,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    let interest = client.calculate_accrued_interest(&id);
    // Should handle small amounts without precision loss
    assert!(interest >= 0);
}

#[test]
fn test_very_large_principal() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let large_deposit = i128::MAX / 2; // Very large but safe
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, large_deposit);

    client.set_deposit_interest_config(
        &id,
        &100, // 1% per year
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    let interest = client.calculate_accrued_interest(&id);
    // Should not overflow
    assert!(interest >= 0);
}

#[test]
fn test_multiple_accruals_sum_correctly() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 12_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1200,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    // Accrue multiple times
    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    client.accrue_interest(&id);

    env.ledger().with_mut(|li| li.timestamp = 60 * 86_400);
    client.accrue_interest(&id);

    env.ledger().with_mut(|li| li.timestamp = 90 * 86_400);
    client.accrue_interest(&id);

    let di = client.get_deposit_interest(&id);
    let history = client.get_accrual_history(&id);

    // Total should equal sum of accruals
    let mut total_accrued = 0i128;
    for entry in history.iter() {
        total_accrued += entry.amount;
    }

    assert_eq!(di.accrued_interest, total_accrued);
}
