/**
 * Centralized error handling exports for the Chioma platform.
 * Import errors from this file to ensure consistency across the application.
 */

// Base error class
export { BaseAppError } from './base.error';

// Error codes and messages
export { ErrorCode, ERROR_MESSAGES } from './error-codes';

// Domain-specific errors
export {
  // Authentication & Authorization
  AuthenticationError,
  AuthorizationError,
  
  // Validation
  ValidationError,
  
  // Resource Not Found
  ResourceNotFoundError,
  UserNotFoundError,
  PropertyNotFoundError,
  AgreementNotFoundError,
  MaintenanceNotFoundError,
  ReviewNotFoundError,
  NotificationNotFoundError,
  
  // Business Logic
  BusinessRuleViolationError,
  DuplicateEntryError,
  InsufficientFundsError,
  InvalidStateTransitionError,
  OperationNotAllowedError,
  ProhibitedContentError,
  
  // Blockchain
  BlockchainError,
  BlockchainConnectionError,
  BlockchainTransactionError,
  InsufficientBalanceError,
  
  // External Services
  ExternalServiceError,
  EmailServiceError,
  PaymentProviderError,
  StorageServiceError,
  KycServiceError,
  
  // Rate Limiting
  RateLimitError,
  SuspiciousActivityError,
  
  // System
  SystemError,
  ConfigurationError,
  ServiceUnavailableError,
} from './domain-errors';

// Network & Retry errors
export {
  TimeoutError,
  NetworkError,
  MaxRetriesExceededError,
} from './retry-errors';

// Concurrency errors
export { LockNotAcquiredError } from '../lock/lock.errors';
export { IdempotencyKeyMissingError } from '../idempotency/idempotency.errors';

// Encryption errors
export { EncryptionError, DecryptionFailedError } from '../services/encryption.service';
