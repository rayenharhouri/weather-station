import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantService } from '../tenancy/tenant.service';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { AuthResponse, PublicUser } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Resolve the tenant for a login attempt.
   *
   * Order:
   *   1. The request's resolved tenant (set by TenantContextMiddleware from
   *      subdomain or `X-Tenant` header).
   *   2. The email domain — looked up in master.tenants.emailDomain.
   *
   * Throws if neither source produces a tenant — login cannot proceed without
   * knowing which DB to query.
   */
  private async resolveTenantForLogin(
    requestTenant: Tenant | undefined,
    email: string,
  ): Promise<Tenant> {
    if (requestTenant) return requestTenant;

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      throw new BadRequestException('Email is malformed');
    }
    const tenant = await this.tenantService.findByEmailDomain(domain);
    if (!tenant) {
      throw new BadRequestException(
        'Cannot determine tenant. Send `X-Tenant: <slug>` header or use a recognized email domain.',
      );
    }
    return tenant;
  }

  async login(dto: LoginDto, requestTenant?: Tenant): Promise<AuthResponse> {
    const tenant = await this.resolveTenantForLogin(requestTenant, dto.email);
    const ds = await this.tenantService.getDataSource(tenant.slug);
    const userRepo = ds.getRepository(User);

    const user = await userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      // Same response shape as bad password — don't leak which users exist.
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await userRepo.save(user);

    const payload: JwtPayload = {
      sub: user.id,
      tid: tenant.slug,
      email: user.email,
    };
    const token = await this.jwt.signAsync(payload);
    const expiresIn = this.parseExpiresInSeconds(
      this.config.get<string>('jwt.expiresIn') ?? '24h',
    );

    return {
      user: this.toPublic(user),
      token,
      expiresIn,
    };
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private parseExpiresInSeconds(value: string): number {
    const match = value.match(/^(\d+)([smhd])?$/);
    if (!match) return 86400;
    const n = parseInt(match[1], 10);
    const unit = match[2] ?? 's';
    switch (unit) {
      case 's': return n;
      case 'm': return n * 60;
      case 'h': return n * 3600;
      case 'd': return n * 86400;
      default:  return n;
    }
  }
}
