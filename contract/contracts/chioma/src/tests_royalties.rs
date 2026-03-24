use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

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
        landlord: landlord.clone(),
        tenant: tenant.clone(),
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
        landlord: landlord.clone(),
        tenant: tenant.clone(),
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
        landlord: landlord.clone(),
        tenant: tenant.clone(),
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
    assert_eq!(ag.landlord, buyer);

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
        landlord: landlord.clone(),
        tenant: tenant.clone(),
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
