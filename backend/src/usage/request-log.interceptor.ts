import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { TenantService } from '../tenancy/tenant.service';
import { RequestLog } from './entities/request-log.entity';

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLogInterceptor.name);

  constructor(private readonly tenantService: TenantService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const finish = (statusCode: number): void => {
      const token = req.apiToken;
      const tenant = req.tenant;
      const user = req.user as User | undefined;
      if (!token || !tenant || !user) return;

      const route = (req as any).route?.path ?? req.path ?? '';
      const path = `${req.method} ${route}`.trim();
      const latencyMs = Date.now() - startedAt;

      queueMicrotask(() => {
        void this.persist({
          tenantSlug: tenant.slug,
          tokenId: token.id,
          userId: user.id,
          method: req.method,
          path,
          statusCode,
          latencyMs,
        });
      });
    };

    return next.handle().pipe(
      tap({
        next: () => finish(res.statusCode ?? 200),
        error: (err) => {
          const status =
            typeof err === 'object' && err && 'status' in err && typeof err.status === 'number'
              ? err.status
              : 500;
          finish(status);
        },
      }),
    );
  }

  private async persist(payload: {
    tenantSlug: string;
    tokenId: string;
    userId: string;
    method: string;
    path: string;
    statusCode: number;
    latencyMs: number;
  }): Promise<void> {
    try {
      const ds = await this.tenantService.getDataSource(payload.tenantSlug);
      const repo: Repository<RequestLog> = ds.getRepository(RequestLog);
      await repo.insert({
        tokenId: payload.tokenId,
        userId: payload.userId,
        method: payload.method,
        path: payload.path,
        statusCode: payload.statusCode,
        latencyMs: payload.latencyMs,
        timestamp: new Date(),
      });
    } catch (err) {
      this.logger.warn(
        `failed to persist request log for ${payload.tenantSlug}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
