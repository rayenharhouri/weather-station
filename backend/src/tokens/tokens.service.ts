import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { TenantService } from '../tenancy/tenant.service';
import { ApiToken, ApiTokenScope } from './entities/api-token.entity';
import { CreateTokenDto } from './dto/create-token.dto';

export interface CreatedTokenResult {
  token: ApiToken;
  /** Returned to the caller exactly once; never persisted in plaintext. */
  plaintext: string;
}

const TOKEN_ALPHABET =
  'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class TokensService {
  constructor(private readonly tenantService: TenantService) {}

  private async repo(tenantSlug: string): Promise<Repository<ApiToken>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(ApiToken);
  }

  async listForUser(tenantSlug: string, userId: string): Promise<ApiToken[]> {
    const repo = await this.repo(tenantSlug);
    return repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    tenantSlug: string,
    userId: string,
    dto: CreateTokenDto,
  ): Promise<CreatedTokenResult> {
    const repo = await this.repo(tenantSlug);
    const plaintext = generatePlaintext();
    const scope: ApiTokenScope = {
      stations: dto.scope?.stations ?? [],
      metrics: dto.scope?.metrics ?? [],
      readOnly: dto.scope?.readOnly ?? true,
      ...(dto.scope?.crossTenant ? { crossTenant: true } : {}),
    };
    const token = repo.create({
      userId,
      name: dto.name,
      hashedToken: sha256(plaintext),
      suffix: plaintext.slice(-4),
      scope,
      status: 'active',
      expiresAt: expiryToDate(dto.expiry ?? '90d'),
    });
    const saved = await repo.save(token);
    return { token: saved, plaintext };
  }

  async revoke(tenantSlug: string, userId: string, tokenId: string): Promise<ApiToken> {
    const repo = await this.repo(tenantSlug);
    const token = await repo.findOne({ where: { id: tokenId } });
    if (!token) throw new NotFoundException(`Token '${tokenId}' not found`);
    if (token.userId !== userId) {
      // Don't leak existence to other users.
      throw new ForbiddenException(`Token '${tokenId}' not found`);
    }
    if (token.status !== 'active') return token;
    token.status = 'revoked';
    token.revokedAt = new Date();
    return repo.save(token);
  }

  async rotate(
    tenantSlug: string,
    userId: string,
    tokenId: string,
  ): Promise<CreatedTokenResult> {
    const repo = await this.repo(tenantSlug);
    const existing = await repo.findOne({ where: { id: tokenId } });
    if (!existing) throw new NotFoundException(`Token '${tokenId}' not found`);
    if (existing.userId !== userId) {
      throw new ForbiddenException(`Token '${tokenId}' not found`);
    }
    // Mark old as revoked atomically before issuing the replacement.
    existing.status = 'revoked';
    existing.revokedAt = new Date();
    await repo.save(existing);

    return this.create(tenantSlug, userId, {
      name: `${existing.name} (rotated)`,
      scope: existing.scope,
      // Preserve original lifetime: pick the shortest preset that's >= remaining time.
      expiry: pickExpiryPreset(existing.expiresAt),
    });
  }
}

function generatePlaintext(): string {
  // 32 chars from a curated alphabet (no easily-confused glyphs like 0/O/1/l/I).
  const buf = randomBytes(32);
  let out = 'wh_rsa_';
  for (let i = 0; i < 32; i++) {
    out += TOKEN_ALPHABET[buf[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function expiryToDate(
  expiry: '30d' | '90d' | '365d' | 'never',
): Date | null {
  if (expiry === 'never') return null;
  const days = expiry === '30d' ? 30 : expiry === '90d' ? 90 : 365;
  return new Date(Date.now() + days * 86_400_000);
}

function pickExpiryPreset(expiresAt: Date | null): '30d' | '90d' | '365d' | 'never' {
  if (!expiresAt) return 'never';
  const daysLeft = (expiresAt.getTime() - Date.now()) / 86_400_000;
  if (daysLeft > 180) return '365d';
  if (daysLeft > 60) return '90d';
  return '30d';
}
