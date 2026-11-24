# Integration Testing Guide

This guide provides practical patterns and examples for writing effective integration tests in the Chioma backend.

## Overview

Integration tests verify that different components of the application work together correctly. They sit between unit tests (isolated components) and E2E tests (full HTTP requests), focusing on internal module interactions.

**Related to:** #2151

## When to Write Integration Tests

Write integration tests when:
- Testing service-repository interactions with real database queries
- Verifying module-level business logic flows
- Testing transaction boundaries and rollback behavior
- Validating cache invalidation strategies
- Testing event emission and handling within modules
- Verifying data transformations across layers

## Test Structure

### Basic Integration Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('PropertyListingService Integration', () => {
  let module: TestingModule;
  let service: PropertyListingService;
  let repository: Repository<PropertyListing>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          database: ':memory:', // Or use test database
          entities: [PropertyListing],
          synchronize: true,
        }),
        PropertyModule,
      ],
    }).compile();

    service = module.get<PropertyListingService>(PropertyListingService);
    repository = module.get(getRepositoryToken(PropertyListing));
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clear data between tests
    await repository.clear();
  });

  it('should create property and persist to database', async () => {
    const propertyData = {
      title: 'Test Property',
      address: '123 Test St',
      monthlyRent: 1000,
      landlordId: 'test-landlord-id',
    };

    const result = await service.create(propertyData);

    // Verify service response
    expect(result).toHaveProperty('id');
    expect(result.title).toBe(propertyData.title);

    // Verify database persistence
    const persisted = await repository.findOne({ where: { id: result.id } });
    expect(persisted).toBeDefined();
    expect(persisted.title).toBe(propertyData.title);
  });
});
```

## Database Integration Patterns

### Using Test Database Connection

```typescript
// test-database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const testDatabaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT) || 5433,
  username: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
  database: process.env.TEST_DB_NAME || 'chioma_test',
  entities: ['src/**/*.entity.ts'],
  synchronize: true, // Only for tests
  dropSchema: true, // Fresh schema per test run
};
```

### Transaction Rollback Pattern

```typescript
describe('Payment Transaction Integration', () => {
  let queryRunner: QueryRunner;

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  it('should rollback on payment failure', async () => {
    try {
      await paymentService.processPayment({
        amount: 1000,
        from: 'tenant-id',
        to: 'landlord-id',
      });
    } catch (error) {
      // Transaction should rollback
    }

    // Verify no changes persisted
    const balance = await accountRepository.findBalance('tenant-id');
    expect(balance).toBe(initialBalance);
  });
});
```

## Service-Repository Integration

### Testing Complex Queries

```typescript
describe('PropertySearch Integration', () => {
  it('should filter properties by multiple criteria', async () => {
    // Seed test data
    await repository.save([
      { title: 'Property A', city: 'Lagos', monthlyRent: 1000 },
      { title: 'Property B', city: 'Lagos', monthlyRent: 2000 },
      { title: 'Property C', city: 'Abuja', monthlyRent: 1500 },
    ]);

    const results = await service.search({
      city: 'Lagos',
      maxRent: 1500,
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Property A');
  });
});
```

### Testing Pagination

```typescript
it('should paginate results correctly', async () => {
  // Create 25 test properties
  const properties = Array.from({ length: 25 }, (_, i) => ({
    title: `Property ${i}`,
    monthlyRent: 1000 + i * 100,
  }));
  await repository.save(properties);

  // Page 1
  const page1 = await service.findAll({ page: 1, limit: 10 });
  expect(page1.data).toHaveLength(10);
  expect(page1.metadata.totalItems).toBe(25);
  expect(page1.metadata.totalPages).toBe(3);

  // Page 3
  const page3 = await service.findAll({ page: 3, limit: 10 });
  expect(page3.data).toHaveLength(5);
});
```

## Cache Integration Testing

### Testing Cache Behavior

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('Property Cache Integration', () => {
  let cacheManager: Cache;

  beforeEach(() => {
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should cache property lookup', async () => {
    const propertyId = 'test-property-id';

    // First call - hits database
    const result1 = await service.findById(propertyId);
    
    // Verify cache was set
    const cached = await cacheManager.get(`property:${propertyId}`);
    expect(cached).toBeDefined();

    // Second call - hits cache
    const result2 = await service.findById(propertyId);
    
    expect(result1).toEqual(result2);
  });

  it('should invalidate cache on update', async () => {
    const property = await service.create({ title: 'Test' });

    // Cache is populated
    await service.findById(property.id);

    // Update invalidates cache
    await service.update(property.id, { title: 'Updated' });

    const cached = await cacheManager.get(`property:${property.id}`);
    expect(cached).toBeNull();
  });
});
```

## Event Integration Testing

### Testing Event Emission

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('Property Events Integration', () => {
  let eventEmitter: EventEmitter2;
  let eventHandler: jest.Mock;

  beforeEach(() => {
    eventEmitter = module.get(EventEmitter2);
    eventHandler = jest.fn();
    eventEmitter.on('property.created', eventHandler);
  });

  it('should emit event when property created', async () => {
    const property = await service.create({
      title: 'New Property',
      monthlyRent: 1000,
    });

    expect(eventHandler).toHaveBeenCalledWith({
      propertyId: property.id,
      landlordId: property.landlordId,
    });
  });
});
```

## Multi-Module Integration

### Testing Cross-Module Interactions

```typescript
describe('Payment-Agreement Integration', () => {
  let paymentService: PaymentService;
  let agreementService: AgreementService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PaymentModule, AgreementModule, DatabaseModule],
    }).compile();

    paymentService = module.get(PaymentService);
    agreementService = module.get(AgreementService);
  });

  it('should update agreement status when rent paid', async () => {
    // Create agreement
    const agreement = await agreementService.create({
      tenantId: 'tenant-id',
      propertyId: 'property-id',
      monthlyRent: 1000,
    });

    // Process payment
    await paymentService.processRentPayment({
      agreementId: agreement.id,
      amount: 1000,
    });

    // Verify agreement updated
    const updated = await agreementService.findById(agreement.id);
    expect(updated.lastPaymentDate).toBeDefined();
    expect(updated.status).toBe('ACTIVE');
  });
});
```

## External Service Integration

### Testing Third-Party API Integration

```typescript
describe('Stellar Integration', () => {
  let stellarService: StellarService;
  let testAccount: Keypair;

  beforeAll(async () => {
    // Use Stellar testnet
    stellarService = new StellarService({
      network: Networks.TESTNET,
      horizonUrl: 'https://horizon-testnet.stellar.org',
    });

    // Create test account
    testAccount = Keypair.random();
    await stellarService.fundTestAccount(testAccount.publicKey());
  });

  it('should submit payment transaction to Stellar', async () => {
    const recipient = Keypair.random().publicKey();

    const result = await stellarService.sendPayment({
      from: testAccount,
      to: recipient,
      amount: '10',
      asset: Asset.native(),
    });

    expect(result.successful).toBe(true);
    expect(result.hash).toBeDefined();

    // Verify on network
    const balance = await stellarService.getBalance(recipient);
    expect(parseFloat(balance)).toBeGreaterThanOrEqual(10);
  });
});
```

## Error Handling Integration

### Testing Error Propagation

```typescript
describe('Error Handling Integration', () => {
  it('should propagate validation errors from repository', async () => {
    await expect(
      service.create({
        title: '', // Invalid: empty title
        monthlyRent: -100, // Invalid: negative rent
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should handle database constraint violations', async () => {
    // Create property with unique constraint
    const data = {
      slug: 'unique-property-slug',
      title: 'Test Property',
    };

    await service.create(data);

    // Attempt duplicate
    await expect(service.create(data)).rejects.toThrow(ConflictException);
  });
});
```

## Performance Integration Tests

### Testing Query Performance

```typescript
describe('Property Search Performance', () => {
  beforeAll(async () => {
    // Seed large dataset
    const properties = Array.from({ length: 10000 }, (_, i) => ({
      title: `Property ${i}`,
      city: i % 10 === 0 ? 'Lagos' : 'Other',
    }));
    await repository.save(properties);
  });

  it('should execute search query efficiently', async () => {
    const start = Date.now();

    await service.search({ city: 'Lagos', limit: 50 });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });

  it('should use indexes for filtered queries', async () => {
    // Enable query logging
    const queries: string[] = [];
    const originalQuery = dataSource.query;
    dataSource.query = async (...args) => {
      queries.push(args[0]);
      return originalQuery.apply(dataSource, args);
    };

    await service.search({ city: 'Lagos' });

    // Verify index usage (query should contain "USING INDEX")
    const searchQuery = queries.find(q => q.includes('SELECT'));
    expect(searchQuery).toContain('city_idx');
  });
});
```

## Seed Data Helpers

### Creating Test Fixtures

```typescript
// test/fixtures/property.fixture.ts
export class PropertyFixture {
  static create(overrides: Partial<PropertyListing> = {}) {
    return {
      title: 'Test Property',
      address: '123 Test Street',
      city: 'Lagos',
      state: 'Lagos State',
      monthlyRent: 1000,
      bedrooms: 2,
      bathrooms: 1,
      landlordId: 'test-landlord-id',
      ...overrides,
    };
  }

  static async seed(repository: Repository<PropertyListing>, count: number) {
    const properties = Array.from({ length: count }, (_, i) =>
      PropertyFixture.create({
        title: `Property ${i}`,
        monthlyRent: 1000 + i * 100,
      })
    );
    return repository.save(properties);
  }
}
```

## Running Integration Tests

```bash
# Run all integration tests
pnpm test -- --testMatch="**/*.integration.spec.ts"

# Run with database cleanup
pnpm test:integration:clean

# Run specific integration test suite
pnpm test -- property-listing.integration.spec.ts

# Run with coverage
pnpm test:cov -- --testMatch="**/*.integration.spec.ts"
```

## Test Isolation Best Practices

1. **Database Isolation**: Use separate test database or transactions
2. **Clear Data**: Reset database state between tests
3. **Mock External APIs**: Use nock or similar for third-party services
4. **Avoid Test Interdependence**: Each test should run independently
5. **Use Factories**: Create reusable test data factories
6. **Test Cleanup**: Clean up resources in `afterEach`/`afterAll` hooks

## Debugging Integration Tests

```typescript
// Enable query logging
TypeOrmModule.forRoot({
  ...testDatabaseConfig,
  logging: true, // Log all queries
  logger: 'advanced-console',
});

// Log test data state
afterEach(async () => {
  const count = await repository.count();
  console.log(`Records in database: ${count}`);
});

// Use Jest's --detectOpenHandles to find resource leaks
// pnpm test --detectOpenHandles
```

## Common Pitfalls

1. **Not Closing Connections**: Always close database connections in `afterAll`
2. **Shared State**: Tests affecting each other due to incomplete cleanup
3. **Slow Tests**: Too many database operations; consider selective mocking
4. **Race Conditions**: Async operations completing in unexpected order
5. **Network Flakiness**: External API calls without proper timeouts/retries

## Further Reading

- [Testing Standards](./TESTING_STANDARDS.md) - Overall testing guidelines
- [E2E Testing Examples](../../test/) - End-to-end test examples
- [Database Seeding](../database/SEEDING.md) - Test data management
- [TypeORM Testing](https://typeorm.io/testing) - Official TypeORM testing docs
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing) - Official NestJS testing guide
