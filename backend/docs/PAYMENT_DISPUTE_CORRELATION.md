# Payment Dispute Correlation

## Overview

This feature adds payment correlation metadata to disputes, enabling disputes to be directly linked to specific payments for better resolution context. Previously, disputes were only linked to agreements, making it difficult to identify which specific payment was being disputed.

## Problem Solved

**Before**: Disputes lacked context for resolution. Cannot correlate to original payment.
**After**: Disputes can now be directly linked to specific payments with complete payment context for efficient resolution.

## Database Schema Changes

### New Fields Added to `disputes` Table

| Field                      | Type          | Description                                                      |
| -------------------------- | ------------- | ---------------------------------------------------------------- |
| `payment_id`               | uuid          | UUID of the general payment being disputed (from payments table) |
| `rent_payment_id`          | varchar(255)  | ID of the rent payment being disputed (from rent_payments table) |
| `disputed_payment_amount`  | decimal(12,2) | Amount that was actually paid and is being disputed              |
| `payment_reference_number` | varchar(100)  | Reference number of the payment for easy lookup                  |
| `payment_date`             | timestamp     | Date when the payment was processed                              |

### Indexes Added

- `IDX_disputes_payment_id` - For efficient general payment lookup
- `IDX_disputes_rent_payment_id` - For efficient rent payment lookup
- `IDX_disputes_payment_reference_number` - For reference number search

## API Changes

### Create Dispute Endpoint

**Endpoint**: `POST /disputes`

**New Optional Fields**:

```json
{
  "agreementId": "123e4567-e89b-12d3-a456-426614174000",
  "disputeType": "RENT_PAYMENT",
  "description": "Payment was charged but service not provided",

  // New payment correlation fields (all optional)
  "paymentId": "123e4567-e89b-12d3-a456-426614174001", // General payment UUID
  "rentPaymentId": "pay_rent_abc123", // Rent payment ID
  "paymentReferenceNumber": "REF-2024-001234" // Payment reference
}
```

### Query Disputes Endpoint

**Endpoint**: `GET /disputes`

**New Query Parameters**:

- `paymentId` - Filter by general payment UUID
- `rentPaymentId` - Filter by rent payment ID
- `paymentReferenceNumber` - Filter by payment reference number

**Example**:

```
GET /disputes?paymentId=123e4567-e89b-12d3-a456-426614174001
GET /disputes?rentPaymentId=pay_rent_abc123
GET /disputes?paymentReferenceNumber=REF-2024-001234
```

### New Correlation Endpoints

#### Get Disputes by Payment ID

```
GET /disputes/payment/{paymentId}/disputes
```

Returns all disputes linked to a specific general payment.

#### Get Disputes by Rent Payment ID

```
GET /disputes/rent-payment/{rentPaymentId}/disputes
```

Returns all disputes linked to a specific rent payment.

#### Get Disputes by Payment Reference

```
GET /disputes/payment-reference/{referenceNumber}/disputes
```

Returns all disputes linked to a payment reference number.

## Validation Logic

### Payment Validation Rules

1. **Payment Exists**: Referenced payment must exist in database
2. **Agreement Match**: Payment must belong to the same agreement as the dispute
3. **Automatic Correlation**: If only reference number provided, system attempts to find matching payment
4. **Context Enrichment**: Payment details are automatically copied to dispute for historical context

### Example Validation Flow

```typescript
// 1. Validate payment exists and belongs to agreement
const payment = await findPayment(paymentId);
if (payment.agreementId !== disputeDto.agreementId) {
  throw new ValidationError('Payment does not belong to agreement');
}

// 2. Enrich dispute with payment context
const dispute = {
  ...disputeData,
  paymentId: payment.id,
  disputedPaymentAmount: payment.amount,
  paymentReferenceNumber: payment.referenceNumber,
  paymentDate: payment.processedAt,
};
```

## Usage Examples

### Create Dispute with Payment Correlation

```typescript
// Dispute a specific general payment
const dispute = await disputeService.createDispute(
  {
    agreementId: 'agreement-123',
    disputeType: 'RENT_PAYMENT',
    description: 'Payment processed but no receipt provided',
    paymentId: 'payment-456', // Links to payments table
  },
  userId,
);

// Dispute a specific rent payment
const dispute = await disputeService.createDispute(
  {
    agreementId: 'agreement-123',
    disputeType: 'RENT_PAYMENT',
    description: 'Double charged for rent payment',
    rentPaymentId: 'rent_pay_789', // Links to rent_payments table
  },
  userId,
);

// Dispute by reference number (auto-correlation)
const dispute = await disputeService.createDispute(
  {
    agreementId: 'agreement-123',
    disputeType: 'RENT_PAYMENT',
    description: 'Payment failed but amount was deducted',
    paymentReferenceNumber: 'REF-2024-001234', // System finds matching payment
  },
  userId,
);
```

### Query Disputes by Payment

```typescript
// Find all disputes for a payment
const disputes = await disputeService.findDisputesByPayment('payment-456');

// Find disputes by rent payment
const disputes = await disputeService.findDisputesByRentPayment('rent_pay_789');

// Find disputes by reference number
const disputes =
  await disputeService.findDisputesByPaymentReference('REF-2024-001234');

// Query with filters
const result = await disputeService.findAll({
  paymentId: 'payment-456',
  status: 'OPEN',
});
```

## Benefits

1. **Better Context**: Disputes now include complete payment details for resolution
2. **Efficient Lookup**: Find all disputes related to a specific payment quickly
3. **Historical Data**: Payment details are preserved even if original payment is modified
4. **Flexible Linking**: Support for both general payments and rent-specific payments
5. **Reference Correlation**: Can link disputes via payment reference numbers

## Migration

Run the migration to add the new fields:

```bash
npm run migration:run
```

The migration `1925000000000-AddPaymentDisputeCorrelation` will:

- Add 5 new columns to disputes table
- Create 3 new indexes for efficient querying
- Preserve all existing dispute data

## Backward Compatibility

- ✅ All existing disputes continue to work unchanged
- ✅ Payment correlation fields are optional
- ✅ Existing API endpoints remain functional
- ✅ New fields default to NULL for existing records
