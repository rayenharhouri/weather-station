import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

/**
 * Claims on a device JWT minted by `npm run device:provision`.
 *
 * The device embeds this token in every MQTT message body it publishes;
 * the ingest worker verifies the signature, then asserts that the claims
 * agree with the topic the message arrived on (no impersonation across
 * stations / tenants).
 */
export interface DeviceJwtClaims {
  /** Tenant slug — must match `tenants/{slug}/...` in the topic. */
  tenantSlug: string;
  /** Station UUID — must match `.../stations/{id}/...` in the topic. */
  stationId: string;
  /** Optional hardware id (board serial / MAC). Logged but not enforced. */
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

  /**
   * Mint a token for a device. Called by the `device:provision` CLI; not
   * exposed over HTTP — devices receive their token once at flash time and
   * keep it forever (or until rotated via re-provision).
   */
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

  /**
   * Verify + decode a token. Throws when the signature, exp, or shape is
   * wrong — callers catch and surface a uniform `invalid_device_token`
   * error to keep the rejection reason from leaking.
   */
  verify(token: string): SignedClaims {
    const raw = this.jwt.verify<SignedClaims>(token, { secret: this.secret });
    if (typeof raw?.tenantSlug !== 'string' || typeof raw?.stationId !== 'string') {
      throw new Error('device_jwt_missing_claims');
    }
    return raw;
  }
}
