import { SetMetadata } from '@nestjs/common';

export const REQUIRE_EMAIL_KEY = 'require_email_collected';

/**
 * Mark a route as requiring the user to have completed email onboarding.
 * The EmailCollectedGuard enforces this at runtime.
 */
export const RequireEmail = () => SetMetadata(REQUIRE_EMAIL_KEY, true);
