# Tenant Screening API Contract Tests

## Overview

This document describes the comprehensive contract testing implementation for the Tenant Screening API integration, ensuring API contracts are maintained and validated across different service versions.

## Test Coverage

### Core API Endpoints

#### 1. POST /api/tenant-screening/requests

- **Request Creation**: Validates new screening request creation
- **Field Validation**: Ensures required fields are present and valid
- **Data Validation**: Validates applicant data formats and screening check types
- **Error Handling**: Tests various error scenarios and responses

#### 2. GET /api/tenant-screening/requests/:id

- **Request Retrieval**: Validates fetching specific screening requests
- **UUID Validation**: Ensures proper UUID format validation
- **Not Found Handling**: Tests 404 responses for non-existent requests
- **Data Integrity**: Verifies response data structure and content

#### 3. POST /api/tenant-screening/requests/:id/consent

- **Consent Granting**: Tests consent approval workflow
- **Consent Denial**: Validates consent rejection handling
- **Duplicate Prevention**: Ensures consent cannot be granted multiple times
- **Audit Trail**: Verifies consent metadata is properly recorded

#### 4. POST /api/tenant-screening/webhooks/provider

- **Webhook Processing**: Tests provider webhook handling
- **Signature Verification**: Validates webhook security signatures
- **Report Completion**: Tests completed screening report processing
- **Error Scenarios**: Handles invalid provider references

#### 5. GET /api/tenant-screening/reports/:requestId

- **Report Retrieval**: Validates fetching completed reports
- **Data Structure**: Ensures report data format compliance
- **Access Control**: Tests proper access restrictions
- **Not Found Handling**: Validates 404 scenarios

### Advanced Testing Scenarios

#### Rate Limiting Tests

- **Endpoint Limits**: Validates rate limiting on request creation
- **Header Verification**: Ensures rate limit headers are present
- **Burst Handling**: Tests behavior under rapid request bursts
- **Tier-Based Limits**: Validates different limits per user tier

#### Error Handling Tests

- **Malformed JSON**: Tests invalid JSON handling
- **Authentication**: Validates protected endpoint access
- **Service Health**: Tests service availability and health checks
- **Database Errors**: Handles database connection failures gracefully

## Test Implementation

### Test Structure

```typescript
describe("Tenant Screening API Contract Tests", () => {
  let contractTest: ContractTest;
  let tenantScreeningAPI: TenantScreeningAPI;

  beforeEach(() => {
    contractTest = new ContractTest({
      baseUrl: process.env.TENANT_SCREENING_API_URL,
      timeout: 30000,
      retries: 3,
    });
  });
});
```

### Data Validation

#### Request Data Structure

```typescript
const requestData = {
  tenantId: "test-tenant-123",
  requestedChecks: ["credit", "background", "eviction"],
  applicantData: {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    // ... other fields
  },
  consentRequired: true,
  consentVersion: "1.0",
};
```

#### Response Validation

```typescript
expect(response.data).toMatchObject({
  id: expect.any(String),
  tenantId: requestData.tenantId,
  requestedChecks: requestData.requestedChecks,
  status: "PENDING_CONSENT",
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
});
```

### Contract Testing Framework

#### Core Features

- **Environment Configuration**: Flexible test environment setup
- **Request/Response Validation**: Automatic contract validation
- **Error Scenario Testing**: Comprehensive error case coverage
- **Performance Monitoring**: Response time and performance metrics

#### Security Testing

- **Webhook Signatures**: HMAC signature validation
- **Authentication**: JWT token validation
- **Authorization**: Role-based access control testing
- **Data Encryption**: Sensitive data protection validation

## Configuration

### Environment Setup

```bash
# API Configuration
TENANT_SCREENING_API_URL=http://localhost:3000
WEBHOOK_SECRET=test-webhook-secret

# Test Configuration
TEST_TIMEOUT=30000
TEST_RETRIES=3
TEST_PARALLEL=true
```

### Test Data Management

#### Test Fixtures

