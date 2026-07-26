import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

const MINUTE_LIMIT = 60;
const DAILY_LIMIT = 10_000;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;

interface BucketState {
  minuteWindowStart: number;
  minuteCount: number;
  dayWindowStart: number;
  dayCount: number;
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private readonly buckets = new Map<string, BucketState>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const token = req.apiToken;
    if (!token) {
      return next.handle();
    }

    const now = Date.now();
    const bucket = this.touch(token.id, now);

    if (now - bucket.minuteWindowStart >= MINUTE_MS) {
      bucket.minuteWindowStart = now;
      bucket.minuteCount = 0;
    }
    if (now - bucket.dayWindowStart >= DAY_MS) {
      bucket.dayWindowStart = now;
      bucket.dayCount = 0;
    }

    if (bucket.minuteCount >= MINUTE_LIMIT) {
      this.setHeaders(res, bucket, now);
      throw this.over('rate_limit_minute', MINUTE_LIMIT, bucket.minuteWindowStart + MINUTE_MS - now);
    }
    if (bucket.dayCount >= DAILY_LIMIT) {
      this.setHeaders(res, bucket, now);
      throw this.over('rate_limit_day', DAILY_LIMIT, bucket.dayWindowStart + DAY_MS - now);
    }

    bucket.minuteCount += 1;
    bucket.dayCount += 1;
    this.setHeaders(res, bucket, now);

    return next.handle();
  }

  private touch(tokenId: string, now: number): BucketState {
    let bucket = this.buckets.get(tokenId);
    if (!bucket) {
      bucket = {
        minuteWindowStart: now,
        minuteCount: 0,
        dayWindowStart: now,
        dayCount: 0,
      };
      this.buckets.set(tokenId, bucket);
    }
    return bucket;
  }

  private setHeaders(res: Response, bucket: BucketState, now: number): void {
    res.setHeader('X-RateLimit-Limit-Minute', String(MINUTE_LIMIT));
    res.setHeader(
      'X-RateLimit-Remaining-Minute',
      String(Math.max(0, MINUTE_LIMIT - bucket.minuteCount)),
    );
    res.setHeader(
      'X-RateLimit-Reset-Minute',
      String(Math.ceil((bucket.minuteWindowStart + MINUTE_MS) / 1000)),
    );
    res.setHeader('X-RateLimit-Limit-Day', String(DAILY_LIMIT));
    res.setHeader('X-RateLimit-Remaining-Day', String(Math.max(0, DAILY_LIMIT - bucket.dayCount)));
    res.setHeader(
      'X-RateLimit-Reset-Day',
      String(Math.ceil((bucket.dayWindowStart + DAY_MS) / 1000)),
    );
  }

  private over(reason: string, limit: number, msToReset: number): HttpException {
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: reason,
        limit,
        retryAfterMs: Math.max(0, msToReset),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
