use soroban_sdk::{contracttype, Address, String, Vec};

/// A point-in-time snapshot of a contract's admin and deployed version.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractRecord {
    /// On-chain contract ID (Stellar C… address).
    pub contract_id: Address,
    /// The address currently authorized as admin for this contract.
    pub admin: Address,
    /// Human-readable semantic version reported by the contract, e.g. "1.2.3".
    pub version: String,
    /// Ledger timestamp of the last admin or version update.
    pub last_updated: u64,
    /// Optional notes from the last upgrade execution (e.g. proposal id).
    pub last_upgrade_notes: String,
}

/// Pending admin rotation proposal — must be approved by `required_approvals`
/// registry admins before it is applied to the listed contracts.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminRotationProposal {
    pub id: String,
    pub proposer: Address,
    /// The new admin address that will be set across all `target_contracts`.
    pub new_admin: Address,
    /// Which protocol contracts are in scope for this rotation.
    pub target_contracts: Vec<String>,
    pub approvals: Vec<Address>,
    pub required_approvals: u32,
    pub executed: bool,
    pub created_at: u64,
    pub notes: String,
}

/// Lightweight status view returned by `get_protocol_status`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolContractStatus {
    pub name: String,
    pub contract_id: Address,
    pub admin: Address,
    pub version: String,
    pub last_updated: u64,
}
