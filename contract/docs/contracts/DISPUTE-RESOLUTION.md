# Dispute Resolution Contract

This document provides comprehensive documentation for the Dispute Resolution contract, including its purpose, API, storage structure, events, and dispute handling procedures.

---

## 1. Contract Overview

### 1.1 Purpose

The Dispute Resolution contract manages conflict resolution between rental parties on the Chioma platform. It enables:

- creation and tracking of disputes
- voting-based resolution mechanisms
- evidence submission and review
- resolution enforcement
- appeal procedures
- dispute history and audit trails

### 1.2 Key Features

- **Multi-party disputes**: Support disputes between landlords, tenants, and arbitrators
- **Evidence management**: Store and verify evidence submissions
- **Voting mechanism**: Democratic resolution through weighted voting
- **Time-bound resolution**: Automatic escalation if unresolved
- **Appeal process**: Allow parties to appeal unfavorable decisions
- **Audit trail**: Complete history of all dispute actions
- **Integration**: Connect with escrow and payment contracts

### 1.3 Dispute Workflow

```
1. Dispute Creation
   ↓
2. Evidence Submission (7 days)
   ↓
3. Voting Period (7 days)
   ↓
4. Resolution
   ├─ Unanimous: Immediate execution
   ├─ Majority: Enforce after appeal period
   └─ Deadlock: Escalate to arbitration
   ↓
5. Appeal Period (3 days)
   ↓
6. Final Resolution
```

---

## 2. Public Functions

### 2.1 Dispute Creation

**Function:** `create_dispute`

**Purpose:** Initiate a new dispute

**Parameters:**

```rust
pub fn create_dispute(
    env: &Env,
    agreement_id: String,
    initiator: Address,
    respondent: Address,
    dispute_type: DisputeType,
    description: String,
    amount_stroops: i128,
) -> Result<String, ContractError>
```

**Parameters Details:**

| Parameter        | Type        | Description                       |
| ---------------- | ----------- | --------------------------------- |
| `agreement_id`   | String      | Reference to rental agreement     |
| `initiator`      | Address     | Party initiating dispute          |
| `respondent`     | Address     | Party being disputed against      |
| `dispute_type`   | DisputeType | Type of dispute (see section 2.7) |
| `description`    | String      | Detailed description of dispute   |
| `amount_stroops` | i128        | Amount in dispute (in stroops)    |

**Returns:** Dispute ID (String)

**Errors:**

- `InvalidAgreement`: Agreement not found or invalid
- `InvalidParty`: Initiator or respondent not valid parties
- `DuplicateDispute`: Active dispute already exists for this agreement
- `InvalidAmount`: Amount is zero or negative

**Example:**

```rust
let dispute_id = contract.create_dispute(
    &env,
    "agr_01HN7K3P2X".to_string(),
    initiator_address,
    respondent_address,
    DisputeType::DamagesClaim,
    "Property damage during tenancy".to_string(),
    50000000, // 5 XLM in stroops
)?;
```

### 2.2 Submit Evidence

**Function:** `submit_evidence`

**Purpose:** Submit evidence for dispute resolution

**Parameters:**

```rust
pub fn submit_evidence(
    env: &Env,
    dispute_id: String,
    submitter: Address,
    evidence_type: EvidenceType,
    content_hash: String,
    description: String,
) -> Result<(), ContractError>
```

**Parameters Details:**

| Parameter       | Type         | Description                        |
| --------------- | ------------ | ---------------------------------- |
| `dispute_id`    | String       | ID of dispute                      |
| `submitter`     | Address      | Party submitting evidence          |
| `evidence_type` | EvidenceType | Type of evidence (see section 2.8) |
| `content_hash`  | String       | IPFS hash of evidence content      |
| `description`   | String       | Description of evidence            |

**Returns:** Unit (success)

**Errors:**

