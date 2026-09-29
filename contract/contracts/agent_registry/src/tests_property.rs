//! Property-based tests for the Agent Registry contract's core
//! state-machine invariant (#1562): an already-registered agent can never
//! be "re-registered" with conflicting data, and doing so must never reset
//! verification status or any other stored field -- an attacker (or the
//! agent themselves) re-submitting `register_agent` with a different
//! profile hash must not be able to silently roll back a verified agent to
//! unverified, or otherwise mutate the stored record.
//!
//! Each proptest case drives a fresh, real `AgentRegistryContract` instance
//! through a real `Env`, exercising `register_agent`/`verify_agent`
//! end-to-end rather than mirroring the logic in a pure function.

use super::*;
use proptest::prelude::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_contract(env: &Env) -> AgentRegistryContractClient<'_> {
    let contract_id = env.register(AgentRegistryContract, ());
    AgentRegistryContractClient::new(env, &contract_id)
}

/// Registers an agent, optionally verifies them, then attempts to
/// re-register the same agent address with different profile data. The
/// re-registration must always fail, and the stored record (including
/// `verified`) must be completely unchanged afterwards.
fn duplicate_registration_never_overwrites(
    profile_a: &str,
    profile_b: &str,
    verify_before_retry: bool,
) {
    let env = Env::default();
    let client = create_contract(&env);
    env.mock_all_auths();

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let agent = Address::generate(&env);
    let hash_a = String::from_str(&env, profile_a);
    let hash_b = String::from_str(&env, profile_b);

    client.register_agent(&agent, &hash_a);

    if verify_before_retry {
        client.verify_agent(&admin, &agent);
    }

    let original = client.get_agent_info(&agent).unwrap();
    let count_after_first = client.get_agent_count();

    let second = client.try_register_agent(&agent, &hash_b);
    assert_eq!(
        second,
        Err(Ok(AgentError::AgentAlreadyRegistered)),
        "re-registering an already-registered agent must always fail"
    );

    let after = client.get_agent_info(&agent).unwrap();
    assert_eq!(
        after, original,
        "rejected re-registration must not mutate the stored record, \
         including verification status"
    );
    assert_eq!(
        after.verified, verify_before_retry,
        "rejected re-registration must never reset (or set) verification status"
    );
    assert_eq!(
        client.get_agent_count(),
        count_after_first,
        "rejected re-registration must not increment the agent count"
    );
}

proptest! {
    /// An unverified agent's re-registration attempt is rejected without
    /// changing any stored field.
    #[test]
    fn prop_duplicate_registration_unverified_never_overwrites(
        profile_a in "[a-zA-Z0-9]{10,40}",
        profile_b in "[a-zA-Z0-9]{10,40}",
    ) {
        duplicate_registration_never_overwrites(&profile_a, &profile_b, false);
    }

    /// A verified agent's re-registration attempt is rejected without
    /// resetting `verified` back to false -- the invariant that matters
    /// most here, since a reset would let an unverified re-registration
    /// silently strip a verified agent's status.
    #[test]
    fn prop_duplicate_registration_verified_never_resets_verification(
        profile_a in "[a-zA-Z0-9]{10,40}",
        profile_b in "[a-zA-Z0-9]{10,40}",
    ) {
        duplicate_registration_never_overwrites(&profile_a, &profile_b, true);
    }
}
