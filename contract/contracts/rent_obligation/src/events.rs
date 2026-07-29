use soroban_sdk::{contractevent, Address, Env, String};

/// Event emitted when the contract is initialized
/// Topics: ["initialized"]
#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    pub initialized_at: u64,
}

/// Event emitted when a rent obligation NFT is minted
/// Topics: ["minted", landlord: Address]
#[contractevent(topics = ["minted"])]
pub struct ObligationMinted {
    #[topic]
    pub landlord: Address,
    pub agreement_id: String,
    pub minted_at: u64,
}

/// Event emitted when a rent obligation NFT is transferred
/// Topics: ["transferred", from: Address, to: Address]
#[contractevent(topics = ["transferred"])]
pub struct ObligationTransferred {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub agreement_id: String,
}

/// Event emitted when a rent obligation NFT is burned
/// Topics: ["burned", owner: Address]
#[contractevent(topics = ["burned"])]
pub struct ObligationBurned {
    #[topic]
    pub owner: Address,
    pub token_id: String,
    pub reason: String,
}

/// Event emitted when a contract upgrade is proposed
/// Topics: ["upgrade_proposed", proposal_id: String]
#[contractevent(topics = ["upgrade_proposed"])]
pub struct UpgradeProposed {
    #[topic]
    pub proposal_id: String,
    pub proposer: Address,
    pub eta: u64,
    pub created_at: u64,
}

/// Event emitted when a contract upgrade proposal is approved
/// Topics: ["upgrade_approved", proposal_id: String]
#[contractevent(topics = ["upgrade_approved"])]
pub struct UpgradeApproved {
    #[topic]
    pub proposal_id: String,
    pub approver: Address,
    pub approval_count: u32,
}

/// Event emitted when a contract upgrade is executed
/// Topics: ["upgrade_executed", proposal_id: String]
#[contractevent(topics = ["upgrade_executed"])]
pub struct UpgradeExecuted {
    #[topic]
    pub proposal_id: String,
    pub executor: Address,
    pub executed_at: u64,
}

/// Helper function to emit contract initialized event
pub(crate) fn contract_initialized(env: &Env) {
    ContractInitialized {
        initialized_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit obligation minted event
pub(crate) fn obligation_minted(
    env: &Env,
    agreement_id: String,
    landlord: Address,
    minted_at: u64,
) {
    ObligationMinted {
        landlord,
        agreement_id,
        minted_at,
    }
    .publish(env);
}

/// Helper function to emit obligation transferred event
pub(crate) fn obligation_transferred(env: &Env, agreement_id: String, from: Address, to: Address) {
    ObligationTransferred {
        from,
        to,
        agreement_id,
    }
    .publish(env);
}

/// Helper function to emit NFT burned event
pub(crate) fn obligation_burned(env: &Env, token_id: String, owner: Address, reason: String) {
    ObligationBurned {
        owner,
        token_id,
        reason,
    }
    .publish(env);
}

/// Helper function to emit upgrade proposed event
pub(crate) fn upgrade_proposed(env: &Env, proposal_id: String, proposer: Address, eta: u64) {
    UpgradeProposed {
        proposal_id,
        proposer,
        eta,
        created_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit upgrade approved event
pub(crate) fn upgrade_approved(
    env: &Env,
    proposal_id: String,
    approver: Address,
    approval_count: u32,
) {
    UpgradeApproved {
        proposal_id,
        approver,
        approval_count,
    }
    .publish(env);
}

/// Helper function to emit upgrade executed event
pub(crate) fn upgrade_executed(env: &Env, proposal_id: String, executor: Address) {
    UpgradeExecuted {
        proposal_id,
        executor,
        executed_at: env.ledger().timestamp(),
    }
    .publish(env);
}
