#![no_std]

//! # Upgrade Registry Contract
//!
//! A shared, on-chain registry that tracks the current admin address and deployed
//! version of every Chioma protocol contract in one place.
//!
//! ## Responsibilities
//!
//! 1. **Protocol-wide visibility** — `get_protocol_status()` returns admin + version
//!    for all 8 contracts in a single read.
//!
//! 2. **Coordinated admin rotation** — An `AdminRotationProposal` requires M-of-N
//!    registry-admin approvals before marking the rotation "ready".  The deployment
//!    script (`scripts/rotate-admin.sh`) reads the approved proposal and calls
//!    `update_admin()` on every in-scope contract atomically.
//!
//! 3. **Post-upgrade bookkeeping** — After each per-contract upgrade the deployment
//!    script calls `update_version()` so the registry always reflects the live state.
//!
//! ## Who can write
//!
//! | Operation            | Required caller                                |
//! |----------------------|------------------------------------------------|
//! | `register_contract`  | Any registry admin                             |
//! | `update_version`     | Any registry admin                             |
//! | `update_admin`       | Any registry admin                             |
//! | `propose_rotation`   | Any registry admin                             |
//! | `approve_rotation`   | Any registry admin (not already approved)      |
//! | `execute_rotation`   | Any registry admin (after enough approvals)    |
//!
//! All reads are public / free.

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod errors;
mod events;
mod storage;
mod types;

pub use errors::RegistryError;
pub use storage::DataKey;
pub use types::{AdminRotationProposal, ContractRecord, ProtocolContractStatus};

use storage::{get_contract_names, get_registry_admins, get_required_approvals};

#[contract]
pub struct UpgradeRegistryContract;

#[contractimpl]
impl UpgradeRegistryContract {
    // ─── Initialization ──────────────────────────────────────────────────────

