# Mock Data Quick Reference

## Import Patterns

### Import Everything

```typescript
import * as mocks from '@/mocks';
```

### Import Specific Features

```typescript
import { MOCK_DISPUTES, MOCK_REVIEWS, MOCK_TRANSACTIONS } from '@/mocks';
```

### Import from Specific Module

```typescript
import { MOCK_DISPUTES } from '@/mocks/features/disputes';
import { MOCK_USERS } from '@/mocks/entities/users';
import { MOCK_MONTHLY_EARNINGS } from '@/mocks/analytics/dashboard';
```

## Common Use Cases

### Display Disputes List

```typescript
import { MOCK_DISPUTES } from '@/mocks';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState(MOCK_DISPUTES);
  return disputes.map(d => <DisputeCard key={d.id} dispute={d} />);
}
```

### Display Transactions

```typescript
import { MOCK_TRANSACTIONS } from '@/mocks';

export default function TransactionsPage() {
  return <TransactionTable transactions={MOCK_TRANSACTIONS} />;
}
```

### Display Maintenance Requests

```typescript
import { MOCK_MAINTENANCE_REQUESTS } from '@/mocks';

export default function MaintenancePage() {
  return MOCK_MAINTENANCE_REQUESTS.map(m => <MaintenanceCard key={m.id} request={m} />);
}
```

### Display Documents

```typescript
import { MOCK_DOCUMENTS } from '@/mocks';

export default function DocumentsPage() {
  return <DocumentList documents={MOCK_DOCUMENTS} />;
}
```

### Display Refund Requests

```typescript
import { MOCK_REFUND_REQUESTS } from '@/mocks';

export default function RefundsPage() {
  return <RefundTable refunds={MOCK_REFUND_REQUESTS} />;
}
```

### Display Contracts

```typescript
import { MOCK_CONTRACTS } from '@/mocks';

export default function ContractsPage() {
  return MOCK_CONTRACTS.map(c => <ContractCard key={c.id} contract={c} />);
}
```

### Display Analytics

```typescript
import {
  MOCK_MONTHLY_EARNINGS,
  MOCK_CONVERSION_DATA,
  MOCK_LISTING_PERFORMANCE
} from '@/mocks';

export default function AnalyticsPage() {
  return (
    <>
      <EarningsChart data={MOCK_MONTHLY_EARNINGS} />
      <ConversionChart data={MOCK_CONVERSION_DATA} />
      <PerformanceTable data={MOCK_LISTING_PERFORMANCE} />
    </>
  );
}
```

### Display Auth Metrics

```typescript
import { generateMockAuthStats } from '@/mocks/analytics/auth-metrics';

export default function AuthMetricsPage() {
  const stats = generateMockAuthStats();
  return <AuthMetricsChart stats={stats} />;
}
```

### Use Mock API

```typescript
import { getMockData, shouldUseMockApi } from '@/mocks';

async function fetchDisputes() {
  if (shouldUseMockApi()) {
    return getMockData('/disputes');
  }
  return fetch('/api/disputes').then((r) => r.json());
}
```

## Data by Role

### User Data

- `MOCK_REVIEWS` - Reviews written by user
- `MOCK_DASHBOARD_PAYMENTS` - Payment history
- `MOCK_DISPUTES` - Disputes involving user
- `MOCK_TRANSACTIONS` - Transaction history
- `MOCK_REFERRAL_STATS` - Referral program
- `MOCK_MAINTENANCE_REQUESTS` - Maintenance requests
- `MOCK_DOCUMENTS` - Documents

### Admin Data

- `MOCK_CURRENCIES` - Currency management
- `MOCK_REFUND_REQUESTS` - Refund processing
- `generateMockAuthStats()` - Auth metrics
- `MOCK_DISPUTES` - All disputes
- `MOCK_CONTRACTS` - All contracts
- `MOCK_USERS` - All users

## Data Lookup Patterns

### Find Dispute by ID

