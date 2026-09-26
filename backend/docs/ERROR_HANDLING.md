# Error Handling

This document covers the error handling architecture across the Chioma platform, including backend exception filters, custom error classes, frontend error classification, and standardized error response formats.

---

## Table of Contents

- [Overview](#overview)
- [Backend Error Handling](#backend-error-handling)
  - [Global Exception Filter](#global-exception-filter)
  - [Error Response Format](#error-response-format)
  - [Exception-to-Status Mapping](#exception-to-status-mapping)
  - [Custom Error Classes](#custom-error-classes)
  - [Validation Errors](#validation-errors)
  - [Rate Limiting Errors](#rate-limiting-errors)
- [Frontend Error Handling](#frontend-error-handling)
  - [Error Type System](#error-type-system)
  - [Error Classification](#error-classification)
  - [HTTP Error Creation](#http-error-creation)
  - [User-Facing Error Messages](#user-facing-error-messages)
  - [Retry Logic](#retry-logic)
  - [Error Logging](#error-logging)
- [Error Flow Diagrams](#error-flow-diagrams)
- [Adding New Error Types](#adding-new-error-types)
- [Best Practices](#best-practices)

---

## Overview

Chioma uses a layered error handling strategy:

1. **Backend:** A global `AllExceptionsFilter` catches all unhandled exceptions and maps them to standardized HTTP responses
2. **Frontend:** An `AppError` type system classifies errors by category, severity, and recoverability, with user-friendly messages
3. **Cross-cutting:** Sentry captures unhandled errors on both sides; correlation IDs link frontend requests to backend logs

```
Frontend                              Backend
┌──────────────┐                     ┌──────────────────────┐
│ API call     │────── HTTP ────────▶│ Controller           │
└──────┬───────┘                     └──────────┬───────────┘
       │                                        │
       │                                        ▼
       │                             ┌──────────────────────┐
       │                             │ Service layer        │
       │                             │ (throws exceptions)  │
       │                             └──────────┬───────────┘
       │                                        │
       │                                        ▼
       │                             ┌──────────────────────┐
       │                             │ AllExceptionsFilter   │
       │                             │ (catches & maps)      │
       │                             └──────────┬───────────┘
       │                                        │
       ▼                                        ▼
┌──────────────┐                     ┌──────────────────────┐
│ classifyError│◀─── JSON response ──│ { statusCode,        │
│ createHttpErr│                     │   message, error }   │
└──────┬───────┘                     └──────────────────────┘
       │
       ▼
┌──────────────┐
│ AppError     │
│ (typed,      │
│  classified) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ UI display   │
│ (user msg +  │
│  recovery)   │
└──────────────┘
```

---

## Backend Error Handling

### Global Exception Filter

**Location:** `backend/src/common/filters/all-exceptions.filter.ts`

The `AllExceptionsFilter` is a NestJS `@Catch()` filter that intercepts every unhandled exception and converts it into a consistent JSON response. It is registered globally via the application module.

**Key behaviors:**

- Catches all exception types (not limited to `HttpException`)
- Maps known exception classes to appropriate HTTP status codes
- Logs unhandled exceptions via NestJS `Logger`
- Returns a consistent response body structure

### Error Response Format

All error responses follow this structure:

```json
{
  "statusCode": 400,
  "message": "Human-readable description of the error",
  "error": "Bad Request"
}
```

For rate-limited responses, an additional field is included:

```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "retryAfter": 60
}
```

### Exception-to-Status Mapping

The filter maps exceptions to HTTP status codes in priority order:

| Exception Type             | HTTP Status | Response Message                  | Notes                          |
| -------------------------- | ----------- | --------------------------------- | ------------------------------ |
| `HttpException`            | _varies_    | From exception response           | NestJS built-in exceptions     |
| `HttpException` (429)      | 429         | Rate limit message + `retryAfter` | Includes retry guidance        |
| `EntityNotFoundError`      | 404         | "Resource not found"              | TypeORM entity lookup failures |
| `QueryFailedError` (23505) | 400         | "Duplicate entry found"           | PostgreSQL unique constraint   |
| `TimeoutError`             | 408         | Error message from exception      | External call timeouts         |
| `NetworkError`             | 503         | Error message from exception      | Network-level failures         |
| `MaxRetriesExceededError`  | 503         | Error message from exception      | All retries exhausted          |
| `DecryptionFailedError`    | 400         | Error message from exception      | Invalid encrypted data         |
| `EncryptionError`          | 500         | "An internal error occurred"      | Internal encryption failure    |
| _Any other exception_      | 500         | "An unexpected error occurred"    | Catch-all for unhandled errors |

**Security note:** Unhandled exceptions and encryption errors return generic messages to avoid leaking internal details. Stack traces are logged server-side only.

### Custom Error Classes

Chioma defines domain-specific error classes for clear exception handling:

#### Retry Errors (`backend/src/common/errors/retry-errors.ts`)

| Error Class               | Purpose                                       | Default Message                            |
| ------------------------- | --------------------------------------------- | ------------------------------------------ |
| `TimeoutError`            | External call exceeded time limit             | "Request timed out"                        |
| `NetworkError`            | Network-level failure (ECONNRESET, ENOTFOUND) | "Network error"                            |
| `MaxRetriesExceededError` | All retry attempts exhausted                  | "Operation failed after N attempt(s): ..." |

`MaxRetriesExceededError` also carries the `attempts` count and `cause` (the last underlying error).

#### Lock Errors (`backend/src/common/lock/lock.errors.ts`)

| Error Class            | Purpose                                |
| ---------------------- | -------------------------------------- |
| `LockNotAcquiredError` | Distributed lock could not be acquired |

#### Idempotency Errors (`backend/src/common/idempotency/idempotency.errors.ts`)

| Error Class                  | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `IdempotencyKeyMissingError` | Required idempotency key not provided in request |

#### Encryption Errors (`backend/src/common/services/encryption.service.ts`)

| Error Class             | Purpose                          |
| ----------------------- | -------------------------------- |
| `EncryptionError`       | Field-level encryption failed    |
| `DecryptionFailedError` | Decryption of stored data failed |

### Validation Errors

The backend uses NestJS `ValidationPipe` configured globally in `main.ts`:

```typescript
new ValidationPipe({
  whitelist: true, // Strip unknown properties
  forbidNonWhitelisted: true, // Reject unknown properties
  transform: true, // Auto-transform payloads to DTO types
  skipMissingProperties: false, // All declared properties required
  disableErrorMessages: true, // In production, hide detailed messages
});
```

Validation errors produce `400 Bad Request` responses with field-level details (in non-production environments):

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be at least 8 characters"
  ],
  "error": "Bad Request"
}
```

### Rate Limiting Errors

When rate limits are exceeded, the filter returns:

```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "retryAfter": 60
}
```

Rate limit headers are exposed on all responses via CORS configuration:

- `X-RateLimit-Limit` — Maximum requests allowed
- `X-RateLimit-Remaining` — Remaining requests in the window
- `X-RateLimit-Reset` — Timestamp when the limit resets

---

## Frontend Error Handling

**Location:** `frontend/lib/errors/`

The frontend implements a comprehensive error classification and recovery system.

### Error Type System

**Location:** `frontend/lib/errors/types.ts`

The `AppError` class extends `Error` with structured metadata:

```typescript
class AppError extends Error {
  code: ErrorCode; // Machine-readable error code
  category: ErrorCategory; // Error classification bucket
  severity: ErrorSeverity; // Impact level
  userMessage: string; // Safe message for display
  recoverable: boolean; // Whether retry/recovery is possible
  status?: number; // HTTP status code (if applicable)
  cause?: unknown; // Original error
  context?: ErrorContext; // Source, action, route metadata
}
```

**Error categories:**

| Category         | Description                            |
| ---------------- | -------------------------------------- |
| `network`        | Connectivity issues, timeouts, offline |
| `validation`     | Invalid input, form errors             |
| `authentication` | Expired sessions, login required       |
| `permission`     | Insufficient access rights             |
| `business`       | Business rule violations               |
| `system`         | Unexpected server/application errors   |
| `unknown`        | Unclassifiable errors                  |

**Error codes:**

| Code                       | Category       | Typical Trigger                |
| -------------------------- | -------------- | ------------------------------ |
| `NETWORK_OFFLINE`          | network        | `navigator.onLine` is false    |
| `NETWORK_TIMEOUT`          | network        | `AbortError` DOMException      |
| `NETWORK_REQUEST_FAILED`   | network        | `TypeError` from fetch         |
| `AUTH_REQUIRED`            | authentication | Not authenticated              |
| `AUTH_SESSION_EXPIRED`     | authentication | HTTP 401 response              |
| `PERMISSION_DENIED`        | permission     | HTTP 403 response              |
| `VALIDATION_INVALID_INPUT` | validation     | HTTP 400/422 response          |
| `BUSINESS_RULE_VIOLATION`  | business       | Domain logic rejection         |
| `SYSTEM_UNEXPECTED`        | system         | HTTP 5xx or unhandled Error    |
| `UNKNOWN_ERROR`            | unknown        | Non-Error throw, unknown value |

**Severity levels:**

| Severity   | When to use                                     |
| ---------- | ----------------------------------------------- |
| `info`     | Validation issues, expected user errors         |
| `warning`  | Session expiry, network issues, permission deny |
| `error`    | Unexpected errors, unknown failures             |
| `critical` | Server errors (5xx), system-level failures      |

### Error Classification

**Location:** `frontend/lib/errors/classify.ts`

Two functions classify errors into `AppError` instances:

#### `classifyUnknownError(error, context?)`

Classifies any thrown value into a structured `AppError`:

| Input Type                                 | Resulting Code           |
| ------------------------------------------ | ------------------------ |
| `AppError` (already classified)            | _passed through_         |
| `DOMException` with name `AbortError`      | `NETWORK_TIMEOUT`        |
| Any error when `navigator.onLine` is false | `NETWORK_OFFLINE`        |
| `TypeError`                                | `NETWORK_REQUEST_FAILED` |
| Generic `Error`                            | `SYSTEM_UNEXPECTED`      |
| Non-Error value                            | `UNKNOWN_ERROR`          |

#### `createHttpError(status, context?)`

Creates an `AppError` from an HTTP status code:

| Status   | Code                       | Severity | Recoverable |
| -------- | -------------------------- | -------- | ----------- |
| 401      | `AUTH_SESSION_EXPIRED`     | warning  | yes         |
| 403      | `PERMISSION_DENIED`        | warning  | no          |
| 400, 422 | `VALIDATION_INVALID_INPUT` | info     | yes         |
| 500+     | `SYSTEM_UNEXPECTED`        | critical | yes         |
| Other    | `UNKNOWN_ERROR`            | error    | yes         |

### User-Facing Error Messages

**Location:** `frontend/lib/errors/messages.ts`

Each error code maps to a display template with three fields:

| Field      | Purpose                                 |
| ---------- | --------------------------------------- |
| `title`    | Short heading (e.g., "Session expired") |
| `message`  | Description of what happened            |
| `guidance` | Actionable next step for the user       |

Example:

```typescript
const { title, message, guidance } = getErrorMessage('AUTH_SESSION_EXPIRED');
// title:    "Session expired"
// message:  "Your session has expired for security reasons."
// guidance: "Sign in again to continue."
```

### Retry Logic

**Location:** `frontend/lib/errors/recovery.ts`

The `withRetry` utility implements exponential backoff for recoverable operations:

```typescript
const result = await withRetry(() => api.createPayment(data), {
  maxAttempts: 3, // Default: 3
  shouldRetry: (error) => isRetryable(error), // Default: always retry
});
```

**Backoff schedule:**

| Attempt | Delay   |
| ------- | ------- |
| 1       | 500ms   |
| 2       | 1,000ms |
| 3       | 2,000ms |

The delay formula is `500 * 2^(attempt-1)` milliseconds.

### Error Logging

**Location:** `frontend/lib/errors/logger.ts`

The `logError` function outputs structured error payloads:

```typescript
logError(error, { source: 'PaymentForm', action: 'submit' });
```

Output (console):

```
[Chioma Error] {
  name: "AppError",
  message: "HTTP 500 Server Error",
  stack: "...",
  context: { source: "PaymentForm", action: "submit" },
  timestamp: "2026-03-30T12:00:00.000Z"
}
```

**External reporter integration:** Assign `window.__CHIOMA_ERROR_REPORTER__` to forward errors to an external service (e.g., Sentry browser SDK).

---

## Error Flow Diagrams

### Backend Error Flow

```
Exception thrown in service/controller
              │
              ▼
    ┌─────────────────────┐
    │ AllExceptionsFilter  │
    │ catch(exception)     │
    └─────────┬───────────┘
              │
              ▼
    ┌─────────────────────┐
    │ resolve(exception)   │
    │                      │
    │ Is HttpException?    │──yes──▶ Extract status + response
    │ Is EntityNotFound?   │──yes──▶ 404 "Resource not found"
    │ Is QueryFailed 23505?│──yes──▶ 400 "Duplicate entry"
    │ Is TimeoutError?     │──yes──▶ 408 + error message
    │ Is Network/Retry?    │──yes──▶ 503 + error message
    │ Is DecryptionFailed? │──yes──▶ 400 + error message
    │ Is EncryptionError?  │──yes──▶ 500 "Internal error" (logged)
    │ Else                 │──yes──▶ 500 "Unexpected error" (logged)
    └─────────┬───────────┘
              │
              ▼
    response.status(status).json(body)
```

### Frontend Error Flow

```
API call fails / error thrown
              │
              ▼
    ┌─────────────────────┐
    │ Has HTTP status?     │
    │                      │
    │ yes ──▶ createHttpError(status)
    │ no  ──▶ classifyUnknownError(error)
    └─────────┬───────────┘
              │
              ▼
    ┌─────────────────────┐
    │ AppError created     │
    │ with code, category, │
    │ severity, userMessage│
    └─────────┬───────────┘
              │
              ├──▶ logError(appError, context)
              │
              ├──▶ Show userMessage + guidance to user
              │
              └──▶ If recoverable: offer retry
```

---

## Adding New Error Types

### Backend: New Custom Error Class

1. Create the error class:

```typescript
// backend/src/common/errors/my-errors.ts
export class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient funds for this transaction') {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}
```

2. Add handling in `AllExceptionsFilter.resolve()`:

```typescript
if (exception instanceof InsufficientFundsError) {
  return {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    body: {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: exception.message,
      error: 'Unprocessable Entity',
    },
  };
}
```

### Frontend: New Error Code

1. Add the code to `ErrorCode` in `frontend/lib/errors/types.ts`:

```typescript
export type ErrorCode =
  | 'NETWORK_OFFLINE'
  // ... existing codes
  | 'PAYMENT_INSUFFICIENT_FUNDS';
```

2. Add the message template in `frontend/lib/errors/messages.ts`:

```typescript
PAYMENT_INSUFFICIENT_FUNDS: {
  title: 'Insufficient funds',
  message: 'Your wallet does not have enough funds for this transaction.',
  guidance: 'Add funds to your wallet and try again.',
},
```

3. Add classification logic in `classify.ts` if needed.

---

## Best Practices

### General

1. **Throw specific errors** — Use custom error classes instead of generic `Error` or `throw new HttpException('...', 500)`
2. **Never expose internals** — Error messages returned to clients should not contain stack traces, SQL queries, or internal paths
3. **Always classify on the frontend** — Wrap every `catch` block with `classifyUnknownError()` or `createHttpError()` to get structured error objects
4. **Use the `recoverable` flag** — Show retry buttons only for recoverable errors; show "contact support" for non-recoverable ones

### Backend

5. **Let the filter handle it** — Don't catch exceptions in controllers just to re-throw them as `HttpException`. Throw domain errors and let `AllExceptionsFilter` map them
6. **Log at the right level** — The filter logs unhandled (500) errors automatically. Don't double-log in service code unless adding extra context
7. **Use TypeORM exceptions** — Let `EntityNotFoundError` and `QueryFailedError` propagate naturally; the filter handles them

### Frontend

8. **Always show `userMessage`** — Never display `error.message` (the technical message) to users; always use `error.userMessage`
9. **Provide recovery guidance** — Use `getErrorMessage(code).guidance` to tell users what to do next
10. **Use `withRetry` for network calls** — Wrap API calls that may fail transiently with the retry utility
11. **Pass `ErrorContext`** — Include `source` (component name) and `action` (what was attempted) for better debugging