- **Tenant Data**: Pre-configured tenant information
- **Applicant Data**: Various applicant profiles for testing
- **Provider Data**: Mock provider configurations
- **Consent Data**: Different consent scenarios

#### Data Cleanup

- **Automatic Cleanup**: Test data cleanup after each test
- **Isolation**: Test data isolation between test runs
- **Rollback**: Database transaction rollback on failures

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Run all contract tests
npm run test:contract

# Run specific test suite
npm run test:contract -- --grep "Tenant Screening"

# Run with coverage
npm run test:contract:coverage
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Contract Tests
  run: |
    npm run test:contract
    npm run test:contract:report
```

### Docker Testing

```bash
# Build test environment
docker build -f Dockerfile.test -t contract-tests .

# Run tests in container
docker run --rm contract-tests
```

## Test Reports

### Coverage Reports

- **Endpoint Coverage**: Percentage of API endpoints tested
- **Scenario Coverage**: Different test scenarios covered
- **Error Coverage**: Error conditions tested
- **Performance Metrics**: Response time distributions

### Contract Validation

- **Schema Validation**: Request/response schema compliance
- **Status Code Validation**: Correct HTTP status codes
- **Header Validation**: Required headers presence
- **Data Format Validation**: Data type and format checking

## Best Practices

### Test Design

- **Isolation**: Each test should be independent
- **Repeatability**: Tests should produce consistent results
- **Clarity**: Test names and descriptions should be clear
- **Maintenance**: Tests should be easy to maintain and update

### Data Management

- **Realistic Data**: Use realistic test data
- **Privacy**: Ensure no real PII in test data
- **Variety**: Test with various data combinations
- **Boundaries**: Test edge cases and boundary conditions

### Error Testing

- **Negative Testing**: Test what should fail
- **Error Messages**: Validate error message content
- **Status Codes**: Ensure correct HTTP status codes
- **Recovery**: Test error recovery scenarios

## Integration Points

### Service Dependencies

- **Database**: Database connectivity and data integrity
- **External APIs**: Third-party service integrations
- **Message Queues**: Asynchronous processing
- **Cache Systems**: Caching layer validation

### Monitoring Integration

- **Metrics Collection**: Test metrics and monitoring
- **Logging**: Log validation and analysis
- **Alerting**: Alert system testing
- **Health Checks**: Service health validation

## Troubleshooting

### Common Issues

#### Test Failures

1. **Environment Mismatch**: Check test environment configuration
2. **Data Issues**: Verify test data setup and cleanup
3. **Timing Issues**: Check for race conditions or timing dependencies
4. **Network Issues**: Verify network connectivity and timeouts

#### Performance Issues

1. **Slow Tests**: Optimize test data and setup
2. **Resource Contention**: Manage test parallelization
3. **Database Issues**: Check database connections and queries
4. **Memory Leaks**: Monitor memory usage during tests

### Debug Commands

```bash
# Debug specific test
npm run test:contract -- --grep "specific test" --debug

# Run with verbose output
npm run test:contract -- --verbose

# Generate detailed reports
npm run test:contract:report -- --format=detailed
```

## Maintenance

### Regular Updates

- **Schema Changes**: Update tests for API schema changes
- **New Endpoints**: Add tests for new API endpoints
- **Deprecation**: Remove tests for deprecated features
- **Performance**: Update performance expectations

### Version Management

- **Semantic Versioning**: Track API version compatibility
- **Backward Compatibility**: Ensure backward compatibility
- **Breaking Changes**: Document and test breaking changes
- **Migration**: Test API migration scenarios

## Future Enhancements

### Planned Features

1. **Visual Reports**: HTML-based test reports
2. **Performance Baselines**: Automated performance regression testing
3. **Contract Generation**: Automatic contract generation from tests
4. **Mock Services**: Enhanced mock service capabilities

### Tooling Improvements

1. **IDE Integration**: Better IDE support for contract testing
2. **CI/CD Enhancements**: Improved pipeline integration
3. **Monitoring Integration**: Real-time monitoring integration
4. **Documentation**: Automated documentation generation
