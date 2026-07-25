import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ThreatDetectionService } from '../../modules/security/threat-detection.service';

/** Express Request extended with the user object populated by Passport/JWT. */
interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

/**
 * Middleware that runs every inbound request through the threat detection engine.
 * Non-blocking: failures are logged and the request is allowed through.
 */
@Injectable()
export class ThreatDetectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ThreatDetectionMiddleware.name);

  constructor(private readonly threatDetection: ThreatDetectionService) {}

  async use(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const decision = await this.threatDetection.analyzeRequest(req, userId);

      if (decision === 'block') {
        this.logger.warn(
          `Request blocked by threat detection: ${req.method} ${req.path} from ${req.ip}`,
        );
        // Return 429 / 403 based on type – here we use 429 for rate-based blocks
        _res.status(429).json({
          statusCode: 429,
          message:
            'Too Many Requests – your IP has been temporarily blocked due to suspicious activity',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    } catch (err) {
      // Never block a request due to a monitoring error
      this.logger.error('ThreatDetectionMiddleware error', err);
    }

    next();
  }
}
