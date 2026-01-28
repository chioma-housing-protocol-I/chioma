# Chioma API Documentation

## Overview

The Chioma API is a RESTful API built on NestJS that provides endpoints for managing rental agreements, user authentication, and Stellar blockchain-based payments. The API follows a hybrid architecture combining traditional web2 authentication with Web3 Stellar wallet authentication.

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.chioma.com/api
```

## Authentication

The API supports two authentication methods:

### 1. JWT Bearer Token (Email/Password)
```
Authorization: Bearer <jwt_token>
```

### 2. Stellar Wallet Authentication (SEP-0010)
Follow the [Stellar Authentication Flow](./stellar-auth.md) for detailed implementation.

## API Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "tenant"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant",
    "isActive": true,
    "createdAt": "2024-01-26T17:32:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Stellar Authentication
```http
POST /auth/stellar/challenge
Content-Type: application/json

{
  "walletAddress": "GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q"
}
```

```http
POST /auth/stellar/verify
Content-Type: application/json

{
  "walletAddress": "GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q",
  "signature": "304402207...",
  "challenge": "AAAAAgAAAABAAAAAAAAAAA..."
}
```

### Users

#### Get Current User Profile
```http
GET /users/me
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "tenant",
  "isActive": true,
  "createdAt": "2024-01-26T17:32:00.000Z",
  "updatedAt": "2024-01-26T17:32:00.000Z"
}
```

#### Update User Profile
```http
PUT /users/me
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890"
}
```

### Rent Agreements

#### Create Agreement
```http
POST /agreements
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "propertyId": "property-uuid",
  "landlordId": "landlord-uuid",
  "tenantId": "tenant-uuid",
  "agentId": "agent-uuid",
  "landlordStellarPubKey": "GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q",
  "tenantStellarPubKey": "GD7J3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q",
  "agentStellarPubKey": "GD8J3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q",
  "monthlyRent": 1500.00,
  "securityDeposit": 3000.00,
  "agentCommissionRate": 5.0,
  "startDate": "2024-02-01",
  "endDate": "2025-01-31",
  "termsAndConditions": "Standard lease terms with no smoking policy."
}
```

**Response:**
```json
{
  "id": "agreement-uuid",
  "propertyId": "property-uuid",
  "landlordId": "landlord-uuid",
  "tenantId": "tenant-uuid",
  "agentId": "agent-uuid",
  "landlordStellarPubKey": "GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q",
  "tenantStellarPubKey": "GD7J3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q",
  "monthlyRent": 1500.00,
  "securityDeposit": 3000.00,
  "agentCommissionRate": 5.0,
  "startDate": "2024-02-01",
  "endDate": "2025-01-31",
  "status": "ACTIVE",
  "termsAndConditions": "Standard lease terms with no smoking policy.",
  "createdAt": "2024-01-26T17:32:00.000Z",
  "updatedAt": "2024-01-26T17:32:00.000Z"
}
```

#### List Agreements
```http
GET /agreements?page=1&limit=10&status=ACTIVE&landlordId=landlord-uuid
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "agreement-uuid",
      "propertyId": "property-uuid",
      "landlordId": "landlord-uuid",
      "tenantId": "tenant-uuid",
      "monthlyRent": 1500.00,
      "status": "ACTIVE",
      "startDate": "2024-02-01",
      "endDate": "2025-01-31",
      "createdAt": "2024-01-26T17:32:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

#### Get Specific Agreement
```http
GET /agreements/{agreementId}
Authorization: Bearer <jwt_token>
```

#### Update Agreement
```http
PUT /agreements/{agreementId}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "monthlyRent": 1600.00,
  "status": "ACTIVE"
}
```

#### Terminate Agreement
```http
DELETE /agreements/{agreementId}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "terminationReason": "Mutual agreement to end lease early",
  "terminationNotes": "Tenant found new job in different city"
}
```

#### Record Payment
```http
POST /agreements/{agreementId}/pay
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 1500.00,
  "paymentDate": "2024-01-26",
  "paymentMethod": "Stellar Transfer",
  "referenceNumber": "stellar-tx-hash-123",
  "notes": "January rent payment"
}
```

**Response:**
```json
{
  "id": "payment-uuid",
  "agreementId": "agreement-uuid",
  "amount": 1500.00,
  "paymentDate": "2024-01-26",
  "paymentMethod": "Stellar Transfer",
  "referenceNumber": "stellar-tx-hash-123",
  "status": "COMPLETED",
  "notes": "January rent payment",
  "createdAt": "2024-01-26T18:00:00.000Z"
}
```

