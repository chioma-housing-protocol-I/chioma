//! Access control and role-based authorization for the Rent Obligation contract.
//! Validates that callers have the proper role to create or modify obligations.
use soroban_sdk::{Address, Env};

use crate::errors::ObligationError;
use crate::storage::DataKey;
use crate::types::RentObligation;

/// Access control validation functions.
pub struct AccessControl;

impl AccessControl {
    /// Verify caller is the current owner of the obligation.
    /// Owner is the only role permitted to transfer or burn an obligation.
    pub fn is_owner(obligation: &RentObligation, caller: &Address) -> Result<(), ObligationError> {
        if obligation.owner == *caller {
            Ok(())
        } else {
            Err(ObligationError::Unauthorized)
        }
    }

    /// Verify caller is the system admin.
    /// The admin has emergency powers to reassign obligations, e.g. after a
    /// dispute resolution or lost-key recovery.
    pub fn is_admin(env: &Env, caller: &Address) -> Result<(), ObligationError> {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(ObligationError::AdminNotSet)?;

        if admin == *caller {
            Ok(())
        } else {
            Err(ObligationError::Unauthorized)
        }
    }
}
