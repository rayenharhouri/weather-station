import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

declare module 'express' {
  interface Request {
    /** Correlation id stamped onto every log line for this request. */
    tid?: string;
  }
}

/**
 * Stamps every request with a correlation id (`tid`) and writes one
 * structured line on response close:
 *
 *   {"tid":"...","method":"GET","path":"/v1/readings","status":200,"ms":42,"tenant":"enit","userId":"...","tokenId":"..."}
 *
 * `tid` comes from `X-Request-Id` when present (so cross-service traces can
 * propagate), otherwise a fresh UUID. The same `tid` echoes back on the
 * response as `X-Request-Id` so the client can correlate too.
 *
 * Logs at `log` level for 2xx/3xx, `warn` for 4xx, `error` for 5xx.
 */
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

/**
 * Drop query strings from the logged path so secrets like `?token=` never
 * land in shipped logs. The structured `tokenId` field already captures
 * the (non-secret) identifier when the request authenticated.
 */
function maskPath(url: string): string {
  const q = url.indexOf('?');
  return q < 0 ? url : url.slice(0, q);
}
