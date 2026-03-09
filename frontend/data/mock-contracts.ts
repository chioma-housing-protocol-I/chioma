import type { Contract } from '@/types/contracts';

export const mockContracts: Contract[] = [
  {
    id: 'CTR-2024-001',
    propertyName: 'Sunrise Apartments - Unit 4B',
    propertyAddress: '12 Victoria Island Rd, Lagos, Nigeria',
    landlord: {
      name: 'Chief Emeka Okonkwo',
      walletAddress: 'GBXK...7F2D',
      role: 'LANDLORD',
    },
    tenant: {
      name: 'Adaeze Nwankwo',
      walletAddress: 'GCPD...9A1E',
      role: 'TENANT',
    },
    agent: {
      name: 'Sarah Jenks',
      walletAddress: 'GDQF...3B8C',
      role: 'AGENT',
    },
    rentAmount: '₦1,200,000',
    securityDeposit: '₦600,000',
    commissionRate: '10%',
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    status: 'ACTIVE',
    stage: 'DEPOSIT_LOCKED',
    stellarTxHash: 'a3f8c1...d94e72',
    createdAt: '2024-05-15',
    terms: `LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on this 1st day of June, 2024, by and between:

LANDLORD: Chief Emeka Okonkwo
TENANT: Adaeze Nwankwo
AGENT: Sarah Jenks (Chioma Platform Agent #8839)

PROPERTY: Sunrise Apartments - Unit 4B, 12 Victoria Island Rd, Lagos, Nigeria

1. TERM: The lease term shall commence on June 1, 2024 and terminate on May 31, 2025.

2. RENT: Tenant agrees to pay ₦1,200,000 per annum, payable via Stellar network in monthly installments of ₦100,000.

3. SECURITY DEPOSIT: A security deposit of ₦600,000 shall be held in escrow via Stellar multi-signature transaction. The deposit shall be released within 30 days of lease termination, subject to property inspection.

4. AGENT COMMISSION: The agent shall receive a commission of 10% of the annual rent, distributed automatically via smart contract upon successful lease execution.

5. MAINTENANCE: The landlord is responsible for structural repairs. The tenant is responsible for routine maintenance and keeping the premises in good condition.

6. GOVERNING LAW: This agreement is governed by the laws of the Federal Republic of Nigeria and enforced on-chain via the Stellar network.`,
  },
  {
    id: 'CTR-2024-002',
    propertyName: 'Ocean View Terrace - Suite 12',
    propertyAddress: '45 Admiralty Way, Lekki Phase 1, Lagos',
    landlord: {
      name: 'Mrs. Funke Adeyemi',
      walletAddress: 'GBHM...4E7A',
      role: 'LANDLORD',
    },
    tenant: {
      name: 'Chinedu Okoro',
      walletAddress: 'GCKL...2D9F',
      role: 'TENANT',
    },
    agent: {
      name: 'Sarah Jenks',
      walletAddress: 'GDQF...3B8C',
      role: 'AGENT',
    },
    rentAmount: '₦2,400,000',
    securityDeposit: '₦1,200,000',
    commissionRate: '8%',
    startDate: '2024-09-01',
    endDate: '2025-08-31',
    status: 'PENDING',
    stage: 'TENANT_SIGNED',
    stellarTxHash: 'b7e2d5...f18c93',
    createdAt: '2024-08-20',
    terms: `LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on this 1st day of September, 2024, by and between:

LANDLORD: Mrs. Funke Adeyemi
TENANT: Chinedu Okoro
AGENT: Sarah Jenks (Chioma Platform Agent #8839)

PROPERTY: Ocean View Terrace - Suite 12, 45 Admiralty Way, Lekki Phase 1, Lagos

1. TERM: The lease term shall commence on September 1, 2024 and terminate on August 31, 2025.

2. RENT: Tenant agrees to pay ₦2,400,000 per annum, payable via Stellar network in monthly installments of ₦200,000.

3. SECURITY DEPOSIT: A security deposit of ₦1,200,000 shall be held in escrow via Stellar multi-signature transaction.

4. AGENT COMMISSION: The agent shall receive a commission of 8% of the annual rent.

5. EARLY TERMINATION: Either party may terminate the lease with 90 days written notice, subject to a penalty of 3 months rent.`,
  },
  {
    id: 'CTR-2024-003',
    propertyName: 'Green Estate Villa - Block C',
    propertyAddress: '8 Green Estate, Amuwo Odofin, Lagos',
    landlord: {
      name: 'Dr. Ibrahim Musa',
      walletAddress: 'GBRF...6C3D',
      role: 'LANDLORD',
    },
    tenant: {
      name: 'Grace Obi',
      walletAddress: 'GCNX...8E5B',
      role: 'TENANT',
    },
    agent: {
      name: 'Sarah Jenks',
      walletAddress: 'GDQF...3B8C',
      role: 'AGENT',
    },
    rentAmount: '₦800,000',
    securityDeposit: '₦400,000',
    commissionRate: '10%',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'EXPIRED',
    stage: 'DEPOSIT_LOCKED',
    stellarTxHash: 'c9a4f8...e27b61',
    createdAt: '2023-12-10',
    terms: `LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on this 1st day of January, 2024, by and between:

LANDLORD: Dr. Ibrahim Musa
TENANT: Grace Obi
AGENT: Sarah Jenks (Chioma Platform Agent #8839)

PROPERTY: Green Estate Villa - Block C, 8 Green Estate, Amuwo Odofin, Lagos

1. TERM: The lease term shall commence on January 1, 2024 and terminate on December 31, 2024.

2. RENT: Tenant agrees to pay ₦800,000 per annum, payable via Stellar network.

3. SECURITY DEPOSIT: A security deposit of ₦400,000 shall be held in escrow.

4. AGENT COMMISSION: The agent shall receive a commission of 10% of the annual rent.`,
  },
  {
    id: 'CTR-2024-004',
    propertyName: 'Skyline Towers - Penthouse 2A',
    propertyAddress: '101 Ozumba Mbadiwe Ave, Victoria Island, Lagos',
    landlord: {
      name: 'Alhaji Sule Bello',
      walletAddress: 'GBWQ...1H4K',
      role: 'LANDLORD',
    },
    tenant: {
      name: 'Tunde Fashola',
      walletAddress: 'GCYT...7J2M',
      role: 'TENANT',
    },
    agent: {
      name: 'Sarah Jenks',
      walletAddress: 'GDQF...3B8C',
      role: 'AGENT',
    },
    rentAmount: '₦5,000,000',
    securityDeposit: '₦2,500,000',
    commissionRate: '7%',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'PENDING',
    stage: 'DRAFTED',
    stellarTxHash: '',
    createdAt: '2024-12-18',
    terms: `LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on this 1st day of January, 2025, by and between:

LANDLORD: Alhaji Sule Bello
TENANT: Tunde Fashola
AGENT: Sarah Jenks (Chioma Platform Agent #8839)

PROPERTY: Skyline Towers - Penthouse 2A, 101 Ozumba Mbadiwe Ave, Victoria Island, Lagos

1. TERM: The lease term shall commence on January 1, 2025 and terminate on December 31, 2025.

2. RENT: Tenant agrees to pay ₦5,000,000 per annum, payable via Stellar network in monthly installments of ₦416,667.

3. SECURITY DEPOSIT: A security deposit of ₦2,500,000 shall be held in escrow via Stellar multi-signature transaction.

4. AGENT COMMISSION: The agent shall receive a commission of 7% of the annual rent.

5. PREMIUM AMENITIES: Access to rooftop pool, gym, and 24/7 concierge service included.`,
  },
  {
    id: 'CTR-2024-005',
    propertyName: 'Palm Heights - Flat 3C',
    propertyAddress: '23 Adeola Odeku St, Victoria Island, Lagos',
    landlord: {
      name: 'Mrs. Ngozi Eze',
      walletAddress: 'GBDL...5N8P',
      role: 'LANDLORD',
    },
    tenant: {
      name: 'Yusuf Abdullahi',
      walletAddress: 'GCFS...9R3T',
      role: 'TENANT',
    },
    agent: {
      name: 'Sarah Jenks',
      walletAddress: 'GDQF...3B8C',
      role: 'AGENT',
    },
    rentAmount: '₦1,800,000',
    securityDeposit: '₦900,000',
    commissionRate: '10%',
    startDate: '2024-10-01',
    endDate: '2025-09-30',
    status: 'ACTIVE',
    stage: 'LANDLORD_SIGNED',
    stellarTxHash: 'e5b9c2...g41d86',
    createdAt: '2024-09-12',
    terms: `LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on this 1st day of October, 2024, by and between:

LANDLORD: Mrs. Ngozi Eze
TENANT: Yusuf Abdullahi
AGENT: Sarah Jenks (Chioma Platform Agent #8839)

PROPERTY: Palm Heights - Flat 3C, 23 Adeola Odeku St, Victoria Island, Lagos

1. TERM: The lease term shall commence on October 1, 2024 and terminate on September 30, 2025.

2. RENT: Tenant agrees to pay ₦1,800,000 per annum, payable via Stellar network in monthly installments of ₦150,000.

3. SECURITY DEPOSIT: A security deposit of ₦900,000 shall be held in escrow via Stellar multi-signature transaction.

4. AGENT COMMISSION: The agent shall receive a commission of 10% of the annual rent.

5. PETS: No pets allowed without prior written consent of the landlord.`,
  },
];
