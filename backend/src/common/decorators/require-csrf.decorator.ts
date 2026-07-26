import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to explicitly mark endpoints that require CSRF protection.
 * 
 * Note: CSRF middleware is applied globally to all routes via CsrfMiddleware.
 * This decorator serves as documentation and can be used for additional
 * validation or logging purposes.
 * 
 * Usage:
 * @Post('endpoint')
 * @RequireCsrf()
 * async handler() { ... }
 */
export const REQUIRE_CSRF_KEY = 'requireCsrf';
export const RequireCsrf = () => SetMetadata(REQUIRE_CSRF_KEY, true);
