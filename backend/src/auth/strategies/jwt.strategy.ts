import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TenantService } from '../../tenancy/tenant.service';
import { User } from '../entities/user.entity';

export interface JwtPayload {
  sub: string; // user id
  tid: string; // tenant slug
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly tenantService: TenantService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<User> {
    if (!payload?.sub || !payload?.tid) {
      throw new UnauthorizedException('Malformed token');
    }

    const tenant = await this.tenantService.findBySlug(payload.tid).catch(() => null);
    if (!tenant) {
      throw new UnauthorizedException('Token references an inactive tenant');
    }

    const ds = await this.tenantService.getDataSource(tenant.slug);
    const user = await ds.getRepository(User).findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    req.tenant = tenant;
    return user;
  }
}