#### Get Payment History
```http
GET /agreements/{agreementId}/payments?page=1&limit=10&status=COMPLETED
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "payment-uuid",
      "agreementId": "agreement-uuid",
      "amount": 1500.00,
      "paymentDate": "2024-01-26",
      "paymentMethod": "Stellar Transfer",
      "referenceNumber": "stellar-tx-hash-123",
      "status": "COMPLETED",
      "notes": "January rent payment",
      "createdAt": "2024-01-26T18:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

## Data Models

### User Roles
- `tenant` - Property renter
- `landlord` - Property owner
- `agent` - Real estate agent
- `admin` - System administrator

### Agreement Status
- `DRAFT` - Agreement created but not activated
- `ACTIVE` - Currently active rental agreement
- `TERMINATED` - Agreement ended before end date
- `EXPIRED` - Agreement reached natural end date

### Payment Status
- `PENDING` - Payment initiated but not confirmed
- `COMPLETED` - Payment successfully processed
- `FAILED` - Payment failed or rejected

## Error Handling

### Standard Error Response Format
```json
{
  "message": "Error description",
  "error": "ErrorType",
  "statusCode": 400,
  "path": "/api/endpoint",
  "timestamp": "2024-01-26T17:32:00.000Z"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Rate Limiting

- Authentication endpoints: 3-10 requests per minute
- General API endpoints: 100 requests per minute
- Payment endpoints: 20 requests per minute

## Pagination

List endpoints support pagination with these query parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sortBy` - Field to sort by (default: createdAt)
- `sortOrder` - Sort direction: ASC or DESC (default: DESC)

## SDK Examples

### JavaScript/TypeScript
```typescript
// Initialize API client
const api = new ChiomaAPI({
  baseURL: 'http://localhost:3000/api',
  apiKey: 'your-jwt-token'
});

// Create agreement
const agreement = await api.agreements.create({
  propertyId: 'property-uuid',
  landlordId: 'landlord-uuid',
  tenantId: 'tenant-uuid',
  landlordStellarPubKey: 'GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q',
  tenantStellarPubKey: 'GD7J3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q',
  monthlyRent: 1500.00,
  securityDeposit: 3000.00,
  startDate: '2024-02-01',
  endDate: '2025-01-31'
});

// Record payment
const payment = await api.agreements.recordPayment(agreement.id, {
  amount: 1500.00,
  paymentDate: '2024-01-26',
  paymentMethod: 'Stellar Transfer',
  referenceNumber: 'stellar-tx-hash'
});
```

### Python
```python
from chioma_sdk import ChiomaAPI

# Initialize client
api = ChiomaAPI(base_url='http://localhost:3000/api')
api.set_token('your-jwt-token')

# Get user agreements
agreements = api.agreements.list(status='ACTIVE')

# Create new agreement
agreement = api.agreements.create({
    'propertyId': 'property-uuid',
    'landlordId': 'landlord-uuid',
    'tenantId': 'tenant-uuid',
    'monthlyRent': 1500.00,
    'securityDeposit': 3000.00,
    'startDate': '2024-02-01',
    'endDate': '2025-01-31'
})
```

## Webhooks

Chioma supports webhooks for real-time notifications:

### Supported Events
- `agreement.created` - New agreement created
- `agreement.terminated` - Agreement terminated
- `payment.completed` - Payment processed
- `payment.failed` - Payment failed

### Webhook Configuration
```json
{
  "url": "https://your-app.com/webhooks/chioma",
  "events": ["payment.completed", "agreement.terminated"],
  "secret": "webhook-secret-key"
}
```

### Webhook Payload Example
```json
{
  "event": "payment.completed",
  "data": {
    "paymentId": "payment-uuid",
    "agreementId": "agreement-uuid",
    "amount": 1500.00,
    "timestamp": "2024-01-26T18:00:00.000Z"
  },
  "signature": "sha256=webhook-signature"
}
```

## Testing

### Test Environment
- URL: `http://localhost:3000/api`
- Test Stellar Network: Testnet
- Test Accounts: Available in development environment

### Test Data
```bash
# Create test user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "tenant"
  }'
```

## Support

For API support:
- Documentation: Available at `/api/docs` (Swagger UI)
- Issues: Create GitHub issue
- Email: api-support@chioma.com
- Discord: [Community Server](https://discord.gg/chioma)

## Changelog

### v1.0.0 (Current)
- Basic CRUD operations for agreements
- JWT and Stellar authentication
- Payment recording and history
- User management
- Webhook support

### Upcoming Features
- Property management endpoints
- Advanced search and filtering
- Multi-currency support
- Analytics and reporting
- Mobile SDK support
