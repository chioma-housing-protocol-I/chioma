# Contract Testing Guide

## Overview

Contract testing ensures that different services (or our backend and external APIs) can communicate with each other by adhering to a shared agreement (a contract). This prevents integration failures when one side changes its API.

In this project, we use **Consumer-Driven Contract Testing** patterns implemented with `nock` and `jest-json-schema` to validate our integrations with third-party providers.

## Key Concepts

- **Consumer**: Our backend (which calls the API).
- **Provider**: The external service (e.g., Paystack, Flutterwave, Tenant Screening API).
- **Contract**: The agreement on request structure (headers, body, parameters) and response structure (status code, schema).

## Implementation Strategy

We use `nock` to intercept outgoing HTTP requests and `jest-json-schema` to validate that the provider's response matches our expectations.

### 1. Define the Provider Schema

Define a JSON Schema that represents the minimum required fields from the provider.

```typescript
const providerResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['SUCCESS', 'FAILED'] },
  },
  required: ['id', 'status'],
};
```

### 2. Mock the Provider with Nock

Use `nock` to simulate the provider's behavior and verify the consumer's request.

```typescript
nock('https://api.provider.com')
  .post('/endpoint')
  .reply(200, (uri, requestBody) => {
    // Verify Consumer Contract (what we send)
    expect(requestBody).toMatchObject({
      requiredField: 'value',
    });
    return { id: '123', status: 'SUCCESS' };
  });
```

### 3. Validate the Contract

Execute the service method and validate the results.

```typescript
const result = await service.callProvider();

// Verify Provider Contract (what we receive)
expect(result).toMatchSchema(providerResponseSchema);
```

## Running Contract Tests

Contract tests are located in `backend/test/contract/` and follow the `*.contract.spec.ts` naming convention.

To run all contract tests:

```bash
make test-contract
```

Or using pnpm:

```bash
pnpm run test:contract
```

## Best Practices

1.  **Test only the boundaries**: Contract tests should focus on the interaction between our service and the external API, not the internal business logic.
2.  **Keep schemas minimal**: Only include fields that our application actually uses.
3.  **Test error scenarios**: Include tests for 400, 401, 500 responses to ensure our backend handles provider failures gracefully.
4.  **Colocate with logic**: Keep contract tests in `test/contract` but name them after the module they test.
