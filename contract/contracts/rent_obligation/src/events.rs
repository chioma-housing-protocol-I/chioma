use soroban_sdk::{contractevent, Address, Env, String};

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
