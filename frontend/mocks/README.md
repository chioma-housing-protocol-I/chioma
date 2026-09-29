# Mock Data Structure

This directory contains all mock/dummy data for the Chioma frontend application. The data is organized by feature and entity type for easy maintenance and scalability.

## Directory Structure

```
mocks/
├── index.ts                 # Central export hub
├── README.md               # This file
├── entities/               # Core data entities
│   ├── users.ts           # User profiles (users, admins)
│   ├── properties.ts      # Property/building data
│   ├── agreements.ts      # Lease agreements
│   └── currencies.ts      # Supported currencies
├── features/              # Feature-specific mock data
│   ├── disputes.ts        # Dispute cases and details
│   ├── reviews.ts         # User reviews and ratings
│   ├── transactions.ts    # Payment and transaction history
│   ├── maintenance.ts     # Maintenance requests
│   ├── documents.ts       # Lease docs, inspections, etc.
│   ├── refunds.ts         # Refund requests
│   ├── referrals.ts       # Referral program data
│   └── contracts.ts       # Smart contracts
├── analytics/             # Dashboard metrics and analytics
│   ├── dashboard.ts       # User/admin dashboard metrics
│   ├── auth-metrics.ts    # Authentication statistics
│   └── user-analytics.ts  # User-specific analytics
└── api/                   # API layer
    └── mock-api.ts        # Mock API interceptor
```

## Usage

### Importing Mock Data

```typescript
// Import specific mock data
import { MOCK_DISPUTES, MOCK_USERS } from '@/mocks';

// Or import from specific modules
import { MOCK_DISPUTES } from '@/mocks/features/disputes';
import { MOCK_USERS } from '@/mocks/entities/users';
```

### Using in Components

```typescript
import { MOCK_DISPUTES } from '@/mocks';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState(MOCK_DISPUTES);

  // Use mock data for development
  return (
    <div>
      {disputes.map(dispute => (
        <DisputeCard key={dispute.id} dispute={dispute} />
      ))}
    </div>
  );
}
```

### Enabling Mock API

Set in `.env.local`:

```bash
NEXT_PUBLIC_USE_MOCK_API=true
```

Then use the mock API layer:

```typescript
import { getMockData, shouldUseMockApi } from '@/mocks';

if (shouldUseMockApi()) {
  const data = getMockData('/disputes');
}
```

## Data Organization

### Entities (Core Data)

These represent fundamental objects in the system:

- **users.ts**: All user types (users, admins)
- **properties.ts**: Physical properties/buildings
- **agreements.ts**: Lease agreements between parties
- **currencies.ts**: Supported blockchain currencies

### Features (Domain-Specific Data)

These represent specific features and their associated data:

- **disputes.ts**: Dispute cases with evidence, timeline, and resolution
- **reviews.ts**: User reviews and rating targets
- **transactions.ts**: Payment history and transaction records
- **maintenance.ts**: Maintenance requests and assignments
- **documents.ts**: Lease documents, inspection reports, etc.
- **refunds.ts**: Refund requests and processing
- **referrals.ts**: Referral program tracking
- **contracts.ts**: Smart contract details

### Analytics (Metrics & Dashboards)

Dashboard-specific data:

- **dashboard.ts**: User/admin KPIs, earnings, performance
- **auth-metrics.ts**: Authentication statistics and trends
- **agent-analytics.ts**: User-specific metrics and wallet balances

### API Layer

- **mock-api.ts**: Centralized mock API interceptor with pattern matching

## Adding New Mock Data

### 1. Create a New Feature Module

Create `frontend/mocks/features/new-feature.ts`:

```typescript
/**
 * Mock New Feature Data
 */

export interface NewFeatureItem {
  id: string;
  name: string;
  // ... other fields
}

export const MOCK_NEW_FEATURE_ITEMS: NewFeatureItem[] = [
  {
    id: '1',
    name: 'Example Item',
    // ... data
  },
];
```

### 2. Export from Index

Add to `frontend/mocks/index.ts`:

```typescript
export * from './features/new-feature';
```

### 3. Add to Mock API (if needed)

Update `frontend/mocks/api/mock-api.ts`:

```typescript
const mockData: Record<string, unknown> = {
  '/new-feature': {
    data: MOCK_NEW_FEATURE_ITEMS,
  },
};
```

## Data Relationships

Key relationships between mock data:

```
Users
├── Regular Users (user-001, user-002, ...)
└── Admins (admin-001)

Properties
├── Owned by Users
└── Contain Units/Suites

Agreements
├── Link Users + Properties
└── Reference Currencies

Disputes
├── Between Users
├── Reference Agreements
└── Contain Evidence + Timeline

Reviews
├── By Users about other Users
└── Reference Properties

Transactions
├── Related to Agreements
├── Use Currencies
└── Can be Refunded

Maintenance
├── For Properties
├── Assigned to Users
└── Requested by Users

Documents
├── For Properties
├── Involve Users
└── Types: Lease, Inspection, Maintenance

Contracts
├── Between Users
├── For Properties
└── Use Currencies
```

## Maintenance Guidelines

### When to Update Mock Data

- When adding new features
- When changing data structures
- When adding new user roles or statuses
- When expanding supported currencies or payment methods

### Best Practices

1. **Keep data realistic**: Use realistic names, amounts, and dates
2. **Maintain relationships**: Ensure IDs reference existing entities
3. **Use consistent formats**: Follow existing patterns for dates, amounts, etc.
4. **Document changes**: Update this README when adding new data types
5. **Test thoroughly**: Verify mock data works with all components

### Data Consistency

- User IDs should be consistent across all files
- Property IDs should match between properties.ts and agreements.ts
- Agreement references should match dispute references
- Dates should be realistic and in ISO format

## Environment Variables

```bash
# Enable mock API (development only)
NEXT_PUBLIC_USE_MOCK_API=true

# Disable mock API to use real backend
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Performance Considerations

- Mock data is loaded synchronously
- For large datasets, consider lazy loading
- Use pagination in components even with mock data
- Simulate API delays with setTimeout for realistic UX testing

## Future Enhancements

- [ ] Add mock data generators for random data
- [ ] Implement data seeding for specific scenarios
- [ ] Add mock data validation
- [ ] Create data factory functions
- [ ] Add mock data versioning
