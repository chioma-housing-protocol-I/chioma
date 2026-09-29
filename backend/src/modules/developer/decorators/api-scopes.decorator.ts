import { SetMetadata } from '@nestjs/common';
import { ApiScope } from '../constants/api-scopes';

export const API_SCOPES_KEY = 'api_key_required_scopes';

/**
 * Declare the API key scopes required to access a handler or controller.
 *
 * Enforced by `ApiKeyGuard`: the authenticated key's `permissions` must
 * include every listed scope, otherwise the request is rejected with 403.
 */
export const RequireApiScopes = (...scopes: ApiScope[]) =>
  SetMetadata(API_SCOPES_KEY, scopes);
