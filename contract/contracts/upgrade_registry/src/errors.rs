use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RegistryError {
    /// Contract has already been initialized.
    AlreadyInitialized = 1,
    /// Contract has not been initialized yet.
    NotInitialized = 2,
    /// Caller is not a registry admin.
    Unauthorized = 3,
    /// The named contract is not registered.
    ContractNotFound = 4,
    /// A proposal with this ID already exists.
    ProposalAlreadyExists = 5,
    /// The referenced proposal does not exist.
    ProposalNotFound = 6,
    /// The proposal has already been executed.
    ProposalAlreadyExecuted = 7,
    /// The caller has already approved this proposal.
    AlreadyApproved = 8,
    /// Not enough approvals to execute the proposal.
    InsufficientApprovals = 9,
    /// The target contracts list is empty.
    EmptyTargetList = 10,
    /// A contract with this name is already registered.
    ContractAlreadyRegistered = 11,
}

/// Pins every `RegistryError` discriminant so off-chain code that maps
/// error codes to messages cannot silently misreport after a variant is
/// added or reordered (#1686). If this test fails to compile or assert, a
/// discriminant changed and every off-chain consumer needs to be checked.
#[cfg(test)]
mod pin_tests {
    use super::RegistryError;

    #[test]
    fn error_codes_are_pinned() {
        assert_eq!(RegistryError::AlreadyInitialized as u32, 1);
        assert_eq!(RegistryError::NotInitialized as u32, 2);
        assert_eq!(RegistryError::Unauthorized as u32, 3);
        assert_eq!(RegistryError::ContractNotFound as u32, 4);
        assert_eq!(RegistryError::ProposalAlreadyExists as u32, 5);
        assert_eq!(RegistryError::ProposalNotFound as u32, 6);
        assert_eq!(RegistryError::ProposalAlreadyExecuted as u32, 7);
        assert_eq!(RegistryError::AlreadyApproved as u32, 8);
        assert_eq!(RegistryError::InsufficientApprovals as u32, 9);
        assert_eq!(RegistryError::EmptyTargetList as u32, 10);
        assert_eq!(RegistryError::ContractAlreadyRegistered as u32, 11);
    }
}