- `DisputeNotFound`: Dispute doesn't exist
- `InvalidParty`: Submitter not a party to dispute
- `EvidencePeriodClosed`: Evidence submission period ended
- `DuplicateEvidence`: Same evidence already submitted
- `InvalidHash`: Content hash format invalid

**Example:**

```rust
contract.submit_evidence(
    &env,
    "disp_01HN7K3P2X".to_string(),
    initiator_address,
    EvidenceType::Photo,
    "QmXxxx...".to_string(),
    "Damage photos from move-out inspection".to_string(),
)?;
```

### 2.3 Cast Vote

**Function:** `cast_vote`

**Purpose:** Vote on dispute resolution

**Parameters:**

```rust
pub fn cast_vote(
    env: &Env,
    dispute_id: String,
    voter: Address,
    vote: VoteOption,
    reasoning: String,
) -> Result<(), ContractError>
```

**Parameters Details:**

| Parameter    | Type       | Description                           |
| ------------ | ---------- | ------------------------------------- |
| `dispute_id` | String     | ID of dispute                         |
| `voter`      | Address    | Address of voter (must be arbitrator) |
| `vote`       | VoteOption | Vote choice (Favor, Against, Abstain) |
| `reasoning`  | String     | Explanation for vote                  |

**Returns:** Unit (success)

**Errors:**

- `DisputeNotFound`: Dispute doesn't exist
- `NotArbitrator`: Voter is not registered arbitrator
- `VotingPeriodClosed`: Voting period has ended
- `AlreadyVoted`: Voter has already voted
- `InvalidVote`: Vote option invalid

**Example:**

```rust
contract.cast_vote(
    &env,
    "disp_01HN7K3P2X".to_string(),
    arbitrator_address,
    VoteOption::Favor,
    "Evidence clearly shows damage caused by tenant".to_string(),
)?;
```

### 2.4 Finalize Resolution

**Function:** `finalize_resolution`

**Purpose:** Finalize dispute resolution after voting

**Parameters:**

```rust
pub fn finalize_resolution(
    env: &Env,
    dispute_id: String,
) -> Result<DisputeResolution, ContractError>
```

**Parameters Details:**

| Parameter    | Type   | Description               |
| ------------ | ------ | ------------------------- |
| `dispute_id` | String | ID of dispute to finalize |

**Returns:** DisputeResolution struct with outcome

**Errors:**

- `DisputeNotFound`: Dispute doesn't exist
- `VotingPeriodNotClosed`: Voting period still active
- `AlreadyFinalized`: Dispute already finalized
- `InsufficientVotes`: Not enough votes to finalize

**Example:**

```rust
let resolution = contract.finalize_resolution(
    &env,
    "disp_01HN7K3P2X".to_string(),
)?;

println!("Resolution: {:?}", resolution.outcome);
```

### 2.5 Appeal Resolution

**Function:** `appeal_resolution`

**Purpose:** Appeal a dispute resolution

**Parameters:**

```rust
pub fn appeal_resolution(
    env: &Env,
    dispute_id: String,
    appellant: Address,
    grounds: String,
) -> Result<String, ContractError>
```

**Parameters Details:**

| Parameter    | Type    | Description                |
| ------------ | ------- | -------------------------- |
| `dispute_id` | String  | ID of dispute to appeal    |
| `appellant`  | Address | Party appealing resolution |
| `grounds`    | String  | Grounds for appeal         |

**Returns:** Appeal ID (String)

**Errors:**

- `DisputeNotFound`: Dispute doesn't exist
- `NotFinalized`: Dispute not yet finalized
- `AppealPeriodClosed`: Appeal period has ended
- `InvalidAppellant`: Appellant not a party to dispute
- `AlreadyAppealed`: Dispute already appealed

**Example:**

```rust
let appeal_id = contract.appeal_resolution(
    &env,
    "disp_01HN7K3P2X".to_string(),
    respondent_address,
    "New evidence discovered after voting".to_string(),
)?;
```

### 2.6 Get Dispute Details

