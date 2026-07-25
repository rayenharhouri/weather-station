import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { TokenAuthGuard } from './token-auth.guard';
import { ApiToken } from '../../tokens/entities/api-token.entity';
import { Grant } from '../../grants/entities/grant.entity';
import { User } from '../entities/user.entity';

/**
 * Unit tests for the cross-tenant branches added in TokenAuthGuard.
 *
 * The guard depends on a `TenantService` for both `getDataSource` and
 * `listActive`. We mock both with a small fake registry so we can drive
 * every branch — home-tenant hit, cross-tenant hit with active grant,
 * cross-tenant hit without grant, cross-tenant hit on a non-GET method,
 * and the no-cross-tenant-flag case.
 */

function makeToken(overrides: Partial<ApiToken> = {}): ApiToken {
  return {
    id: 't1',
    userId: 'u1',
    name: 't1',
    hashedToken: 'placeholder',
    suffix: 'xxxx',
    scope: { stations: [], metrics: [], readOnly: true },
    status: 'active',
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    requestsTotal: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ApiToken;
}

function makeUser(): User {
  return {
    id: 'u1',
    email: 'u1@example.com',
    name: 'U1',
    role: 'researcher',
  } as User;
}

interface FakeTenantTable {
  tokens: ApiToken[];
  users: User[];
  grants: Grant[];
}

class FakeTenantService {
  constructor(private readonly tables: Record<string, FakeTenantTable>) {}

  async listActive() {
    return Object.keys(this.tables).map((slug) => ({ slug }));
  }

  async getDataSource(slug: string) {
    const t = this.tables[slug];
    if (!t) throw new Error(`unknown tenant ${slug}`);
    return {
      getRepository: (Entity: any) => {
        if (Entity === ApiToken) {
          return {
            findOne: async ({ where }: any) =>
              t.tokens.find((x) => x.hashedToken === where.hashedToken) ?? null,
            save: async (x: ApiToken) => x,
            createQueryBuilder: () => ({
              update: () => ({
                set: () => ({
                  where: () => ({ execute: async () => undefined }),
                }),
              }),
            }),
          };
        }
        if (Entity === User) {
          return {
            findOne: async ({ where }: any) =>
              t.users.find((x) => x.id === where.id) ?? null,
          };
        }
        if (Entity === Grant) {
          return {
            findOne: async ({ where }: any) =>
              t.grants.find(
                (g) =>
                  g.userId === where.userId &&
                  g.targetTenantSlug === where.targetTenantSlug &&
                  g.status === where.status,
              ) ?? null,
          };
        }
        throw new Error(`unsupported entity in fake repo`);
      },
    };
  }
}

function mockCtx(req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
  } as unknown as ExecutionContext;
}

function hashed(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

describe('TokenAuthGuard — cross-tenant branches', () => {
  const PLAINTEXT = 'wh_rsa_test_token_for_specs';
  const HASH = hashed(PLAINTEXT);

  function baseReq(overrides: Partial<any> = {}): any {
    return {
      method: 'GET',
      header: (h: string) => (h.toLowerCase() === 'authorization' ? `Bearer ${PLAINTEXT}` : undefined),
      query: {},
      tenant: { slug: 'esprit' },
      ...overrides,
    };
  }

  it('accepts a home-tenant request when the token lives locally', async () => {
    const tenants: Record<string, FakeTenantTable> = {
      esprit: {
        tokens: [makeToken({ hashedToken: HASH })],
        users: [makeUser()],
        grants: [],
      },
    };
    const guard = new TokenAuthGuard(new FakeTenantService(tenants) as any);
    const req = baseReq();
    await expect(guard.canActivate(mockCtx(req))).resolves.toBe(true);
    expect(req.tokenHomeTenant).toBe('esprit');
    expect(req.user.id).toBe('u1');
  });

  it('accepts a cross-tenant GET when an active grant exists', async () => {
    const tenants: Record<string, FakeTenantTable> = {
      esprit: { tokens: [], users: [], grants: [] },
      enit: {
        tokens: [makeToken({ hashedToken: HASH, scope: { stations: ['*'], metrics: [], readOnly: true, crossTenant: true } })],
        users: [makeUser()],
        grants: [
          {
            id: 'g1',
            userId: 'u1',
            targetTenantSlug: 'esprit',
            scope: 'light · all stations',
            status: 'active',
            grantedAt: new Date(),
            expiresAt: null,
            revokedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Grant,
        ],
      },
    };
    const guard = new TokenAuthGuard(new FakeTenantService(tenants) as any);
    const req = baseReq();
    await expect(guard.canActivate(mockCtx(req))).resolves.toBe(true);
    expect(req.tokenHomeTenant).toBe('enit');
  });

  it('rejects a cross-tenant token that lacks crossTenant: true scope flag', async () => {
    const tenants: Record<string, FakeTenantTable> = {
      esprit: { tokens: [], users: [], grants: [] },
      enit: {
        tokens: [makeToken({ hashedToken: HASH /* crossTenant not set */ })],
        users: [makeUser()],
        grants: [
          {
            id: 'g1',
            userId: 'u1',
            targetTenantSlug: 'esprit',
            scope: '...',
            status: 'active',
            grantedAt: new Date(),
            expiresAt: null,
            revokedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Grant,
        ],
      },
    };
    const guard = new TokenAuthGuard(new FakeTenantService(tenants) as any);
    await expect(guard.canActivate(mockCtx(baseReq()))).rejects.toThrow(
      new UnauthorizedException('cross_tenant_denied'),
    );
  });

  it('rejects a cross-tenant token without an active grant', async () => {
    const tenants: Record<string, FakeTenantTable> = {
      esprit: { tokens: [], users: [], grants: [] },
      enit: {
        tokens: [
          makeToken({
            hashedToken: HASH,
            scope: { stations: ['*'], metrics: [], readOnly: true, crossTenant: true },
          }),
        ],
        users: [makeUser()],
        grants: [], // no grant
      },
    };
    const guard = new TokenAuthGuard(new FakeTenantService(tenants) as any);
    await expect(guard.canActivate(mockCtx(baseReq()))).rejects.toThrow(
      new UnauthorizedException('cross_tenant_not_granted'),
    );
  });

  it('rejects non-GET methods on cross-tenant requests', async () => {
    const tenants: Record<string, FakeTenantTable> = {
      esprit: { tokens: [], users: [], grants: [] },
      enit: {
        tokens: [
          makeToken({
            hashedToken: HASH,
            scope: { stations: ['*'], metrics: [], readOnly: true, crossTenant: true },
          }),
        ],
        users: [makeUser()],
        grants: [
          {
            id: 'g1',
            userId: 'u1',
            targetTenantSlug: 'esprit',
            scope: '...',
            status: 'active',
            grantedAt: new Date(),
            expiresAt: null,
            revokedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Grant,
        ],
      },
    };
    const guard = new TokenAuthGuard(new FakeTenantService(tenants) as any);
    const req = baseReq({ method: 'POST' });
    await expect(guard.canActivate(mockCtx(req))).rejects.toThrow(
      new UnauthorizedException('cross_tenant_write_denied'),
    );
  });

  it('returns invalid_token when no tenant has the hashed token', async () => {
    const tenants: Record<string, FakeTenantTable> = {
      esprit: { tokens: [], users: [], grants: [] },
      enit: { tokens: [], users: [], grants: [] },
    };
    const guard = new TokenAuthGuard(new FakeTenantService(tenants) as any);
    await expect(guard.canActivate(mockCtx(baseReq()))).rejects.toThrow(
      new UnauthorizedException('invalid_token'),
    );
  });
});
