/**
 * Mock API Layer - Intercepts API calls and returns demo data
 * Enable by setting NEXT_PUBLIC_USE_MOCK_API=true in .env.local
 */

// Demo data for various endpoints
const mockData: Record<string, unknown> = {
  // Tenant Disputes
  '/disputes': {
    data: [
      {
        id: 'dis-001',
        disputeId: 'DSP-2026-001',
        agreementReference: 'AGR-2025-014',
        propertyName: 'Sunset Apartments, Unit 4B',
        disputeType: 'MAINTENANCE',
        description: 'Water damage repairs delayed for 12 days.',
        status: 'UNDER_REVIEW',
        requestedAmount: 40000,
        evidenceCount: 3,
        commentCount: 4,
        createdAt: '2026-02-18T10:00:00.000Z',
        updatedAt: '2026-03-06T13:20:00.000Z',
      },
      {
        id: 'dis-002',
        disputeId: 'DSP-2025-019',
        agreementReference: 'AGR-2025-014',
        propertyName: 'Sunset Apartments, Unit 4B',
        disputeType: 'SECURITY_DEPOSIT',
        description: 'Security deposit deduction dispute.',
        status: 'RESOLVED',
        requestedAmount: 60000,
        evidenceCount: 2,
        commentCount: 6,
        createdAt: '2025-12-20T16:00:00.000Z',
        updatedAt: '2026-01-04T12:10:00.000Z',
      },
    ],
  },

  // Tenant Reviews
  '/reviews': {
    data: [
      {
        id: 'rev-001',
        reviewId: 'RVW-2026-001',
        target: 'James Adebayo',
        targetRole: 'USER',
        propertyName: 'Sunset Apartments, Unit 4B',
        rating: 5,
        comment:
          'Great landlord! Quick communication and repairs handled promptly.',
        status: 'PUBLISHED',
        context: 'LEASE',
        responseCount: 1,
        createdAt: '2026-02-20T12:30:00Z',
        updatedAt: '2026-02-20T12:30:00Z',
      },
      {
        id: 'rev-002',
        reviewId: 'RVW-2026-002',
        target: 'Facility Ops Team',
        targetRole: 'ADMIN',
        propertyName: 'Sunset Apartments, Unit 4B',
        rating: 4,
        comment: 'Maintenance response good after escalation.',
        status: 'PUBLISHED',
        context: 'MAINTENANCE',
        responseCount: 0,
        createdAt: '2026-01-10T09:00:00Z',
        updatedAt: '2026-01-10T09:00:00Z',
      },
    ],
  },

  // Landlord Documents
  '/documents': {
    data: [
      {
        id: 'doc-001',
        name: 'Lease Agreement - Unit 4B',
        type: 'LEASE',
        status: 'ACTIVE',
        propertyName: 'Sunset Apartments, Unit 4B',
        propertyId: 'prop-001',
        tenantName: 'Chioma Okafor',
        tenantId: 'tenant-001',
        fileSize: 2458000,
        fileType: 'application/pdf',
        url: '/documents/lease-unit-4b.pdf',
        uploadedAt: '2026-01-15T10:00:00.000Z',
        expiresAt: '2027-01-15T10:00:00.000Z',
        description: 'Annual lease agreement for Unit 4B',
      },
      {
        id: 'doc-002',
        name: 'Move-in Inspection Report',
        type: 'INSPECTION',
        status: 'ACTIVE',
        propertyName: 'Sunset Apartments, Unit 4B',
        propertyId: 'prop-001',
        tenantName: 'Chioma Okafor',
        tenantId: 'tenant-001',
        fileSize: 1850000,
        fileType: 'application/pdf',
        url: '/documents/inspection-unit-4b.pdf',
        uploadedAt: '2026-01-15T11:00:00.000Z',
        description: 'Property condition report at move-in',
      },
    ],
  },

  // Landlord Maintenance
  '/maintenance': {
    data: [
      {
        id: 'mnt-001',
        requestId: 'MNT-2026-001',
        propertyName: 'Sunset Apartments, Unit 4B',
        propertyId: 'prop-001',
        tenantName: 'Chioma Okafor',
        tenantId: 'tenant-001',
        title: 'Water leak in bathroom',
        description:
          'Water is leaking from the ceiling in the bathroom. Started 2 days ago.',
        status: 'OPEN',
        priority: 'HIGH',
        assignedTo: {
          id: 'maint-001',
          name: 'Emeka Plumbing Services',
          phone: '+234 801 234 5678',
        },
        createdAt: '2026-03-25T10:00:00.000Z',
        updatedAt: '2026-03-25T10:00:00.000Z',
        deadline: '2026-03-28T18:00:00.000Z',
        commentCount: 3,
        photoCount: 2,
      },
      {
        id: 'mnt-002',
        requestId: 'MNT-2026-002',
        propertyName: 'Sunset Apartments, Unit 2A',
        propertyId: 'prop-001',
        tenantName: 'Adebayo Mensah',
        tenantId: 'tenant-002',
        title: 'Air conditioning not working',
        description:
          'AC unit stopped cooling yesterday. Makes strange noise when turned on.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assignedTo: {
          id: 'maint-002',
          name: 'Cool Air HVAC',
          phone: '+234 802 345 6789',
        },
        createdAt: '2026-03-20T14:30:00.000Z',
        updatedAt: '2026-03-22T09:15:00.000Z',
        deadline: '2026-03-25T18:00:00.000Z',
        commentCount: 5,
        photoCount: 1,
      },
    ],
  },

  // Messaging Rooms
  '/messaging/rooms': {
    data: [
      {
        id: 'room-001',
        name: 'Chioma Okafor',
        lastMessage: 'The lease agreement looks good.',
        unreadCount: 2,
        updatedAt: '2026-03-31T14:20:00Z',
      },
      {
        id: 'room-002',
        name: 'James Adebayo',
        lastMessage: 'When can I expect the maintenance team?',
        unreadCount: 0,
        updatedAt: '2026-03-30T10:15:00Z',
      },
    ],
  },
};