**Function:** `get_dispute`

**Purpose:** Retrieve dispute information

**Parameters:**

```rust
pub fn get_dispute(
    env: &Env,
    dispute_id: String,
) -> Result<DisputeDetails, ContractError>
```

**Parameters Details:**

| Parameter    | Type   | Description   |
| ------------ | ------ | ------------- |
| `dispute_id` | String | ID of dispute |

**Returns:** DisputeDetails struct

**Errors:**

- `DisputeNotFound`: Dispute doesn't exist

**Example:**

```rust
let dispute = contract.get_dispute(
    &env,
    "disp_01HN7K3P2X".to_string(),
)?;

println!("Status: {:?}", dispute.status);
println!("Amount: {}", dispute.amount_stroops);
```

---

## 3. Storage Structure

### 3.1 Dispute Storage Key

**Key Format:** `dispute:{dispute_id}`

**Value Type:** DisputeData

```rust
pub struct DisputeData {
    pub id: String,
    pub agreement_id: String,
    pub initiator: Address,
    pub respondent: Address,
    pub dispute_type: DisputeType,
    pub description: String,
    pub amount_stroops: i128,
    pub status: DisputeStatus,
    pub created_at: u64,
    pub evidence_deadline: u64,
    pub voting_deadline: u64,
    pub appeal_deadline: u64,
    pub resolution: Option<DisputeResolution>,
}
```

### 3.2 Evidence Storage Key

**Key Format:** `evidence:{dispute_id}:{evidence_id}`

**Value Type:** EvidenceData

```rust
pub struct EvidenceData {
    pub id: String,
    pub dispute_id: String,
    pub submitter: Address,
    pub evidence_type: EvidenceType,
    pub content_hash: String,
    pub description: String,
    pub submitted_at: u64,
}
```

### 3.3 Vote Storage Key

**Key Format:** `vote:{dispute_id}:{voter_address}`

**Value Type:** VoteData

```rust
pub struct VoteData {
    pub dispute_id: String,
    pub voter: Address,
    pub vote: VoteOption,
    pub reasoning: String,
    pub voted_at: u64,
}
```

### 3.4 Dispute Index

**Key Format:** `disputes:by_agreement:{agreement_id}`

**Value Type:** Vec<String> (list of dispute IDs)

Maintains index of disputes by agreement for efficient lookup.

### 3.5 Arbitrator Registry

**Key Format:** `arbitrators:{arbitrator_address}`

**Value Type:** ArbitratorData

```rust
pub struct ArbitratorData {
    pub address: Address,
    pub registered_at: u64,
    pub active: bool,
    pub disputes_resolved: u32,
    pub reputation_score: u32,
}
```

---

## 4. Events

### 4.1 DisputeCreated

**Event:** `DisputeCreated`

**Emitted when:** New dispute is created

**Data:**

```rust
pub struct DisputeCreatedEvent {
    pub dispute_id: String,
    pub agreement_id: String,
    pub initiator: Address,
    pub respondent: Address,
    pub dispute_type: DisputeType,
    pub amount_stroops: i128,
    pub created_at: u64,
}
```

**Example:**

```
DisputeCreated {
    dispute_id: "disp_01HN7K3P2X",
    agreement_id: "agr_01HN7K3P2X",
    initiator: "GXXXXXX...",
    respondent: "GYYYYYY...",
    dispute_type: DamagesClaim,
    amount_stroops: 50000000,
    created_at: 1704067200,
}
```

### 4.2 EvidenceSubmitted

**Event:** `EvidenceSubmitted`

**Emitted when:** Evidence is submitted

**Data:**

```rust
pub struct EvidenceSubmittedEvent {
    pub dispute_id: String,
    pub evidence_id: String,
    pub submitter: Address,
    pub evidence_type: EvidenceType,
    pub submitted_at: u64,
}
```

### 4.3 VoteCast

**Event:** `VoteCast`

