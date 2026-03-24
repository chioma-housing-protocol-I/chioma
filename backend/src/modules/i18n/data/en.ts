export const en = {
  common: {
    ok: 'OK',
    created: 'Created successfully',
    updated: 'Updated successfully',
    deleted: 'Deleted successfully',
    unauthorized: 'Unauthorized',
    forbidden: 'Forbidden',
    notFound: 'Resource not found',
    validationError: 'Validation error',
    internalError: 'Internal server error',
  },
  auth: {
    loginSuccess: 'Login successful',
    registerSuccess: 'Registration successful',
    invalidCredentials: 'Invalid credentials',
    mfaRequired: 'Multi-factor authentication is required',
  },
  payments: {
    initiated: 'Payment initiated',
    completed: 'Payment completed',
    failed: 'Payment failed',
  },
  security: {
    suspiciousActivity: 'Suspicious activity detected',
    accountLocked: 'Account temporarily locked due to failed attempts',
  },
} as const;
