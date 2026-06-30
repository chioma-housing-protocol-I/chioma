export {
  useProperties,
  useProperty,
  useInfiniteProperties,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
} from './use-properties';

export {
  usePayments,
  usePayment,
  usePaymentsByAgreement,
  useCreatePayment,
} from './use-payments';

export {
  useNotificationsQuery,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from './use-notifications';

export {
  useTransactions,
  useUserTransactions,
  useTransaction,
} from './use-transactions';

export {
  useAnchorTransactions,
  useAnchorTransaction,
  useAnchorTransactionStats,
} from './use-anchor-transactions';

export {
  useIndexedTransactions,
  useIndexedTransaction,
  useIndexedTransactionStats,
} from './use-indexed-transactions';

export {
  useAdminUsers,
  useSuspendUser,
  useActivateUser,
  useVerifyUser,
} from './use-admin-users';

export {
  usePendingKycVerifications,
  useApproveKycVerification,
  useRejectKycVerification,
} from './use-kyc-verifications';

export {
  useAdminRoles,
  useAdminPermissions,
  useAssignUserRole,
  useUpdateRolePermissions,
} from './use-admin-roles';

export {
  useSecurityEvents,
  useThreats,
  useThreatStats,
  useSecurityIncidents,
  useIncidentMetrics,
  useMarkThreatFalsePositive,
  useResolveSecurityIncident,
} from './use-security-dashboard';

export {
  useAgreements,
  useUserAgreements,
  useAgreement,
  useAgreementFees,
  useCreateAgreement,
  useUpdateAgreement,
  useSignAgreement,
  useTerminateAgreement,
  useRenewAgreement,
  useRecordPayment,
} from './use-agreements';

export type { AgreementSummary, AgreementResponse } from './use-agreements';

export { useLandlordPropertyAnalytics } from './use-property-analytics';

export { useOptimisticUpdate } from './use-optimistic-update';
export type {
  UseOptimisticUpdateOptions,
  UseOptimisticUpdateResult,
} from './use-optimistic-update';

export {
  useCacheInvalidation,
  invalidationDependencies,
} from './use-cache-invalidation';
export type {
  CacheInvalidationConfig,
  UseCacheInvalidationResult,
} from './use-cache-invalidation';