**Emitted when:** Vote is cast

**Data:**

```rust
pub struct VoteCastEvent {
    pub dispute_id: String,
    pub voter: Address,
    pub vote: VoteOption,
    pub voted_at: u64,
}
```

### 4.4 ResolutionFinalized

**Event:** `ResolutionFinalized`

**Emitted when:** Dispute resolution is finalized

**Data:**

```rust
pub struct ResolutionFinalizedEvent {
    pub dispute_id: String,
    pub outcome: ResolutionOutcome,
    pub favor_votes: u32,
    pub against_votes: u32,
    pub finalized_at: u64,
}
```

### 4.5 ResolutionAppealed

**Event:** `ResolutionAppealed`

**Emitted when:** Resolution is appealed

**Data:**

```rust
pub struct ResolutionAppealedEvent {
    pub dispute_id: String,
    pub appeal_id: String,
    pub appellant: Address,
    pub appealed_at: u64,
}
```

---

## 5. Error Codes

| Error Code | Name                  | Description                          |
| ---------- | --------------------- | ------------------------------------ |
| 1001       | InvalidAgreement      | Agreement not found or invalid       |
| 1002       | InvalidParty          | Party address not valid              |
| 1003       | DuplicateDispute      | Active dispute already exists        |
| 1004       | InvalidAmount         | Amount is zero or negative           |
| 1005       | DisputeNotFound       | Dispute doesn't exist                |
| 1006       | EvidencePeriodClosed  | Evidence submission period ended     |
| 1007       | DuplicateEvidence     | Evidence already submitted           |
| 1008       | InvalidHash           | Content hash format invalid          |
| 1009       | VotingPeriodClosed    | Voting period has ended              |
| 1010       | NotArbitrator         | Address is not registered arbitrator |
| 1011       | AlreadyVoted          | Voter has already voted              |
| 1012       | InvalidVote           | Vote option invalid                  |
| 1013       | VotingPeriodNotClosed | Voting period still active           |
| 1014       | AlreadyFinalized      | Dispute already finalized            |
| 1015       | InsufficientVotes     | Not enough votes to finalize         |
| 1016       | NotFinalized          | Dispute not yet finalized            |
| 1017       | AppealPeriodClosed    | Appeal period has ended              |
| 1018       | InvalidAppellant      | Appellant not a party to dispute     |
| 1019       | AlreadyAppealed       | Dispute already appealed             |

---

## 6. Dispute Workflow

### 6.1 Dispute Creation Phase

**Duration:** Immediate

**Steps:**

1. Initiator calls `create_dispute` with dispute details
2. Contract validates agreement and parties
3. Dispute created with status `OPEN`
4. Evidence submission period starts (7 days)
5. `DisputeCreated` event emitted

**Validation:**

- Agreement must exist and be active
- Initiator and respondent must be valid parties
- No active dispute for same agreement
- Amount must be positive

### 6.2 Evidence Submission Phase

**Duration:** 7 days from dispute creation

**Steps:**

1. Both parties submit evidence via `submit_evidence`
2. Evidence stored with IPFS hash reference
3. `EvidenceSubmitted` event emitted for each submission
4. Phase ends automatically after 7 days

**Validation:**

- Only parties to dispute can submit evidence
- Evidence must have valid IPFS hash
- No duplicate evidence
- Submission within deadline

**Evidence Types:**

- `Photo`: Photographic evidence
- `Video`: Video evidence
- `Document`: Written documentation
- `Receipt`: Financial receipts
- `Communication`: Email/message records
- `Inspection`: Professional inspection reports
- `Other`: Other evidence types

### 6.3 Voting Phase

**Duration:** 7 days after evidence period closes

**Steps:**

1. Arbitrators review evidence
2. Each arbitrator calls `cast_vote` with their decision
3. `VoteCast` event emitted for each vote
4. Voting period ends after 7 days
5. `finalize_resolution` called to tally votes

**Voting Rules:**

