import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Tenant } from '../entities/tenant.entity';

export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Tenant => {
    const req = ctx.switchToHttp().getRequest();
    return req.tenant as Tenant;
  },
);
