use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
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

fn create_token_mock<'a>(
    env: &'a Env,
    admin: &Address,
) -> (Address, soroban_sdk::token::StellarAssetClient<'a>) {
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    (
        token_id.address(),
        soroban_sdk::token::StellarAssetClient::new(env, &token_id.address()),
    )
}

fn create_agreement_with_token(
    client: &ContractClient<'_>,
    env: &Env,
    agreement_id: &String,
    admin: &Address,
    user: &Address,
    token: &Address,
) {
    client.create_agreement(&AgreementInput {
        agreement_id: agreement_id.clone(),
        admin: admin.clone(),
        user: user.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 5000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(env, ""),
        attributes: Vec::new(env),
    });
}

#[test]
fn test_set_and_get_royalty() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let token = Address::generate(&env);
    let id = String::from_str(&env, "T1");

    client.create_agreement(&AgreementInput {
        agreement_id: id.clone(),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 5000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    let recipient = Address::generate(&env);
    client.set_royalty(&id, &500, &recipient); // 5%

    let config = client.get_royalty(&id);
    assert_eq!(config.token_id, id);
    assert_eq!(config.royalty_percentage, 500);
    assert_eq!(config.royalty_recipient, recipient);
}

#[test]
fn test_calculate_royalty() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let id = String::from_str(&env, "T1");
    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let token = Address::generate(&env);
    client.create_agreement(&AgreementInput {
        agreement_id: id.clone(),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 5000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.set_royalty(&id, &1000, &Address::generate(&env)); // 10%

    let amount = client.calculate_royalty(&id, &10000);
    assert_eq!(amount, 1000);
}

#[test]
fn test_transfer_with_royalty() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let (token_address, token_client) = create_token_mock(&env, &token_admin);
    let id = String::from_str(&env, "T1");

    client.create_agreement(&AgreementInput {
        agreement_id: id.clone(),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 5000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token_address.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    let recipient = Address::generate(&env);
    client.set_royalty(&id, &1000, &recipient); // 10%

    let buyer = Address::generate(&env);
    let sale_price = 10000_i128;

    // Give buyer funds
    token_client.mint(&buyer, &sale_price);

    client.transfer_with_royalty(&id, &buyer, &sale_price);

    // Verify balances
    // Royalty: 10% of 10000 = 1000
    // Seller: 9000
    let token_read = soroban_sdk::token::Client::new(&env, &token_address);
    assert_eq!(token_read.balance(&recipient), 1000);
    assert_eq!(token_read.balance(&landlord), 9000);
    assert_eq!(token_read.balance(&buyer), 0);

    // Verify agreement owner updated
    let ag = client.get_agreement(&id).unwrap();
    assert_eq!(ag.admin, buyer);

    // Verify payments history
    let payments = client.get_royalty_payments(&id);
    assert_eq!(payments.len(), 1);
    let pay = payments.get(0).unwrap();
    assert_eq!(pay.from, landlord);
    assert_eq!(pay.to, buyer);
    assert_eq!(pay.amount, sale_price);
    assert_eq!(pay.royalty_amount, 1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_invalid_royalty_percentage_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let id = String::from_str(&env, "T1");
    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let token = Address::generate(&env);
    client.create_agreement(&AgreementInput {
        agreement_id: id.clone(),
        admin: landlord.clone(),
        user: tenant.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 5000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(&env, "").clone(),
        attributes: Vec::new(&env).clone(),
    });

    client.set_royalty(&id, &2501, &Address::generate(&env)); // > 25%
}

#[test]
fn test_set_royalty_accepts_zero_and_maximum() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let token = Address::generate(&env);
    let agreement_zero = String::from_str(&env, "ROYALTY_ZERO");
    let agreement_max = String::from_str(&env, "ROYALTY_MAX");

    create_agreement_with_token(&client, &env, &agreement_zero, &landlord, &tenant, &token);
    create_agreement_with_token(&client, &env, &agreement_max, &landlord, &tenant, &token);

    let zero_recipient = Address::generate(&env);
    client.set_royalty(&agreement_zero, &0, &zero_recipient);
    let zero_config = client.get_royalty(&agreement_zero);
    assert_eq!(zero_config.royalty_percentage, 0);
    assert_eq!(zero_config.royalty_recipient, zero_recipient);

    let max_recipient = Address::generate(&env);
    client.set_royalty(&agreement_max, &2500, &max_recipient);
    let max_config = client.get_royalty(&agreement_max);
    assert_eq!(max_config.royalty_percentage, 2500);
    assert_eq!(max_config.royalty_recipient, max_recipient);
}

#[test]
fn test_update_royalty_replaces_percentage_and_recipient() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let token = Address::generate(&env);
    let agreement_id = String::from_str(&env, "ROYALTY_UPDATE");

    create_agreement_with_token(&client, &env, &agreement_id, &landlord, &tenant, &token);

    client.set_royalty(&agreement_id, &500, &Address::generate(&env));
    let replacement_recipient = Address::generate(&env);
    client.set_royalty(&agreement_id, &1000, &replacement_recipient);

    let config = client.get_royalty(&agreement_id);
    assert_eq!(config.royalty_percentage, 1000);
    assert_eq!(config.royalty_recipient, replacement_recipient);
}

#[test]
fn test_calculate_royalty_edge_cases() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let token = Address::generate(&env);
    let agreement_id = String::from_str(&env, "ROYALTY_CALC");

    create_agreement_with_token(&client, &env, &agreement_id, &landlord, &tenant, &token);

    client.set_royalty(&agreement_id, &1000, &Address::generate(&env));
    assert_eq!(client.calculate_royalty(&agreement_id, &1), 0);
    assert_eq!(
        client.calculate_royalty(&agreement_id, &9_223_372_036_854_775_i128),
        922_337_203_685_477_i128
    );

    client.set_royalty(&agreement_id, &2500, &Address::generate(&env));
    assert_eq!(client.calculate_royalty(&agreement_id, &1000), 250);
}

#[test]
fn test_transfer_with_zero_and_maximum_royalty() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let token_admin = Address::generate(&env);
    let (token_address, token_client) = create_token_mock(&env, &token_admin);
    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);

    let zero_id = String::from_str(&env, "TRANSFER_ZERO");
    create_agreement_with_token(&client, &env, &zero_id, &landlord, &tenant, &token_address);
    client.set_royalty(&zero_id, &0, &Address::generate(&env));
    let zero_buyer = Address::generate(&env);
    token_client.mint(&zero_buyer, &1000);
    client.transfer_with_royalty(&zero_id, &zero_buyer, &1000);
    let token_reader = soroban_sdk::token::Client::new(&env, &token_address);
    assert_eq!(token_reader.balance(&landlord), 1000);

    let max_id = String::from_str(&env, "TRANSFER_MAX");
    let max_landlord = Address::generate(&env);
    create_agreement_with_token(
        &client,
        &env,
        &max_id,
        &max_landlord,
        &tenant,
        &token_address,
    );
    let recipient = Address::generate(&env);
    client.set_royalty(&max_id, &2500, &recipient);
    let max_buyer = Address::generate(&env);
    token_client.mint(&max_buyer, &1000);
    client.transfer_with_royalty(&max_id, &max_buyer, &1000);

    assert_eq!(token_reader.balance(&recipient), 250);
    assert_eq!(token_reader.balance(&max_landlord), 750);
}