    /// Initialize the registry.
    ///
    /// Must be called once after deployment.  `admins` becomes the set of addresses
    /// that can register contracts, propose/approve rotations, and update records.
    /// `required_approvals` sets the M in the M-of-N rotation approval gate.
    ///
    /// # Errors
    /// - `AlreadyInitialized` if called more than once.
    pub fn initialize(
        env: Env,
        primary_admin: Address,
        admins: Vec<Address>,
        required_approvals: u32,
    ) -> Result<(), RegistryError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(RegistryError::AlreadyInitialized);
        }

        primary_admin.require_auth();

        let total = admins.len();
        let effective_required = if required_approvals == 0 || required_approvals > total {
            total
        } else {
            required_approvals
        };

        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage()
            .instance()
            .set(&DataKey::PrimaryAdmin, &primary_admin);
        env.storage()
            .instance()
            .set(&DataKey::RegistryAdmins, &admins);
        env.storage()
            .instance()
            .set(&DataKey::RequiredApprovals, &effective_required);
        env.storage()
            .instance()
            .set(&DataKey::ContractNames, &Vec::<String>::new(&env));
        env.storage()
            .instance()
            .set(&DataKey::ActiveRotationProposals, &Vec::<String>::new(&env));
        env.storage().instance().extend_ttl(500_000, 500_000);

        events::initialized(&env, primary_admin);
        Ok(())
    }

    // ─── Admin helpers ────────────────────────────────────────────────────────

    fn require_registry_admin(env: &Env, caller: &Address) -> Result<(), RegistryError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(RegistryError::NotInitialized);
        }
        let admins = get_registry_admins(env);
        for a in admins.iter() {
            if &a == caller {
                return Ok(());
            }
        }
        Err(RegistryError::Unauthorized)
    }

    // ─── Contract Registration ────────────────────────────────────────────────

    /// Register a protocol contract in the registry.
    ///
    /// Caller must be a registry admin.  Each `name` must be unique; the canonical
    /// names used by the deployment scripts are:
    /// `user_profile`, `property_registry`, `agent_registry`, `rent_obligation`,
    /// `escrow`, `payment`, `dispute_resolution`, `chioma`.
    ///
    /// # Errors
    /// - `Unauthorized` if caller is not a registry admin.
    /// - `ContractAlreadyRegistered` if a record with this name already exists.
    pub fn register_contract(
        env: Env,
        caller: Address,
        name: String,
        contract_id: Address,
        admin: Address,
        version: String,
        notes: String,
    ) -> Result<(), RegistryError> {
        caller.require_auth();
        Self::require_registry_admin(&env, &caller)?;

        let key = DataKey::Contract(name.clone());
        if env.storage().persistent().has(&key) {
            return Err(RegistryError::ContractAlreadyRegistered);
        }

        let record = ContractRecord {
            contract_id: contract_id.clone(),
            admin,
            version: version.clone(),
            last_updated: env.ledger().timestamp(),
            last_upgrade_notes: notes,
        };

        env.storage().persistent().set(&key, &record);
        env.storage()
            .persistent()
            .extend_ttl(&key, 500_000, 500_000);

        // Append to the name index
        let mut names = get_contract_names(&env);
        names.push_back(name.clone());
        env.storage()
            .instance()
            .set(&DataKey::ContractNames, &names);
        env.storage().instance().extend_ttl(500_000, 500_000);

        events::contract_registered(&env, name, contract_id);
        Ok(())
    }

    // ─── Record Updates ───────────────────────────────────────────────────────

    /// Update the recorded version for a contract after a successful upgrade.
    ///
    /// Typically called by the deployment script immediately after
    /// `execute_upgrade` / `execute_contract_upgrade` succeeds on the target contract.
    ///
    /// # Errors
    /// - `Unauthorized` if caller is not a registry admin.
    /// - `ContractNotFound` if the named contract is not registered.
    pub fn update_version(
        env: Env,
        caller: Address,
        name: String,
        new_version: String,
        notes: String,
    ) -> Result<(), RegistryError> {
        caller.require_auth();
        Self::require_registry_admin(&env, &caller)?;

        let key = DataKey::Contract(name.clone());
        let mut record: ContractRecord = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(RegistryError::ContractNotFound)?;

        let new_admin = record.admin.clone();
        record.version = new_version.clone();
        record.last_updated = env.ledger().timestamp();
        record.last_upgrade_notes = notes;

        env.storage().persistent().set(&key, &record);
        env.storage()
            .persistent()
            .extend_ttl(&key, 500_000, 500_000);

        events::contract_updated(&env, name, new_version, new_admin);
        Ok(())
    }

    /// Update the recorded admin address for a single contract.
    ///
    /// Called by the deployment script after rotating the admin on the target
    /// contract itself.  For a bulk rotation use `propose_rotation` /
    /// `approve_rotation` / `execute_rotation`.
    ///
    /// # Errors
    /// - `Unauthorized` if caller is not a registry admin.
    /// - `ContractNotFound` if the named contract is not registered.
    pub fn update_admin(
        env: Env,
        caller: Address,
        name: String,
        new_admin: Address,
    ) -> Result<(), RegistryError> {
        caller.require_auth();
        Self::require_registry_admin(&env, &caller)?;

        let key = DataKey::Contract(name.clone());
        let mut record: ContractRecord = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(RegistryError::ContractNotFound)?;

        let version = record.version.clone();
        record.admin = new_admin.clone();
        record.last_updated = env.ledger().timestamp();

        env.storage().persistent().set(&key, &record);
        env.storage()
            .persistent()
            .extend_ttl(&key, 500_000, 500_000);

        events::contract_updated(&env, name, version, new_admin);
        Ok(())
    }

    // ─── Admin Rotation Proposals ─────────────────────────────────────────────

    /// Propose a coordinated admin rotation across one or more protocol contracts.
    ///
    /// The proposal is open for `approve_rotation` calls until it accumulates
    /// `required_approvals` distinct approvals from registry admins.  Only then
    /// can `execute_rotation` be called.
    ///
    /// The deployment script (`rotate-admin.sh`) reads the executed proposal and
    /// applies the new admin to each target contract on-chain, then calls
    /// `update_admin` here for each one.
    ///
    /// # Errors
    /// - `Unauthorized` if caller is not a registry admin.
    /// - `EmptyTargetList` if `target_contracts` is empty.
    /// - `ProposalAlreadyExists` if a proposal with this id already exists.
    pub fn propose_rotation(
        env: Env,
        proposer: Address,
        proposal_id: String,
        new_admin: Address,
        target_contracts: Vec<String>,
        notes: String,
    ) -> Result<(), RegistryError> {
        proposer.require_auth();
        Self::require_registry_admin(&env, &proposer)?;

        if target_contracts.is_empty() {
            return Err(RegistryError::EmptyTargetList);
        }

        let key = DataKey::RotationProposal(proposal_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(RegistryError::ProposalAlreadyExists);
        }

        let required = get_required_approvals(&env);
        let mut approvals = Vec::new(&env);
        approvals.push_back(proposer.clone());

        let proposal = AdminRotationProposal {
            id: proposal_id.clone(),
            proposer: proposer.clone(),
            new_admin: new_admin.clone(),
            target_contracts,
            approvals,
            required_approvals: required,
            executed: false,
            created_at: env.ledger().timestamp(),
            notes,
        };

        env.storage().persistent().set(&key, &proposal);
        env.storage()
            .persistent()
            .extend_ttl(&key, 500_000, 500_000);

        let mut active: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::ActiveRotationProposals)
            .unwrap_or(Vec::new(&env));
        active.push_back(proposal_id.clone());
        env.storage()
            .instance()
            .set(&DataKey::ActiveRotationProposals, &active);
        env.storage().instance().extend_ttl(500_000, 500_000);

        events::rotation_proposed(&env, proposal_id, proposer, new_admin);
        Ok(())
    }

    /// Approve a pending rotation proposal.
    ///
    /// Each registry admin may approve at most once.  When the approval count
    /// reaches `required_approvals` the proposal becomes executable.
    ///
    /// # Errors
    /// - `Unauthorized` if caller is not a registry admin.
    /// - `ProposalNotFound` if the proposal does not exist.
    /// - `ProposalAlreadyExecuted` if the proposal was already executed.
    /// - `AlreadyApproved` if the caller already approved.
    pub fn approve_rotation(
        env: Env,
        approver: Address,
        proposal_id: String,
    ) -> Result<u32, RegistryError> {
        approver.require_auth();
        Self::require_registry_admin(&env, &approver)?;

        let key = DataKey::RotationProposal(proposal_id.clone());
        let mut proposal: AdminRotationProposal = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(RegistryError::ProposalNotFound)?;

        if proposal.executed {
            return Err(RegistryError::ProposalAlreadyExecuted);
        }

        for existing in proposal.approvals.iter() {
            if existing == approver {
                return Err(RegistryError::AlreadyApproved);
            }
        }

        proposal.approvals.push_back(approver.clone());
        let count = proposal.approvals.len();

        env.storage().persistent().set(&key, &proposal);
        env.storage()
            .persistent()
            .extend_ttl(&key, 500_000, 500_000);

        events::rotation_approved(&env, proposal_id, approver, count);
        Ok(count)
    }

    /// Mark a rotation proposal as executed once the registry records have been
    /// updated by the deployment script.
    ///
    /// Calling this does **not** directly call `update_admin` on each contract —
    /// that is the responsibility of the deployment tooling.  This function simply
    /// validates that sufficient approvals exist and stamps the proposal as done,
    /// preventing duplicate execution.
    ///
    /// In practice the `rotate-admin.sh` script calls `update_admin` for every
    /// target contract first, then calls this function to close the proposal.
    ///
    /// # Errors
    /// - `Unauthorized` if caller is not a registry admin.
    /// - `ProposalNotFound` if the proposal does not exist.
    /// - `ProposalAlreadyExecuted` if the proposal was already executed.
    /// - `InsufficientApprovals` if not enough admins have approved.
    pub fn execute_rotation(
        env: Env,
        executor: Address,
        proposal_id: String,
    ) -> Result<(), RegistryError> {
        executor.require_auth();
        Self::require_registry_admin(&env, &executor)?;

        let key = DataKey::RotationProposal(proposal_id.clone());
        let mut proposal: AdminRotationProposal = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(RegistryError::ProposalNotFound)?;

        if proposal.executed {
            return Err(RegistryError::ProposalAlreadyExecuted);
        }

        if proposal.approvals.len() < proposal.required_approvals {
            return Err(RegistryError::InsufficientApprovals);
        }

        proposal.executed = true;
        env.storage().persistent().set(&key, &proposal);
        env.storage()
            .persistent()
            .extend_ttl(&key, 500_000, 500_000);

        // Remove from active list
        let mut active: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::ActiveRotationProposals)
            .unwrap_or(Vec::new(&env));
        let mut remaining = Vec::new(&env);
        for id in active.iter() {
            if id != proposal_id {
                remaining.push_back(id);
            }
        }
        active = remaining;
        env.storage()
            .instance()
            .set(&DataKey::ActiveRotationProposals, &active);
        env.storage().instance().extend_ttl(500_000, 500_000);

        events::rotation_executed(&env, proposal_id, proposal.new_admin);
        Ok(())
    }

    // ─── Read Functions ───────────────────────────────────────────────────────

    /// Return the full `ContractRecord` for one registered contract.
    pub fn get_contract(env: Env, name: String) -> Result<ContractRecord, RegistryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Contract(name))
            .ok_or(RegistryError::ContractNotFound)
    }

    /// Return a lightweight status view for every registered contract.
    ///
    /// This is the primary "dashboard" query — it gives operators a single call
    /// that shows admin and version for all protocol contracts.
    pub fn get_protocol_status(env: Env) -> Vec<ProtocolContractStatus> {
        let names = get_contract_names(&env);
        let mut out = Vec::new(&env);

        for name in names.iter() {
            if let Some(record) = env
                .storage()
                .persistent()
                .get::<DataKey, ContractRecord>(&DataKey::Contract(name.clone()))
            {
                out.push_back(ProtocolContractStatus {
                    name,
                    contract_id: record.contract_id,
                    admin: record.admin,
                    version: record.version,
                    last_updated: record.last_updated,
                });
            }
        }

        out
    }

    /// Return the list of registered contract names.
    pub fn get_contract_names(env: Env) -> Vec<String> {
        get_contract_names(&env)
    }

    /// Return the rotation proposal for the given id.
    pub fn get_rotation_proposal(
        env: Env,
        proposal_id: String,
    ) -> Result<AdminRotationProposal, RegistryError> {
        env.storage()
            .persistent()
            .get(&DataKey::RotationProposal(proposal_id))
            .ok_or(RegistryError::ProposalNotFound)
    }

    /// Return the list of active (not-yet-executed) rotation proposal ids.
    pub fn get_active_rotation_proposals(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::ActiveRotationProposals)
            .unwrap_or(Vec::new(&env))
    }

    /// Return the current registry admins.
    pub fn get_registry_admins(env: Env) -> Vec<Address> {
        get_registry_admins(&env)
    }

    /// Return the required approval threshold for rotation proposals.
    pub fn get_required_approvals(env: Env) -> u32 {
        get_required_approvals(&env)
    }
}
