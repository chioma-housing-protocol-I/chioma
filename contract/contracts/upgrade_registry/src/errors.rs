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