- Only registered arbitrators can vote
- Each arbitrator votes once
- Votes are weighted equally
- Majority vote determines outcome
- Abstentions don't count toward majority

**Vote Options:**

- `Favor`: Favor initiator's claim
- `Against`: Favor respondent's position
- `Abstain`: No position on dispute

### 6.4 Resolution Phase

**Duration:** Immediate after voting closes

**Steps:**

1. `finalize_resolution` called to tally votes
2. Outcome determined by vote count
3. `ResolutionFinalized` event emitted
4. Appeal period starts (3 days)

**Resolution Outcomes:**

- **Unanimous**: All votes same direction
- **Majority**: >50% votes in one direction
- **Deadlock**: Exactly 50% split (escalate to arbitration)

### 6.5 Appeal Phase

**Duration:** 3 days after resolution

**Steps:**

1. Losing party can call `appeal_resolution`
2. Appeal must include grounds for appeal
3. `ResolutionAppealed` event emitted
4. Appeal period ends after 3 days
5. Final resolution becomes binding

**Appeal Grounds:**

- New evidence discovered
- Procedural error in voting
- Arbitrator conflict of interest
- Disproportionate outcome

---

## 7. Resolution Process

### 7.1 Voting Mechanism

**Arbitrator Selection:**

- Arbitrators registered in contract
- Selected based on reputation and availability
- Minimum 3 arbitrators per dispute
- Maximum 7 arbitrators per dispute

**Vote Counting:**

```
Total Votes = Favor + Against + Abstain

Favor Percentage = Favor / (Favor + Against)

If Favor Percentage > 50%:
    Outcome = FAVOR_INITIATOR
Else If Favor Percentage < 50%:
    Outcome = FAVOR_RESPONDENT
Else:
    Outcome = DEADLOCK
```

**Execution:**

- Unanimous: Immediate execution
- Majority: Execute after appeal period
- Deadlock: Escalate to senior arbitration

### 7.2 Enforcement

**Payment Execution:**

```rust
pub fn execute_resolution(
    env: &Env,
    dispute_id: String,
) -> Result<(), ContractError>
```

Transfers funds from escrow based on resolution:

- If favor initiator: Transfer amount to initiator
- If favor respondent: Return amount to respondent
- If deadlock: Hold in escrow pending arbitration

### 7.3 Appeal Process

**Appeal Submission:**

```rust
pub fn appeal_resolution(
    env: &Env,
    dispute_id: String,
    appellant: Address,
    grounds: String,
) -> Result<String, ContractError>
```

**Appeal Review:**

- Senior arbitrators review appeal
- New vote conducted if grounds valid
- Original resolution stands if appeal denied

---

## 8. Usage Examples

### 8.1 Complete Dispute Flow

```rust
use soroban_sdk::{Env, Address};

// 1. Create dispute
let dispute_id = contract.create_dispute(
    &env,
    "agr_01HN7K3P2X".to_string(),
    initiator,
    respondent,
    DisputeType::DamagesClaim,
    "Carpet damage during tenancy".to_string(),
    100000000, // 10 XLM
)?;

// 2. Submit evidence (initiator)
contract.submit_evidence(
    &env,
    dispute_id.clone(),
    initiator,
    EvidenceType::Photo,
    "QmXxxx...".to_string(),
    "Damage photos".to_string(),
)?;

// 3. Submit evidence (respondent)
contract.submit_evidence(
    &env,
    dispute_id.clone(),
    respondent,
    EvidenceType::Document,
    "QmYyyy...".to_string(),
    "Lease agreement showing normal wear".to_string(),
)?;

// 4. Wait for evidence period to close (7 days)

// 5. Arbitrators vote
contract.cast_vote(
    &env,
    dispute_id.clone(),
    arbitrator1,
    VoteOption::Favor,
    "Evidence shows damage beyond normal wear".to_string(),
)?;

contract.cast_vote(
    &env,
    dispute_id.clone(),
    arbitrator2,
    VoteOption::Favor,
    "Damage appears intentional".to_string(),
)?;

contract.cast_vote(
    &env,
    dispute_id.clone(),
    arbitrator3,
    VoteOption::Against,
    "Could be normal wear".to_string(),
)?;

// 6. Finalize resolution
let resolution = contract.finalize_resolution(
    &env,
    dispute_id.clone(),
)?;

println!("Outcome: {:?}", resolution.outcome); // FAVOR_INITIATOR

// 7. Wait for appeal period (3 days)

// 8. Execute resolution
contract.execute_resolution(&env, dispute_id)?;
```

