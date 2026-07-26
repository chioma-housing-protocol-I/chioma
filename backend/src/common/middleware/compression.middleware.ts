import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CompressionService } from './compression.service';

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  constructor(private readonly compressionService: CompressionService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const acceptEncoding = (req.headers['accept-encoding'] as string) || '';
    const encoding = this.compressionService.negotiateEncoding(acceptEncoding);

    res.setHeader('Vary', 'Accept-Encoding');

    if (encoding === 'identity') {
      next();
      return;
    }

    const originalEnd = res.end.bind(res);

    (res as unknown as { end: typeof originalEnd }).end = (
      chunk?: Buffer | string,
      encodingOrCb?: BufferEncoding | (() => void),
      cb?: () => void,
    ) => {
      if (!chunk) {
        originalEnd(chunk, encodingOrCb as BufferEncoding, cb);
        return;
      }

      const body = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(
            chunk,
            typeof encodingOrCb === 'string' ? encodingOrCb : 'utf8',
          );

      void this.compressionService.compress(body, encoding).then((result) => {
        if (result.compressed) {
          res.setHeader('Content-Encoding', result.encoding);
          res.setHeader('Content-Length', result.data.length);
          originalEnd(result.data, cb);
        } else {
          originalEnd(chunk, encodingOrCb as BufferEncoding, cb);
        }
      });
    };

    next();
  }
}