// Pattern matching for dynamic routes
const dynamicPatterns: Array<{
  pattern: RegExp;
  handler: (match: RegExpMatchArray) => unknown;
}> = [
  {
    pattern: /^\/disputes\/(.+)$/,
    handler: (match) => ({
      data: {
        id: match[1],
        disputeId: 'DSP-2026-001',
        agreementId: 'AGR-2025-014',
        propertyName: 'Sunset Apartments, Unit 4B',
        raisedBy: { name: 'You', role: 'tenant' },
        against: { name: 'James Adebayo', role: 'landlord' },
        disputeType: 'MAINTENANCE',
        description:
          'Water damage repairs were delayed for 12 days after reporting.',
        status: 'UNDER_REVIEW',
        requestedAmount: 40000,
        createdAt: '2026-02-18T10:00:00.000Z',
        updatedAt: '2026-03-06T13:20:00.000Z',
        evidence: [
          {
            id: 'ev-1',
            filename: 'water_damage_1.jpg',
            uploadedAt: '2026-02-18T10:05:00Z',
          },
        ],
        comments: [
          {
            id: 'c-1',
            author: { name: 'You', role: 'tenant' },
            content: 'Initial report submitted. Awaiting response.',
            createdAt: '2026-02-18T10:10:00Z',
          },
        ],
      },
    }),
  },
  {
    pattern: /^\/maintenance\/(.+)$/,
    handler: (match) => ({
      data: {
        id: match[1],
        requestId: 'MNT-2026-001',
        propertyName: 'Sunset Apartments, Unit 4B',
        propertyId: 'prop-001',
        tenant: {
          id: 'tenant-001',
          name: 'Chioma Okafor',
          email: 'chioma.okafor@email.com',
          phone: '+234 805 123 4567',
        },
        title: 'Water leak in bathroom',
        description: 'Water is leaking from the ceiling in the bathroom.',
        status: 'OPEN',
        priority: 'HIGH',
        assignedTo: {
          id: 'maint-001',
          name: 'Emeka Plumbing Services',
          phone: '+234 801 234 5678',
          email: 'emeka.plumbing@email.com',
        },
        createdAt: '2026-03-25T10:00:00.000Z',
        updatedAt: '2026-03-25T10:00:00.000Z',
        deadline: '2026-03-28T18:00:00.000Z',
        photos: [
          {
            id: 'photo-1',
            filename: 'bathroom_leak_1.jpg',
            url: '/uploads/maintenance/bathroom_leak_1.jpg',
            uploadedAt: '2026-03-25T10:05:00Z',
          },
        ],
        comments: [
          {
            id: 'c-1',
            author: { id: 'tenant-001', name: 'Chioma Okafor', role: 'tenant' },
            content:
              "The leak started yesterday evening. It's getting worse today.",
            createdAt: '2026-03-25T10:10:00Z',
          },
        ],
      },
    }),
  },
  {
    pattern: /^\/payments\/(.+)\/receipt$/,
    handler: (match) => ({
      fileName: `deposit-receipt-${match[1]}.json`,
      receipt: {
        paymentId: match[1],
        amount: 2500,
        currency: 'USDC',
        status: 'completed',
        timestamp: new Date().toISOString(),
        verified: true,
      },
    }),
  },
  {
    pattern: /^\/payments\/(.+)\/refund$/,
    handler: (match) => ({
      id: match[1],
      amount: 2500,
      currency: 'USDC',
      status: 'refunded',
      createdAt: '2025-04-28T12:00:00Z',
    }),
  },
  {
    pattern: /^\/payments\/(.+)$/,
    handler: (match) => ({
      id: match[1],
      amount: 2500,
      currency: 'USDC',
      status: 'completed',
      paymentMethod: 'crypto',
      dueDate: '2025-04-28',
      createdAt: '2025-04-28T12:00:00Z',
      metadata: {
        flow: 'deposit',
        type: 'security_deposit',
        description: 'Security Deposit for Adeola Odeku St',
        deductions: [
          { id: 'd-1', label: 'Cleaning Fee', amount: 150 },
          { id: 'd-2', label: 'Minor Repairs', amount: 250 },
        ],
      },
    }),
  },
  {
    pattern: /^\/payments$/,
    handler: (match) => ({
      data: [
        {
          id: 'escrow-security-adeola',
          amount: 2500,
          currency: 'USDC',
          status: 'completed',
          paymentMethod: 'crypto',
          dueDate: '2025-04-28',
          createdAt: '2025-04-28T12:00:00Z',
          metadata: {
            flow: 'deposit',
            type: 'security_deposit',
            description: 'Security Deposit for Adeola Odeku St',
            deductions: [
              { id: 'd-1', label: 'Cleaning Fee', amount: 150 },
              { id: 'd-2', label: 'Minor Repairs', amount: 250 },
            ],
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    }),
  },
  // ─── Rent Payment Schedule ─────────────────────────────────────────────────
  {
    pattern: /^\/rent\/agreements\/([^/]+)\/schedule$/,
    handler: (match) => [
      {
        paymentNumber: 1,
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        amount: 2500,
        agreementId: match[1],
      },
      {
        paymentNumber: 2,
        dueDate: new Date(Date.now() + 60 * 86400000).toISOString(),
        amount: 2500,
        agreementId: match[1],
      },
      {
        paymentNumber: 3,
        dueDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        amount: 2500,
        agreementId: match[1],
      },
    ],
  },
  // ─── Rent Payment History ──────────────────────────────────────────────────
  {
    pattern: /^\/rent\/agreements\/([^/]+)\/history$/,
    handler: (match) => [
      {
        id: 'pay-hist-001',
        agreementId: match[1],
        amount: 2500,
        currency: 'USDC',
        status: 'completed',
        paymentMethod: 'card',
        dueDate: new Date(Date.now() - 30 * 86400000).toISOString(),
        paidAt: new Date(Date.now() - 28 * 86400000).toISOString(),
        referenceNumber: 'REF-001',
        createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
      },
      {
        id: 'pay-hist-002',
        agreementId: match[1],
        amount: 2500,
        currency: 'USDC',
        status: 'completed',
        paymentMethod: 'bank_transfer',
        dueDate: new Date(Date.now() - 60 * 86400000).toISOString(),
        paidAt: new Date(Date.now() - 58 * 86400000).toISOString(),
        referenceNumber: 'REF-002',
        createdAt: new Date(Date.now() - 58 * 86400000).toISOString(),
      },
    ],
  },
  // ─── Late Fee Calculation ──────────────────────────────────────────────────
  {
    pattern: /^\/rent\/calculate\/late-fee$/,
    handler: () => ({ lateFee: 125 }),
  },
  // ─── Payment Schedules ─────────────────────────────────────────────────────
  {
    pattern: /^\/payments\/schedules$/,
    handler: () => [
      {
        id: 'sched-001',
        userId: 'user_1',
        agreementId: 'agreement_1',
        paymentMethod: null,
        paymentMethodId: 1,
        amount: 2500,
        currency: 'USDC',
        interval: 'monthly',
        nextRunAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'active',
        retries: 0,
        maxRetries: 3,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  // ─── Payment Schedule Detail ───────────────────────────────────────────────
  {
    pattern: /^\/payments\/schedules\/([^/]+)$/,
    handler: (match) => ({
      id: match[1],
      userId: 'user_1',
      agreementId: 'agreement_1',
      paymentMethod: null,
      paymentMethodId: 1,
      amount: 2500,
      currency: 'USDC',
      interval: 'monthly',
      nextRunAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'active',
      retries: 0,
      maxRetries: 3,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  },
];

export function getMockData(endpoint: string): unknown {
  const pathname = endpoint.split('?')[0];

  // Check static patterns first
  if (pathname in mockData) {
    return mockData[pathname];
  }

  // Check dynamic patterns
  for (const { pattern, handler } of dynamicPatterns) {
    const match = pathname.match(pattern);
    if (match) {
      return handler(match);
    }
  }

  // Default response for unknown endpoints - return flat array to prevent crashes
  return [];
}

export function shouldUseMockApi(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
}
