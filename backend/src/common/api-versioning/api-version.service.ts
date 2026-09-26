import { Injectable, Logger } from '@nestjs/common';
import {
  API_VERSION_CONFIGS,
  API_VERSIONS,
  ApiVersion,
  ApiVersionConfig,
} from './api-version.constants';

@Injectable()
export class ApiVersionService {
  private readonly logger = new Logger(ApiVersionService.name);

  getActiveVersions(): ApiVersionConfig[] {
    return API_VERSION_CONFIGS.filter((c) => c.status === 'active');
  }

  getDeprecatedVersions(): ApiVersionConfig[] {
    return API_VERSION_CONFIGS.filter((c) => c.status === 'deprecated');
  }

  getVersionConfig(version: ApiVersion): ApiVersionConfig | undefined {
    return API_VERSION_CONFIGS.find((c) => c.version === version);
  }

  isVersionActive(version: ApiVersion): boolean {
    const config = this.getVersionConfig(version);
    return config?.status === 'active';
  }

  isVersionDeprecated(version: ApiVersion): boolean {
    const config = this.getVersionConfig(version);
    return config?.status === 'deprecated';
  }

  getLatestVersion(): ApiVersion {
    const active = this.getActiveVersions();
    if (active.length === 0) return API_VERSIONS.V1;
    return active[active.length - 1].version;
  }
}
