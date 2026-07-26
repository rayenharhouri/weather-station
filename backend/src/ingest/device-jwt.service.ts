import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface DeviceJwtClaims {
  tenantSlug: string;
  stationId: string;
  deviceId?: string;
}

interface SignedClaims extends DeviceJwtClaims {
  iat: number;
  exp: number;
}

@Injectable()
export class DeviceJwtService {
  private readonly logger = new Logger(DeviceJwtService.name);
  private readonly secret: string;
  private readonly defaultExpiresIn: string;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.secret = config.get<string>('deviceJwt.secret')!;
    this.defaultExpiresIn = config.get<string>('deviceJwt.expiresIn') ?? '365d';
  }

  sign(claims: DeviceJwtClaims, expiresIn?: string): string {
    return this.jwt.sign(
      {
        tenantSlug: claims.tenantSlug,
        stationId: claims.stationId,
        ...(claims.deviceId ? { deviceId: claims.deviceId } : {}),
      },
      {
        secret: this.secret,
        expiresIn: expiresIn ?? this.defaultExpiresIn,
      },
    );
  }

  verify(token: string): SignedClaims {
    const raw = this.jwt.verify<SignedClaims>(token, { secret: this.secret });
    if (typeof raw?.tenantSlug !== 'string' || typeof raw?.stationId !== 'string') {
      throw new Error('device_jwt_missing_claims');
    }
    return raw;
  }
}
