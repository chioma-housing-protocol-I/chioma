/// Access control and role-based authorization for the Escrow contract.
/// Validates that callers have the proper role to perform actions.
#[allow(unused_imports)]
use soroban_sdk::{Address, Env};

use super::errors::EscrowError;
use super::types::Escrow;

/// Access control validation functions.
pub struct AccessControl;

impl AccessControl {
    /// Verify caller is the depositor (tenant).
    pub fn is_depositor(escrow: &Escrow, caller: &Address) -> Result<(), EscrowError> {
        if escrow.depositor == *caller {
            Ok(())
        } else {
            Err(EscrowError::NotAuthorized)
        }
    }

    /// Verify caller is the beneficiary (landlord).
    pub fn is_beneficiary(escrow: &Escrow, caller: &Address) -> Result<(), EscrowError> {
        if escrow.beneficiary == *caller {
            Ok(())
        } else {
            Err(EscrowError::NotAuthorized)
        }
    }

    /// Verify caller is the arbiter (admin).
    pub fn is_arbiter(escrow: &Escrow, caller: &Address) -> Result<(), EscrowError> {
        if escrow.arbiter == *caller {
            Ok(())
        } else {
            Err(EscrowError::NotAuthorized)
        }
    }

    /// Verify caller is any of the three parties (depositor, beneficiary, or arbiter).
    pub fn is_party(escrow: &Escrow, caller: &Address) -> Result<(), EscrowError> {
        if escrow.depositor == *caller || escrow.beneficiary == *caller || escrow.arbiter == *caller
        {
            Ok(())
        } else {
            Err(EscrowError::InvalidSigner)
        }
    }

    /// Verify caller is either depositor or beneficiary (the two primary parties).
    /// Used for dispute initiation.
    pub fn is_primary_party(escrow: &Escrow, caller: &Address) -> Result<(), EscrowError> {
        if escrow.depositor == *caller || escrow.beneficiary == *caller {
            Ok(())
        } else {
            Err(EscrowError::NotAuthorized)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn create_test_escrow(env: &Env) -> (Escrow, Address, Address, Address) {
        use soroban_sdk::BytesN;

        let depositor = Address::generate(env);
        let beneficiary = Address::generate(env);
        let arbiter = Address::generate(env);
        let token = Address::generate(env);

        let escrow = Escrow {
            id: BytesN::<32>::from_array(env, &[1u8; 32]),
            depositor: depositor.clone(),
            beneficiary: beneficiary.clone(),
            arbiter: arbiter.clone(),
            amount: 1000,
            token,
            status: super::super::types::EscrowStatus::Funded,
            created_at: 0,
            dispute_reason: None,
        };

        (escrow, depositor, beneficiary, arbiter)
    }

    #[test]
    fn test_is_depositor() {
        let env = Env::default();
        let (escrow, depositor, _, _) = create_test_escrow(&env);
        assert!(AccessControl::is_depositor(&escrow, &depositor).is_ok());

        let other = Address::generate(&env);
        assert!(AccessControl::is_depositor(&escrow, &other).is_err());
    }

    #[test]
    fn test_is_party() {
        let env = Env::default();
        let (escrow, depositor, beneficiary, arbiter) = create_test_escrow(&env);

        assert!(AccessControl::is_party(&escrow, &depositor).is_ok());
        assert!(AccessControl::is_party(&escrow, &beneficiary).is_ok());
        assert!(AccessControl::is_party(&escrow, &arbiter).is_ok());

        let other = Address::generate(&env);
        assert!(AccessControl::is_party(&escrow, &other).is_err());
    }
}
