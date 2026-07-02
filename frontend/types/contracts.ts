export type ContractStage =
  | 'DRAFTED'
  | 'TENANT_SIGNED'
  | 'LANDLORD_SIGNED'
  | 'DEPOSIT_LOCKED';

export type ContractStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED';

export interface ContractParty {
  name: string;
  walletAddress: string;
  role: 'USER' | 'ADMIN';
}

export interface Contract {
  id: string;
  propertyName: string;
  propertyAddress: string;
  landlord: ContractParty;
  tenant: ContractParty;
  agent: ContractParty;
  rentAmount: string;
  securityDeposit: string;
  commissionRate: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  stage: ContractStage;
  stellarTxHash: string;
  createdAt: string;
  terms: string;
}

export type ContractFilterTab = 'ALL' | ContractStatus;

export const CONTRACT_STAGES: ContractStage[] = [
  'DRAFTED',
  'TENANT_SIGNED',
  'LANDLORD_SIGNED',
  'DEPOSIT_LOCKED',
];

export const STAGE_LABELS: Record<ContractStage, string> = {
  DRAFTED: 'Drafted',
  TENANT_SIGNED: 'Tenant Signed',
  LANDLORD_SIGNED: 'Landlord Signed',
  DEPOSIT_LOCKED: 'Security Deposit Locked',
};

export type ProposerRole = 'TENANT' | 'LANDLORD' | 'AGENT';

export interface NegotiationOffer {
  id: string;
  contractId: string;
  proposerRole: ProposerRole;
  rentAmount: string;
  startDate: string;
  endDate: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  createdAt: string;
}

export interface NegotiationMessage {
  id: string;
  offerId?: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}
