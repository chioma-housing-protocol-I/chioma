//! Storage operations for the Escrow contract.
//! Implements single-responsibility getter/setter helpers.
use soroban_sdk::{Address, BytesN, Env, Vec};

use crate::types::{DataKey, Escrow, ReleaseApproval};

/// Escrow storage management.
pub struct EscrowStorage;

impl EscrowStorage {
    /// Retrieve an escrow by ID.
    /// Returns None if escrow doesn't exist.
    pub fn get(env: &Env, id: &BytesN<32>) -> Option<Escrow> {
        let key = DataKey::Escrow(id.clone());
        env.storage().persistent().get::<_, Escrow>(&key)
    }

    /// Save or update an escrow.
    /// Updates existing escrow or creates a new one.
    pub fn save(env: &Env, escrow: &Escrow) {
        let key = DataKey::Escrow(escrow.id.clone());
        env.storage().persistent().set(&key, escrow);
    }

    /// Retrieve all approvals for an escrow release.
    /// Returns empty Vec if no approvals exist yet.
    pub fn get_approvals(env: &Env, escrow_id: &BytesN<32>) -> Vec<ReleaseApproval> {
        let key = DataKey::Approvals(escrow_id.clone());
        match env
            .storage()
            .persistent()
            .get::<_, Vec<ReleaseApproval>>(&key)
        {
            Some(approvals) => approvals,
            None => Vec::new(env),
        }
    }

    /// Add a new approval for fund release.
    /// Appends to existing approvals list.
    pub fn add_approval(env: &Env, escrow_id: &BytesN<32>, approval: ReleaseApproval) {
        let mut approvals = Self::get_approvals(env, escrow_id);
        approvals.push_back(approval);
        let key = DataKey::Approvals(escrow_id.clone());
        env.storage().persistent().set(&key, &approvals);
    }

    /// Clear all approvals for an escrow.
    /// Also clears per-target counts and per-signer flags.
    pub fn clear_approvals(env: &Env, escrow_id: &BytesN<32>) {
        let key = DataKey::Approvals(escrow_id.clone());
        env.storage().persistent().remove(&key);
    }

    /// Get the approval count for a specific release target (O(1) lookup).
    pub fn get_approval_count_for_target(
        env: &Env,
        escrow_id: &BytesN<32>,
        release_to: &Address,
    ) -> u32 {
        let key = DataKey::ApprovalCount(escrow_id.clone(), release_to.clone());
        env.storage().persistent().get::<_, u32>(&key).unwrap_or(0)
    }

    /// Increment the approval count for a specific release target.
    pub fn increment_approval_count(env: &Env, escrow_id: &BytesN<32>, release_to: &Address) {
        let count = Self::get_approval_count_for_target(env, escrow_id, release_to);
        let key = DataKey::ApprovalCount(escrow_id.clone(), release_to.clone());
        env.storage().persistent().set(&key, &(count + 1));
    }

    /// Check if a specific signer has already approved a specific target (O(1) lookup).
    pub fn has_signer_approved(
        env: &Env,
        escrow_id: &BytesN<32>,
        signer: &Address,
        release_to: &Address,
    ) -> bool {
        let key = DataKey::SignerApproved(escrow_id.clone(), signer.clone(), release_to.clone());
        env.storage()
            .persistent()
            .get::<_, bool>(&key)
            .unwrap_or(false)
    }

    /// Mark a signer as having approved a specific target.
    pub fn set_signer_approved(
        env: &Env,
        escrow_id: &BytesN<32>,
        signer: &Address,
        release_to: &Address,
    ) {
        let key = DataKey::SignerApproved(escrow_id.clone(), signer.clone(), release_to.clone());
        env.storage().persistent().set(&key, &true);
    }

    /// Clear approval counts and signer flags for given targets.
    pub fn clear_approval_counts(
        env: &Env,
        escrow_id: &BytesN<32>,
        targets: &[Address],
        signers: &[Address],
    ) {
        for target in targets {
            let count_key = DataKey::ApprovalCount(escrow_id.clone(), target.clone());
            env.storage().persistent().remove(&count_key);
            for signer in signers {
                let flag_key =
                    DataKey::SignerApproved(escrow_id.clone(), signer.clone(), target.clone());
                env.storage().persistent().remove(&flag_key);
            }
        }
    }

    /// Get the current count of escrows created.
    pub fn get_count(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get::<_, u32>(&DataKey::EscrowCount)
            .unwrap_or_default()
    }

    /// Increment escrow counter.
    pub fn increment_count(env: &Env) {
        let count = Self::get_count(env);
        env.storage()
            .instance()
            .set(&DataKey::EscrowCount, &(count + 1));
    }
}
