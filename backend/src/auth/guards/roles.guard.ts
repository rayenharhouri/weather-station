import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User, UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator to mark a route (or controller) as requiring one of the listed
 * roles. Use with `RolesGuard` mounted in `@UseGuards`. Example:
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')
 *   @Get('admin/grants/incoming') ...
 *
 * Returning `true` short-circuits when the metadata is unset, so applying
 * the guard globally would still pass routes that don't declare roles —
 * but the convention here is to attach the guard per-route.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as User | undefined;
    if (!user) {
      // Should have been caught by an upstream auth guard. Treat as a
      // structural error rather than a permission denial.
      throw new ForbiddenException('not_authenticated');
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException('insufficient_role');
    }
    return true;
  }
}
