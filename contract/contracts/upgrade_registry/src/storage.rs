use soroban_sdk::{contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Initialization flag.
    Initialized,
    /// Registry admin multi-sig config: Vec<Address> of admins + required count.
    RegistryAdmins,
    /// Required number of admin approvals for proposals.
    RequiredApprovals,
    /// ContractRecord keyed by contract name string.
    Contract(String),
    /// Vec<String> of all registered contract names (for iteration).
    ContractNames,
    /// AdminRotationProposal keyed by proposal id.
    RotationProposal(String),
    /// Vec<String> of active (not-yet-executed) rotation proposal ids.
    ActiveRotationProposals,
    /// Primary registry admin address (can bypass multi-sig for read-only ops).
    PrimaryAdmin,
}

/// Convenience: read the list of registered names from storage.
pub fn get_contract_names(env: &Env) -> Vec<String> {
    env.storage()
        .instance()
        .get(&DataKey::ContractNames)
        .unwrap_or(Vec::new(env))
}

/// Convenience: read the registry admin list from storage.
pub fn get_registry_admins(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::RegistryAdmins)
        .unwrap_or(Vec::new(env))
}

/// Convenience: read the required approval count.
pub fn get_required_approvals(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::RequiredApprovals)
        .unwrap_or(1)
}