### 8.2 Evidence Submission

```rust
// Submit multiple evidence types
let evidence_types = vec![
    (EvidenceType::Photo, "QmPhoto1..."),
    (EvidenceType::Photo, "QmPhoto2..."),
    (EvidenceType::Video, "QmVideo1..."),
    (EvidenceType::Document, "QmDoc1..."),
];

for (evidence_type, hash) in evidence_types {
    contract.submit_evidence(
        &env,
        dispute_id.clone(),
        submitter,
        evidence_type,
        hash.to_string(),
        "Supporting evidence".to_string(),
    )?;
}
```

### 8.3 Appeal Process

```rust
// Get original resolution
let resolution = contract.get_dispute(&env, dispute_id.clone())?;

// Appeal if unfavorable
if resolution.resolution.unwrap().outcome == ResolutionOutcome::FavorRespondent {
    let appeal_id = contract.appeal_resolution(
        &env,
        dispute_id.clone(),
        initiator,
        "New evidence discovered after voting".to_string(),
    )?;

    println!("Appeal submitted: {}", appeal_id);
}
```

---

## 9. Integration

### 9.1 Integration with Escrow Contract

The Dispute Resolution contract integrates with the Escrow contract:

```rust
// When dispute created, escrow holds funds
escrow.hold_for_dispute(&env, agreement_id, dispute_id)?;

// When resolution finalized, escrow executes transfer
escrow.execute_dispute_resolution(&env, dispute_id, resolution)?;
```

### 9.2 Integration with Agreement Contract

Disputes reference rental agreements:

```rust
// Validate agreement exists
let agreement = agreement_contract.get_agreement(&env, agreement_id)?;

// Verify parties match
assert_eq!(agreement.landlord, initiator);
assert_eq!(agreement.tenant, respondent);
```

### 9.3 Integration with Payment Contract

Dispute resolution may trigger payments:

```rust
// Execute payment based on resolution
payment_contract.transfer(
    &env,
    resolution.recipient,
    resolution.amount_stroops,
    "Dispute resolution payment".to_string(),
)?;
```

---

## 10. Best Practices

### 10.1 For Dispute Initiators

1. **Document everything**: Collect evidence immediately
2. **Be specific**: Provide detailed descriptions
3. **Use multiple evidence types**: Photos, videos, documents
4. **Submit early**: Don't wait until deadline
5. **Be professional**: Avoid emotional language

### 10.2 For Arbitrators

1. **Review all evidence**: Don't skip any submissions
2. **Be impartial**: Avoid conflicts of interest
3. **Document reasoning**: Explain your vote
4. **Vote promptly**: Don't delay voting
5. **Maintain confidentiality**: Don't discuss votes

### 10.3 For Contract Operators

1. **Monitor disputes**: Track active disputes
2. **Enforce deadlines**: Ensure timely progression
3. **Maintain arbitrator pool**: Keep sufficient arbitrators
4. **Review outcomes**: Analyze resolution patterns
5. **Update procedures**: Improve based on experience

---

## 11. References

- [Escrow Contract Documentation](./ESCROW.md)
- [Payment Contract Documentation](./PAYMENT.md)
- [Agreement Contract Documentation](./AGENT-REGISTRY.md)
- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Documentation](https://soroban.stellar.org/)
