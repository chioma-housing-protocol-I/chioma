/**
 * Granular permission system for RBAC
 * Permissions follow the pattern: RESOURCE_ACTION
 */
export enum Permission {
  // User Management
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',
  USER_READ_ALL = 'user:read_all',

  // Property Management
  PROPERTY_READ = 'property:read',
  PROPERTY_CREATE = 'property:create',
  PROPERTY_UPDATE = 'property:update',
  PROPERTY_DELETE = 'property:delete',
  PROPERTY_PUBLISH = 'property:publish',
  PROPERTY_APPROVE = 'property:approve',

  // Agreement Management
  AGREEMENT_READ = 'agreement:read',
  AGREEMENT_CREATE = 'agreement:create',
  AGREEMENT_UPDATE = 'agreement:update',
  AGREEMENT_DELETE = 'agreement:delete',
  AGREEMENT_SIGN = 'agreement:sign',
  AGREEMENT_TERMINATE = 'agreement:terminate',

  // Payment Management
  PAYMENT_READ = 'payment:read',
  PAYMENT_CREATE = 'payment:create',
  PAYMENT_PROCESS = 'payment:process',
  PAYMENT_REFUND = 'payment:refund',
  PAYMENT_READ_ALL = 'payment:read_all',

  // Dispute Management
  DISPUTE_READ = 'dispute:read',
  DISPUTE_CREATE = 'dispute:create',
  DISPUTE_RESOLVE = 'dispute:resolve',
  DISPUTE_ESCALATE = 'dispute:escalate',
  DISPUTE_READ_ALL = 'dispute:read_all',

  // KYC Management
  KYC_READ = 'kyc:read',
  KYC_SUBMIT = 'kyc:submit',
  KYC_REVIEW = 'kyc:review',
  KYC_APPROVE = 'kyc:approve',
  KYC_REJECT = 'kyc:reject',

  // Review Management
  REVIEW_READ = 'review:read',
  REVIEW_CREATE = 'review:create',
  REVIEW_UPDATE = 'review:update',
  REVIEW_DELETE = 'review:delete',
  REVIEW_MODERATE = 'review:moderate',

  // Maintenance Management
  MAINTENANCE_READ = 'maintenance:read',
  MAINTENANCE_CREATE = 'maintenance:create',
  MAINTENANCE_UPDATE = 'maintenance:update',
  MAINTENANCE_ASSIGN = 'maintenance:assign',
  MAINTENANCE_COMPLETE = 'maintenance:complete',

  // Analytics & Reports
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  REPORT_GENERATE = 'report:generate',

  // System Administration
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_AUDIT_LOG = 'system:audit_log',
  SYSTEM_MANAGE_ROLES = 'system:manage_roles',
  SYSTEM_MANAGE_PERMISSIONS = 'system:manage_permissions',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_RESTORE = 'system:restore',

  // Webhook Management
  WEBHOOK_READ = 'webhook:read',
  WEBHOOK_CREATE = 'webhook:create',
  WEBHOOK_UPDATE = 'webhook:update',
  WEBHOOK_DELETE = 'webhook:delete',
  WEBHOOK_TEST = 'webhook:test',

  // Feature Flags
  FEATURE_FLAG_READ = 'feature_flag:read',
  FEATURE_FLAG_UPDATE = 'feature_flag:update',

  // Stellar/Blockchain
  STELLAR_READ = 'stellar:read',
  STELLAR_TRANSACTION = 'stellar:transaction',
  STELLAR_ESCROW = 'stellar:escrow',
  STELLAR_ADMIN = 'stellar:admin',
}

/**
 * Role-based permission mappings
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  user: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.PROPERTY_READ,
    Permission.AGREEMENT_READ,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_CREATE,
    Permission.DISPUTE_READ,
    Permission.DISPUTE_CREATE,
    Permission.KYC_READ,
    Permission.KYC_SUBMIT,
    Permission.REVIEW_READ,
    Permission.REVIEW_CREATE,
    Permission.REVIEW_UPDATE,
    Permission.STELLAR_READ,
    Permission.STELLAR_TRANSACTION,
  ],

  agent: [
    // All user permissions
    ...ROLE_PERMISSIONS?.user || [],
    Permission.PROPERTY_CREATE,
    Permission.PROPERTY_UPDATE,
    Permission.PROPERTY_PUBLISH,
    Permission.AGREEMENT_CREATE,
    Permission.AGREEMENT_UPDATE,
    Permission.MAINTENANCE_READ,
    Permission.MAINTENANCE_CREATE,
    Permission.MAINTENANCE_UPDATE,
    Permission.ANALYTICS_VIEW,
    Permission.USER_READ_ALL,
  ],

  admin: [
    // All agent permissions
    ...ROLE_PERMISSIONS?.agent || [],
    Permission.USER_DELETE,
    Permission.USER_MANAGE_ROLES,
    Permission.PROPERTY_DELETE,
    Permission.PROPERTY_APPROVE,
    Permission.AGREEMENT_DELETE,
    Permission.AGREEMENT_TERMINATE,
    Permission.PAYMENT_PROCESS,
    Permission.PAYMENT_REFUND,
    Permission.PAYMENT_READ_ALL,
    Permission.DISPUTE_RESOLVE,
    Permission.DISPUTE_ESCALATE,
    Permission.DISPUTE_READ_ALL,
    Permission.KYC_REVIEW,
    Permission.KYC_APPROVE,
    Permission.KYC_REJECT,
    Permission.REVIEW_DELETE,
    Permission.REVIEW_MODERATE,
    Permission.MAINTENANCE_ASSIGN,
    Permission.MAINTENANCE_COMPLETE,
    Permission.ANALYTICS_EXPORT,
    Permission.REPORT_GENERATE,
    Permission.WEBHOOK_READ,
    Permission.WEBHOOK_CREATE,
    Permission.WEBHOOK_UPDATE,
    Permission.WEBHOOK_DELETE,
    Permission.WEBHOOK_TEST,
    Permission.FEATURE_FLAG_READ,
    Permission.STELLAR_ESCROW,
    Permission.SYSTEM_AUDIT_LOG,
  ],

  super_admin: [
    // All admin permissions
    ...ROLE_PERMISSIONS?.admin || [],
    Permission.SYSTEM_CONFIG,
    Permission.SYSTEM_MANAGE_ROLES,
    Permission.SYSTEM_MANAGE_PERMISSIONS,
    Permission.SYSTEM_BACKUP,
    Permission.SYSTEM_RESTORE,
    Permission.FEATURE_FLAG_UPDATE,
    Permission.STELLAR_ADMIN,
  ],
};
