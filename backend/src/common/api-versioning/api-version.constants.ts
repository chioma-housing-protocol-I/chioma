export const API_VERSIONS = {
  V1: '1',
  V2: '2',
} as const;

export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];

export interface ApiVersionConfig {
  version: ApiVersion;
  status: 'active' | 'deprecated' | 'sunset';
  sunsetAt?: Date;
  deprecationDate?: Date;
  migrationHint?: string;
  changelogUrl?: string;
}

export const API_VERSION_CONFIGS: ApiVersionConfig[] = [
  {
    version: '1',
    status: 'active',
    changelogUrl: '/api/docs',
  },
];

export const DEFAULT_API_VERSION: ApiVersion = '1';

export const API_VERSION_HEADER = 'X-API-Version';
export const API_DEPRECATED_HEADER = 'X-API-Deprecated';
export const API_SUNSET_HEADER = 'X-API-Sunset';
export const API_MIGRATION_HINT_HEADER = 'X-API-Migration-Hint';