#[test]
fn test_transfer_records_multiple_royalty_payments_per_token() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let token_admin = Address::generate(&env);
    let (token_address, token_client) = create_token_mock(&env, &token_admin);
    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let agreement_id = String::from_str(&env, "TRANSFER_HISTORY");
    let recipient = Address::generate(&env);

    create_agreement_with_token(
        &client,
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        &token_address,
    );
    client.set_royalty(&agreement_id, &500, &recipient);

    let buyer_one = Address::generate(&env);
    token_client.mint(&buyer_one, &1000);
    client.transfer_with_royalty(&agreement_id, &buyer_one, &1000);

    let buyer_two = Address::generate(&env);
    token_client.mint(&buyer_two, &2000);
    client.transfer_with_royalty(&agreement_id, &buyer_two, &2000);

    let payments = client.get_royalty_payments(&agreement_id);
    assert_eq!(payments.len(), 2);
    assert_eq!(payments.get(0).unwrap().royalty_amount, 50);
    assert_eq!(payments.get(1).unwrap().royalty_amount, 100);
}

#[test]
fn test_transfer_keeps_payments_isolated_per_token() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let token_admin = Address::generate(&env);
    let (token_address, token_client) = create_token_mock(&env, &token_admin);
    let tenant = Address::generate(&env);
    let recipient = Address::generate(&env);

    let agreement_a = String::from_str(&env, "TOKEN_A");
    let landlord_a = Address::generate(&env);
    create_agreement_with_token(
        &client,
        &env,
        &agreement_a,
        &landlord_a,
        &tenant,
        &token_address,
    );
    client.set_royalty(&agreement_a, &1000, &recipient);

    let agreement_b = String::from_str(&env, "TOKEN_B");
    let landlord_b = Address::generate(&env);
    create_agreement_with_token(
        &client,
        &env,
        &agreement_b,
        &landlord_b,
        &tenant,
        &token_address,
    );
    client.set_royalty(&agreement_b, &500, &recipient);

    let buyer_a = Address::generate(&env);
    let buyer_b = Address::generate(&env);
    token_client.mint(&buyer_a, &1000);
    token_client.mint(&buyer_b, &2000);
    client.transfer_with_royalty(&agreement_a, &buyer_a, &1000);
    client.transfer_with_royalty(&agreement_b, &buyer_b, &2000);

    let payments_a = client.get_royalty_payments(&agreement_a);
    let payments_b = client.get_royalty_payments(&agreement_b);
    assert_eq!(payments_a.len(), 1);
    assert_eq!(payments_b.len(), 1);
    assert_eq!(payments_a.get(0).unwrap().royalty_amount, 100);
    assert_eq!(payments_b.get(0).unwrap().royalty_amount, 100);
}

