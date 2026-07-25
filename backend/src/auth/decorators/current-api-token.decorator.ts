import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { ApiToken } from '../../tokens/entities/api-token.entity';

/**
 * Pull the API token resolved by `TokenAuthGuard` off the current request.
 * Returns `undefined` if the guard never ran (i.e. on JWT-only routes).
 */
export const CurrentApiToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ApiToken | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req.apiToken as ApiToken | undefined;
  },
);
