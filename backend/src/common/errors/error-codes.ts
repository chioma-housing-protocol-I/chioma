/**
 * Standardized error codes for the Chioma platform.
 * These codes provide machine-readable identifiers for all error types.
 */
export enum ErrorCode {
  // Authentication & Authorization (1xxx)
  AUTH_INVALID_CREDENTIALS = 'AUTH_1001',
  AUTH_TOKEN_EXPIRED = 'AUTH_1002',
  AUTH_TOKEN_INVALID = 'AUTH_1003',
  AUTH_UNAUTHORIZED = 'AUTH_1004',
  AUTH_FORBIDDEN = 'AUTH_1005',
  AUTH_SESSION_EXPIRED = 'AUTH_1006',
  AUTH_MFA_REQUIRED = 'AUTH_1007',
  AUTH_MFA_INVALID = 'AUTH_1008',

  // Validation (2xxx)
  VALIDATION_FAILED = 'VAL_2001',
  VALIDATION_INVALID_INPUT = 'VAL_2002',
  VALIDATION_MISSING_FIELD = 'VAL_2003',
  VALIDATION_INVALID_FORMAT = 'VAL_2004',
  VALIDATION_OUT_OF_RANGE = 'VAL_2005',

  // Resource Not Found (3xxx)
  RESOURCE_NOT_FOUND = 'RES_3001',
  USER_NOT_FOUND = 'RES_3002',
  PROPERTY_NOT_FOUND = 'RES_3003',
  AGREEMENT_NOT_FOUND = 'RES_3004',
  ESCROW_NOT_FOUND = 'RES_3005',
  DISPUTE_NOT_FOUND = 'RES_3006',
  REVIEW_NOT_FOUND = 'RES_3007',
  NOTIFICATION_NOT_FOUND = 'RES_3008',
  MAINTENANCE_NOT_FOUND = 'RES_3009',

  // Business Logic (4xxx)
  BUSINESS_RULE_VIOLATION = 'BUS_4001',
  DUPLICATE_ENTRY = 'BUS_4002',
  INSUFFICIENT_FUNDS = 'BUS_4003',
  INVALID_STATE_TRANSITION = 'BUS_4004',
  OPERATION_NOT_ALLOWED = 'BUS_4005',
  QUOTA_EXCEEDED = 'BUS_4006',
  ALREADY_EXISTS = 'BUS_4007',
  PROHIBITED_CONTENT = 'BUS_4008',

  // Blockchain & Smart Contracts (5xxx)
  BLOCKCHAIN_CONNECTION_FAILED = 'BC_5001',
  BLOCKCHAIN_TRANSACTION_FAILED = 'BC_5002',
  BLOCKCHAIN_INSUFFICIENT_BALANCE = 'BC_5003',
  BLOCKCHAIN_INVALID_ADDRESS = 'BC_5004',
  BLOCKCHAIN_CONTRACT_ERROR = 'BC_5005',
  BLOCKCHAIN_NETWORK_ERROR = 'BC_5006',
  BLOCKCHAIN_TIMEOUT = 'BC_5007',

  // External Services (6xxx)
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXT_6001',
  EXTERNAL_SERVICE_TIMEOUT = 'EXT_6002',
  EXTERNAL_SERVICE_ERROR = 'EXT_6003',
  PAYMENT_PROVIDER_ERROR = 'EXT_6004',
  EMAIL_SERVICE_ERROR = 'EXT_6005',
  STORAGE_SERVICE_ERROR = 'EXT_6006',
  KYC_SERVICE_ERROR = 'EXT_6007',

  // Network & Infrastructure (7xxx)
  NETWORK_ERROR = 'NET_7001',
  NETWORK_TIMEOUT = 'NET_7002',
  NETWORK_CONNECTION_REFUSED = 'NET_7003',
  MAX_RETRIES_EXCEEDED = 'NET_7004',

  // Rate Limiting (8xxx)
  RATE_LIMIT_EXCEEDED = 'RATE_8001',
  TOO_MANY_REQUESTS = 'RATE_8002',
  SUSPICIOUS_ACTIVITY = 'RATE_8003',

  // Data & Encryption (9xxx)
  ENCRYPTION_ERROR = 'DATA_9001',
  DECRYPTION_ERROR = 'DATA_9002',
  DATA_INTEGRITY_ERROR = 'DATA_9003',
  DATABASE_ERROR = 'DATA_9004',
  CACHE_ERROR = 'DATA_9005',

  // Concurrency & Locking (10xxx)
  LOCK_NOT_ACQUIRED = 'LOCK_10001',
  LOCK_TIMEOUT = 'LOCK_10002',
  IDEMPOTENCY_KEY_MISSING = 'LOCK_10003',
  IDEMPOTENCY_CONFLICT = 'LOCK_10004',

  // System & Internal (11xxx)
  INTERNAL_SERVER_ERROR = 'SYS_11001',
  SERVICE_UNAVAILABLE = 'SYS_11002',
  NOT_IMPLEMENTED = 'SYS_11003',
  CONFIGURATION_ERROR = 'SYS_11004',
  MAINTENANCE_MODE = 'SYS_11005',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN',
}