#[test]
fn test_transfer_supports_seller_or_buyer_as_royalty_recipient() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let token_admin = Address::generate(&env);
    let (token_address, token_client) = create_token_mock(&env, &token_admin);
    let tenant = Address::generate(&env);

    let seller_recipient_id = String::from_str(&env, "SELLER_RECIPIENT");
    let seller = Address::generate(&env);
    create_agreement_with_token(
        &client,
        &env,
        &seller_recipient_id,
        &seller,
        &tenant,
        &token_address,
    );
    client.set_royalty(&seller_recipient_id, &1000, &seller);
    let buyer = Address::generate(&env);
    token_client.mint(&buyer, &1000);
    client.transfer_with_royalty(&seller_recipient_id, &buyer, &1000);
    let token_reader = soroban_sdk::token::Client::new(&env, &token_address);
    assert_eq!(token_reader.balance(&seller), 1000);

    let buyer_recipient_id = String::from_str(&env, "BUYER_RECIPIENT");
    let second_seller = Address::generate(&env);
    create_agreement_with_token(
        &client,
        &env,
        &buyer_recipient_id,
        &second_seller,
        &tenant,
        &token_address,
    );
    let second_buyer = Address::generate(&env);
    client.set_royalty(&buyer_recipient_id, &1000, &second_buyer);
    token_client.mint(&second_buyer, &1000);
    client.transfer_with_royalty(&buyer_recipient_id, &second_buyer, &1000);
    assert_eq!(token_reader.balance(&second_buyer), 100);
    assert_eq!(token_reader.balance(&second_seller), 900);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_transfer_with_negative_sale_price_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let token_admin = Address::generate(&env);
    let (token_address, _token_client) = create_token_mock(&env, &token_admin);
    let landlord = Address::generate(&env);
    let tenant = Address::generate(&env);
    let agreement_id = String::from_str(&env, "NEGATIVE_TRANSFER");

    create_agreement_with_token(
        &client,
        &env,
        &agreement_id,
        &landlord,
        &tenant,
        &token_address,
    );
    client.set_royalty(&agreement_id, &1000, &Address::generate(&env));

    client.transfer_with_royalty(&agreement_id, &Address::generate(&env), &-1);
}
