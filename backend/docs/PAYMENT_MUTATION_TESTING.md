# Payment Mutation Testing Guide (#2214)

This guide documents the Stryker mutation testing strategy for payment validation, fee calculation, and transaction lifecycle logic within the Chioma backend.

## Overview

Mutation testing evaluates test suite effectiveness by injecting deliberate faults ("mutants") into source code to verify that existing automated tests detect and kill them.

For the payment service and helper functions, mutation testing ensures that financial calculations, security bounds, idempotency guarantees, and error compensation branches cannot regress without causing test failures.

---

## Configuration & Usage

Mutation tests for payment logic are configured in `stryker.payment.config.json` and executed via Stryker with the Jest test runner and TypeScript checker.

### Running Payment Mutation Tests

```bash
# Run mutation tests on payment service
pnpm run test:mutation:payment

# Or using Make
make test-mutation-payment
```

### Stryker Payment Configuration (`stryker.payment.config.json`)

```json
{
  "$schema": "https://schema.stryker-mutator.io/stryker-config.schema.json",
  "packageManager": "pnpm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "jest",
  "plugins": [
    "@stryker-mutator/jest-runner",
    "@stryker-mutator/typescript-checker"
  ],
  "jest": {
    "projectType": "custom",
    "configFile": "package.json",
    "enableFindRelatedTests": true
  },
  "coverageAnalysis": "perTest",
  "checkers": ["typescript"],
  "tsconfigFile": "tsconfig.json",
  "mutate": [
    "src/modules/payments/payment.service.ts",
    "src/modules/payments/payment.helpers.ts",
    "src/modules/payments/payment-gateway.service.ts"
  ],
  "thresholds": {
    "high": 85,
    "low": 80,
    "break": 80
  },
  "tempDirName": "stryker-tmp"
}
```

---

## Acceptance Criteria & Thresholds

- **Target Score**: Minimum **80% mutation kill rate**
- **Break Policy**: `"break": 80` enforces that CI/build fails if the mutation score drops below 80%.
- **Target Files**:
  - `src/modules/payments/payment.service.ts`
  - `src/modules/payments/payment.helpers.ts`
  - `src/modules/payments/payment-gateway.service.ts`

---

## Identified Weak Tests & Hardening Summary

During analysis of `payment.service.spec.ts` and `payment.helpers.ts`, multiple gaps and weak tests were identified where mutants survived:

### 1. Amount Boundary Conditions (`amount <= 0`)
- **Weakness Identified**: Existing tests only evaluated `amount: 0`. Negative amounts (e.g., `-1`, `-0.01`) were never tested.
- **Surviving Mutant**: Mutating `amount <= 0` to `amount === 0` or `amount < 0` would survive.
- **Resolution**: Added negative value tests in `payment.mutation.spec.ts` covering `-0.01`, `-1`, `-500`, and `0.01` (minimum valid positive amount).

### 2. Maximum Amount Limit Boundary (`amount > 999999999.99`)
- **Weakness Identified**: Rejection of amounts over 1 billion was tested, but acceptance of the exact upper boundary `999,999,999.99` was never tested.
- **Surviving Mutant**: Mutating `>` to `>=` survived.
- **Resolution**: Added explicit boundary test verifying that `999,999,999.99` is accepted and processed successfully.

### 3. Currency Precision Checks (`Number.isInteger(amount * 100)`)
- **Weakness Identified**: Only 3 decimal places (`100.123`) were tested for rejection; acceptance of integers (`100`), single-decimal values (`100.5`), and two-decimal values (`100.99`) was not asserted against precision logic.
- **Surviving Mutant**: Mutating arithmetic operator `amount * 100` or condition logic survived.
- **Resolution**: Added tests confirming acceptance of 0, 1, and 2 decimal place amounts, and rejection of 3+ decimal place amounts (`100.123`, `0.001`).

### 4. Fee & Net Amount Calculations (`amount * 0.02`, `amount - fee`)
- **Weakness Identified**: In the main `records payment successfully` test, `paymentRepository.create` arguments were not verified. Mutants altering the 2% fee multiplier (`* 0.05`, `0`) or changing `-` to `+` in `netAmount` survived.
- **Surviving Mutant**: Binary and arithmetic operator mutations in fee calculations survived.
- **Resolution**: Added assertions verifying that `paymentRepository.create` receives exact calculated `transactionFee` and `netAmount` across multiple payment values.

### 5. User ID Validation (`ensureUserId`)
- **Weakness Identified**: Missing or empty user IDs (`""`, `null`) were never exercised in tests.
- **Surviving Mutant**: Removing `!userId` check survived.
- **Resolution**: Added dedicated tests in `payment.helpers.spec.ts` and `payment.mutation.spec.ts` ensuring `BadRequestException('User ID is required')` is thrown.

### 6. Failed Payment Record Persistence
- **Weakness Identified**: In gateway failure tests, only the thrown exception was checked. The test did not assert that a failed payment record was saved with `status: PaymentStatus.FAILED`, `metadata: { error: chargeResult.error }`, and calculated fee details.
- **Surviving Mutant**: Removing failure record persistence or altering status survived.
- **Resolution**: Asserted that `paymentRepository.create` is invoked with `status: PaymentStatus.FAILED`, error metadata, and that notifications are dispatched.

### 7. Compensating Refund on Local Persistence Failure
- **Weakness Identified**: When local database persistence fails after a successful gateway charge, compensating refund logic was not asserting exact arguments to `paymentGateway.processRefund(chargeId, amount)` or verifying the different error messages for compensated vs uncompensated scenarios.
- **Surviving Mutant**: Conditional mutations in compensating refund branches survived.
- **Resolution**: Added tests covering both `compensated === true` and `compensated === false` scenarios with exact message verification and refund parameter checking.

### 8. Untested Payment Helpers (`payment.helpers.ts`)
- **Weakness Identified**: `payment.helpers.ts` had no dedicated spec file. Schedule interval calculations (`calculateNextRunAt` for quarterly, yearly, and fallback), escrow reference parsing (`parseEscrowReference`), and metadata encryption/decryption error branches were untested.
- **Surviving Mutant**: Switch cases and regex/parsing mutations survived.
- **Resolution**: Created `backend/src/modules/payments/payment.helpers.spec.ts` providing 100% test coverage over all helper functions and edge cases.

---

## Test Suites

| Spec File | Purpose |
|---|---|
| `backend/src/modules/payments/payment.service.spec.ts` | Unit tests for primary PaymentService methods |
| `backend/src/modules/payments/payment.helpers.spec.ts` | Unit tests for date calculations, parsing, encryption, and status maps |
| `backend/src/modules/payments/payment.mutation.spec.ts` | Hardened mutation kill suite targeting boundaries, precision, and math |
| `backend/src/modules/payments/payment.service.comprehensive.spec.ts` | Integration and concurrent payment handling |