/**
 * Maps error codes to user-friendly messages
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please sign in again',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Invalid authentication token',
  [ErrorCode.AUTH_UNAUTHORIZED]: 'You must be signed in to access this resource',
  [ErrorCode.AUTH_FORBIDDEN]: 'You do not have permission to access this resource',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Your session has expired for security reasons',
  [ErrorCode.AUTH_MFA_REQUIRED]: 'Multi-factor authentication is required',
  [ErrorCode.AUTH_MFA_INVALID]: 'Invalid verification code',

  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'The provided data is invalid',
  [ErrorCode.VALIDATION_INVALID_INPUT]: 'One or more fields contain invalid data',
  [ErrorCode.VALIDATION_MISSING_FIELD]: 'Required field is missing',
  [ErrorCode.VALIDATION_INVALID_FORMAT]: 'Invalid data format',
  [ErrorCode.VALIDATION_OUT_OF_RANGE]: 'Value is out of acceptable range',

  // Resource Not Found
  [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource was not found',
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.PROPERTY_NOT_FOUND]: 'Property not found',
  [ErrorCode.AGREEMENT_NOT_FOUND]: 'Agreement not found',
  [ErrorCode.ESCROW_NOT_FOUND]: 'Escrow not found',
  [ErrorCode.DISPUTE_NOT_FOUND]: 'Dispute not found',
  [ErrorCode.REVIEW_NOT_FOUND]: 'Review not found',
  [ErrorCode.NOTIFICATION_NOT_FOUND]: 'Notification not found',
  [ErrorCode.MAINTENANCE_NOT_FOUND]: 'Maintenance request not found',

  // Business Logic
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 'This operation violates business rules',
  [ErrorCode.DUPLICATE_ENTRY]: 'A record with this information already exists',
  [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds for this transaction',
  [ErrorCode.INVALID_STATE_TRANSITION]: 'Invalid state transition',
  [ErrorCode.OPERATION_NOT_ALLOWED]: 'This operation is not allowed',
  [ErrorCode.QUOTA_EXCEEDED]: 'You have exceeded your quota',
  [ErrorCode.ALREADY_EXISTS]: 'This resource already exists',
  [ErrorCode.PROHIBITED_CONTENT]: 'Content contains prohibited language or material',

  // Blockchain & Smart Contracts
  [ErrorCode.BLOCKCHAIN_CONNECTION_FAILED]: 'Failed to connect to blockchain network',
  [ErrorCode.BLOCKCHAIN_TRANSACTION_FAILED]: 'Blockchain transaction failed',
  [ErrorCode.BLOCKCHAIN_INSUFFICIENT_BALANCE]: 'Insufficient balance in wallet',
  [ErrorCode.BLOCKCHAIN_INVALID_ADDRESS]: 'Invalid blockchain address',
  [ErrorCode.BLOCKCHAIN_CONTRACT_ERROR]: 'Smart contract execution error',
  [ErrorCode.BLOCKCHAIN_NETWORK_ERROR]: 'Blockchain network error',
  [ErrorCode.BLOCKCHAIN_TIMEOUT]: 'Blockchain operation timed out',

  // External Services
  [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 'External service is currently unavailable',
  [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: 'External service request timed out',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error',
  [ErrorCode.PAYMENT_PROVIDER_ERROR]: 'Payment provider error',
  [ErrorCode.EMAIL_SERVICE_ERROR]: 'Failed to send email',
  [ErrorCode.STORAGE_SERVICE_ERROR]: 'Storage service error',
  [ErrorCode.KYC_SERVICE_ERROR]: 'KYC verification service error',

  // Network & Infrastructure
  [ErrorCode.NETWORK_ERROR]: 'Network error occurred',
  [ErrorCode.NETWORK_TIMEOUT]: 'Request timed out',
  [ErrorCode.NETWORK_CONNECTION_REFUSED]: 'Connection refused',
  [ErrorCode.MAX_RETRIES_EXCEEDED]: 'Maximum retry attempts exceeded',

  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later',
  [ErrorCode.TOO_MANY_REQUESTS]: 'Too many requests. Please slow down',
  [ErrorCode.SUSPICIOUS_ACTIVITY]: 'Access temporarily blocked due to suspicious activity',

  // Data & Encryption
  [ErrorCode.ENCRYPTION_ERROR]: 'Data encryption failed',
  [ErrorCode.DECRYPTION_ERROR]: 'Data decryption failed',
  [ErrorCode.DATA_INTEGRITY_ERROR]: 'Data integrity check failed',
  [ErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [ErrorCode.CACHE_ERROR]: 'Cache operation failed',

  // Concurrency & Locking
  [ErrorCode.LOCK_NOT_ACQUIRED]: 'Could not acquire lock. Please try again',
  [ErrorCode.LOCK_TIMEOUT]: 'Lock acquisition timed out',
  [ErrorCode.IDEMPOTENCY_KEY_MISSING]: 'Idempotency key is required',
  [ErrorCode.IDEMPOTENCY_CONFLICT]: 'Duplicate request detected',

  // System & Internal
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable',
  [ErrorCode.NOT_IMPLEMENTED]: 'This feature is not yet implemented',
  [ErrorCode.CONFIGURATION_ERROR]: 'System configuration error',
  [ErrorCode.MAINTENANCE_MODE]: 'System is under maintenance',

  // Unknown
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',
};
