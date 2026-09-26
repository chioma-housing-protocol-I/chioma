import { SetMetadata } from '@nestjs/common';

/**
 * Marks an endpoint as exempt from the EmailRequiredGuard.
 *
 * Use this on endpoints that must remain accessible to wallet-only users
 * who have not yet supplied an email address — most importantly the
 * complete-profile endpoint itself, and any purely informational or
 * wallet-management routes.
 *
 * Example:
 *   @Post('complete-profile')
 *   @SkipEmailCheck()
 *   async completeProfile(...) { ... }
 */
export const SKIP_EMAIL_CHECK_KEY = 'skipEmailCheck';
export const SkipEmailCheck = () => SetMetadata(SKIP_EMAIL_CHECK_KEY, true);
