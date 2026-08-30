use soroban_sdk::{symbol_short, Address, Env, String};

#[allow(deprecated)]
pub fn initialized(env: &Env, primary_admin: Address) {
    env.events().publish(
        (symbol_short!("reg_init"), primary_admin),
        env.ledger().timestamp(),
    );
}

#[allow(deprecated)]
pub fn contract_registered(env: &Env, name: String, contract_id: Address) {
    env.events()
        .publish((symbol_short!("reg_add"), name), contract_id);
}

#[allow(deprecated)]
pub fn contract_updated(env: &Env, name: String, new_version: String, new_admin: Address) {
    env.events()
        .publish((symbol_short!("reg_upd"), name), (new_version, new_admin));
}

#[allow(deprecated)]
pub fn rotation_proposed(env: &Env, proposal_id: String, proposer: Address, new_admin: Address) {
    env.events().publish(
        (symbol_short!("rot_prop"), proposal_id),
        (proposer, new_admin),
    );
}

#[allow(deprecated)]
pub fn rotation_approved(env: &Env, proposal_id: String, approver: Address, approval_count: u32) {
    env.events().publish(
        (symbol_short!("rot_appr"), proposal_id),
        (approver, approval_count),
    );
}

#[allow(deprecated)]
pub fn rotation_executed(env: &Env, proposal_id: String, new_admin: Address) {
    env.events()
        .publish((symbol_short!("rot_exec"), proposal_id), new_admin);
}
