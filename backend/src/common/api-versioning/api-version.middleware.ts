import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  API_VERSION_CONFIGS,
  API_VERSION_HEADER,
  API_DEPRECATED_HEADER,
  API_SUNSET_HEADER,
  API_MIGRATION_HINT_HEADER,
  ApiVersionConfig,
} from './api-version.constants';

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiVersionMiddleware.name);
  private readonly versionConfigs: Map<string, ApiVersionConfig>;

  constructor() {
    this.versionConfigs = new Map(
      API_VERSION_CONFIGS.map((config) => [config.version, config]),
    );
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Extract version from URL path: /api/v1/... or /api/v2/...
    const match = req.path.match(/^\/api\/v(\d+)\//);
    if (!match) {
      next();
      return;
    }

    const version = match[1];
    const config = this.versionConfigs.get(version);

    if (!config) {
      next();
      return;
    }

    // Inject version info into response
    res.setHeader(API_VERSION_HEADER, `v${version}`);

    if (config.status === 'deprecated') {
      res.setHeader(API_DEPRECATED_HEADER, 'true');
      if (config.deprecationDate) {
        res.setHeader(API_SUNSET_HEADER, config.sunsetAt?.toISOString() ?? '');
      }
      if (config.migrationHint) {
        res.setHeader(API_MIGRATION_HINT_HEADER, config.migrationHint);
      }
      this.logger.warn(
        `Deprecated API version v${version} called: ${req.method} ${req.path}`,
      );
    }

    next();
  }
}