```typescript
import { MOCK_DISPUTES } from '@/mocks';

const dispute = MOCK_DISPUTES.find((d) => d.id === 'dis-001');
```

### Find User by Email

```typescript
import { MOCK_USERS } from '@/mocks/entities/users';

const user = Object.values(MOCK_USERS)
  .flat()
  .find((u) => u.email === 'chioma.okafor@email.com');
```

### Find Property by ID

```typescript
import { MOCK_PROPERTIES } from '@/mocks';

const property = MOCK_PROPERTIES.find((p) => p.id === 'prop-001');
```

### Find Agreement by Reference

```typescript
import { MOCK_AGREEMENTS } from '@/mocks';

const agreement = MOCK_AGREEMENTS.find((a) => a.reference === 'AGR-2025-014');
```

### Filter Disputes by Status

```typescript
import { MOCK_DISPUTES } from '@/mocks';

const openDisputes = MOCK_DISPUTES.filter((d) => d.status === 'OPEN');
const resolvedDisputes = MOCK_DISPUTES.filter((d) => d.status === 'RESOLVED');
```

### Filter Transactions by Type

```typescript
import { MOCK_TRANSACTIONS } from '@/mocks';

const rentPayments = MOCK_TRANSACTIONS.filter((t) => t.type === 'Rent');
const refunds = MOCK_TRANSACTIONS.filter((t) => t.type === 'Refund');
```

## Filtering & Sorting

### Sort Disputes by Date

```typescript
const sorted = [...MOCK_DISPUTES].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
);
```

### Sort Transactions by Amount

```typescript
const sorted = [...MOCK_TRANSACTIONS].sort((a, b) => b.amount - a.amount);
```

## Pagination Example

```typescript
function paginate(items, page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

const page1 = paginate(MOCK_DISPUTES, 1, 10);
const page2 = paginate(MOCK_DISPUTES, 2, 10);
```

## Type Definitions

All mock data is fully typed. Import types as needed:

```typescript
import type {
  Dispute,
  Review,
  Transaction,
  MaintenanceRequest,
  Document,
  Contract,
  User,
  Property,
  Agreement,
} from '@/mocks';
```

## Environment Variables

```bash
# Enable mock API
NEXT_PUBLIC_USE_MOCK_API=true

# Disable mock API (use real backend)
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Testing with Mock Data

```typescript
import { MOCK_DISPUTES } from '@/mocks';

describe('DisputesList', () => {
  it('renders disputes', () => {
    render(<DisputesList disputes={MOCK_DISPUTES} />);
    expect(screen.getByText('DSP-2026-001')).toBeInTheDocument();
  });
});
```

## Performance Tips

1. **Use useMemo for filtered data**

   ```typescript
   const openDisputes = useMemo(
     () => MOCK_DISPUTES.filter((d) => d.status === 'OPEN'),
     [],
   );
   ```

2. **Paginate large datasets**

   ```typescript
   const [page, setPage] = useState(1);
   const pageSize = 10;
   const paginatedData = MOCK_DISPUTES.slice(
     (page - 1) * pageSize,
     page * pageSize,
   );
   ```

3. **Use React.memo for list items**
   ```typescript
   const DisputeCard = React.memo(({ dispute }) => (
     <div>{dispute.disputeId}</div>
   ));
   ```

## Troubleshooting

### Import not found

- Check path: `@/mocks` should resolve to `frontend/mocks`
- Verify `tsconfig.json` has correct path mapping

### Type errors

- Ensure you're importing the correct type
- Check that mock data matches expected interface

### Mock API not working

- Verify `NEXT_PUBLIC_USE_MOCK_API=true` in `.env.local`
- Check that endpoint matches pattern in `mock-api.ts`

### Data not updating

- Ensure you're importing from new location, not old files
- Check that component is using imported data, not local copy

## See Also

- `frontend/mocks/README.md` - Full documentation
- `frontend/MOCK_DATA_MIGRATION.md` - Migration guide
- `frontend/MOCK_DATA_SUMMARY.md` - Overview
