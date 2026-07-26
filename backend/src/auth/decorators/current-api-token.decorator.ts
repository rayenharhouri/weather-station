import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { ApiToken } from '../../tokens/entities/api-token.entity';

export const CurrentApiToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ApiToken | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req.apiToken as ApiToken | undefined;
  },
);
