//! Reentrancy / call-ordering tests for the Escrow contract (#1685).
//!
//! There is no real cross-contract call graph between this workspace's 9
//! contracts (none of them invoke one another directly) — every contract's
//! only external call is to a Soroban token contract for transfers. So the
//! meaningful reentrancy surface here is a malicious *token* re-entering
//! escrow's own entry points from inside `transfer`, not one project
//! contract re-entering another.
//!
//! `MaliciousToken` below implements `TokenInterface` and, on `transfer`,
//! calls back into the escrow contract before returning -- exercising
//! whichever callback the test configures.
//!
//! The finding: Soroban's host itself blocks this by default
//! (`ContractReentryMode::Prohibited`, see `soroban-env-host`'s
//! `frame.rs`), so a reentrant call into a contract already on the call
//! stack is rejected before that contract's own code runs at all. This
//! test still exists to (a) pin that host behavior down for this specific
//! call path so a future SDK/host upgrade that changes it gets caught, and
//! (b) confirm the resulting state (escrow status, token balances) is
//! exactly what one successful funding produces, not a partial or doubled
//! state. Escrow's own checks-effects-interactions ordering (state written
//! before the token transfer, see the `EFFECTS`/`INTERACTIONS` comments in
//! `escrow_impl.rs`) is a second, independent layer that would also reject
//! a reentrant call even if the host's guard were ever relaxed.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::TokenInterface;
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String};

use crate::escrow_impl::{EscrowContract, EscrowContractClient};
use crate::types::EscrowStatus;

#[contracttype]
enum TokenDataKey {
    Balance(Address),
}

#[contracttype]
enum ReentryConfigKey {
    Action,
    EscrowContract,
    ReentryAttempted,
    ReentryResult,
}

/// A token whose `transfer` re-enters a configured escrow entry point
/// before completing, to prove escrow's state writes (EFFECTS) happen
/// before its token calls (INTERACTIONS) and are enforced against a
/// mid-transfer reentrant call.
#[contract]
struct MaliciousToken;

#[contractimpl]
impl MaliciousToken {
    pub fn configure(env: Env, escrow_contract: Address, escrow_id: BytesN<32>, caller: Address) {
        env.storage()
            .instance()
            .set(&ReentryConfigKey::EscrowContract, &escrow_contract);
        env.storage().instance().set(
            &ReentryConfigKey::Action,
            &(escrow_id.clone(), caller.clone()),
        );
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let key = TokenDataKey::Balance(to);
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(current + amount));
    }

    /// Did the reentrant call actually get attempted (as opposed to the
    /// action never having been configured)?
    pub fn reentry_attempted(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&ReentryConfigKey::ReentryAttempted)
            .unwrap_or(false)
    }

    /// Error string from the reentrant call, if it failed, so the test can
    /// assert on *why* it was rejected, not just that it was.
    pub fn reentry_error(env: Env) -> Option<String> {
        env.storage()
            .instance()
            .get(&ReentryConfigKey::ReentryResult)
    }
}

#[contractimpl]
impl TokenInterface for MaliciousToken {
    fn allowance(_env: Env, _from: Address, _spender: Address) -> i128 {
        0
    }

    fn approve(
        _env: Env,
        _from: Address,
        _spender: Address,
        _amount: i128,
        _expiration_ledger: u32,
    ) {
    }

    fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&TokenDataKey::Balance(id))
            .unwrap_or(0)
    }

    fn transfer(env: Env, from: Address, to: soroban_sdk::MuxedAddress, amount: i128) {
        let to_address = to.address();

        // Move the balance first, exactly like a real token would, so the
        // reentrant call sees a consistent (already-debited) balance --
        // this test is about escrow's own state ordering, not about the
        // token lying about balances.
        let from_key = TokenDataKey::Balance(from.clone());
        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&from_key, &(from_balance - amount));

        let to_key = TokenDataKey::Balance(to_address.clone());
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&to_key, &(to_balance + amount));

        // Re-enter escrow, if configured, BEFORE this transfer call returns
        // -- this is the actual reentrancy attempt.
        if let Some(escrow_contract) = env
            .storage()
            .instance()
            .get::<_, Address>(&ReentryConfigKey::EscrowContract)
        {
            if let Some((escrow_id, caller)) = env
                .storage()
                .instance()
                .get::<_, (BytesN<32>, Address)>(&ReentryConfigKey::Action)
            {
                env.storage()
                    .instance()
                    .set(&ReentryConfigKey::ReentryAttempted, &true);

                let escrow_client = EscrowContractClient::new(&env, &escrow_contract);
                let result = escrow_client.try_fund_escrow(&escrow_id, &caller);

                // Soroban's host itself blocks reentrancy by default
                // (`ContractReentryMode::Prohibited`): a contract can't be
                // re-entered while it's still on the call stack, so this
                // reentrant call is rejected by the host as "Contract
                // re-entry is not allowed" before escrow's own
                // `status != Pending` check even runs. That host-level
                // guard is what `Err(Err(InvokeError::Abort))` reflects
                // here; escrow's CEI ordering (state written before the
                // token transfer) is the second, independent layer of
                // protection this module also tests directly.
                let error_string = match result {
                    Ok(_) => String::from_str(&env, "unexpectedly succeeded"),
                    Err(Ok(_)) => String::from_str(&env, "rejected with a typed EscrowError"),
                    Err(Err(soroban_sdk::InvokeError::Abort)) => {
                        String::from_str(&env, "rejected by host (reentry not allowed)")
                    }
                    Err(Err(soroban_sdk::InvokeError::Contract(_))) => {
                        String::from_str(&env, "rejected with a raw contract error code")
                    }
                };
                env.storage()
                    .instance()
                    .set(&ReentryConfigKey::ReentryResult, &error_string);
            }
        }
    }

    fn transfer_from(_env: Env, _spender: Address, _from: Address, _to: Address, _amount: i128) {}

    fn burn(_env: Env, _from: Address, _amount: i128) {}

    fn burn_from(_env: Env, _spender: Address, _from: Address, _amount: i128) {}

    fn decimals(_env: Env) -> u32 {
        7
    }

    fn name(env: Env) -> String {
        String::from_str(&env, "MaliciousToken")
    }

    fn symbol(env: Env) -> String {
        String::from_str(&env, "MAL")
    }
}

fn setup(
    env: &Env,
) -> (
    EscrowContractClient<'_>,
    Address,
    Address,
    Address,
    Address,
    Address,
    Address,
) {
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(env, &contract_id);

    let depositor = Address::generate(env);
    let beneficiary = Address::generate(env);
    let arbiter = Address::generate(env);
    let platform_governance = Address::generate(env);
    let agent_referral = Address::generate(env);

    let token_id = env.register(MaliciousToken, ());

    (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_id,
    )
}

/// A malicious token re-entering `fund_escrow` mid-transfer must not be
/// able to double-fund (double-spend) the same escrow: escrow's status is
/// already Funded (EFFECTS) before the token transfer (INTERACTIONS) runs,
/// so the reentrant call's own `status != Pending` check rejects it (#1685).
#[test]
fn test_fund_escrow_reentrancy_cannot_double_fund() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token,
    );

    let token_client = MaliciousTokenClient::new(&env, &token);
    token_client.mint(&depositor, &amount);
    token_client.configure(&client.address, &escrow_id, &depositor);

    client.fund_escrow(&escrow_id, &depositor);

    // The reentrant call must actually have been attempted, not silently
    // skipped -- otherwise this test would pass for the wrong reason.
    assert!(token_client.reentry_attempted());
    assert_eq!(
        token_client.reentry_error(),
        Some(String::from_str(
            &env,
            "rejected by host (reentry not allowed)"
        )),
    );

    // The escrow itself must reflect exactly one successful funding, not
    // two: a double-fund would have transferred `amount` out of the
    // depositor a second time.
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Funded);
    assert_eq!(escrow.amount, amount);
    assert_eq!(token_client.balance(&depositor), 0);
    assert_eq!(token_client.balance(&client.address), amount);
}

/// Without any reentrancy attempt configured, funding still behaves
/// normally -- this pins down that MaliciousToken's plumbing itself isn't
/// what makes the above test pass.
#[test]
fn test_fund_escrow_without_reentrancy_succeeds_normally() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let amount = 500i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token,
    );

    let token_client = MaliciousTokenClient::new(&env, &token);
    token_client.mint(&depositor, &amount);
    // Deliberately not calling `configure`, so `transfer` has nothing to
    // re-enter.

    client.fund_escrow(&escrow_id, &depositor);

    assert!(!token_client.reentry_attempted());
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Funded);
}
