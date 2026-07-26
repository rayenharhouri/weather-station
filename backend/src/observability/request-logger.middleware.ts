import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

declare module 'express' {
  interface Request {
    tid?: string;
  }
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('http');

  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = (req.header('x-request-id') ?? '').trim();
    const tid = incoming.length > 0 ? incoming : randomUUID();
    req.tid = tid;
    res.setHeader('X-Request-Id', tid);

    const startedAt = Date.now();
    res.on('finish', () => {
      const status = res.statusCode;
      const ms = Date.now() - startedAt;
      const line = JSON.stringify({
        tid,
        method: req.method,
        path: maskPath(req.originalUrl ?? req.url ?? ''),
        status,
        ms,
        tenant: req.tenant?.slug ?? null,
        userId: (req.user as { id?: string } | undefined)?.id ?? null,
        tokenId: req.apiToken?.id ?? null,
      });
      if (status >= 500) this.logger.error(line);
      else if (status >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    next();
  }
}

function maskPath(url: string): string {
  const q = url.indexOf('?');
  return q < 0 ? url : url.slice(0, q);
}
