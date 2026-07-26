import 'dotenv/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { join } from 'node:path';

const execFileP = promisify(execFile);

const ENABLED = process.env.RUN_INTEGRATION_TESTS === '1';
const describeIf = ENABLED ? describe : describe.skip;

describeIf('tenant:provision', () => {
  const slug = `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const dbName = `${process.env.TENANT_DB_PREFIX ?? 'tenant_'}${slug}`;

  afterAll(async () => {
    if (!ENABLED) return;
    const admin = adminClient();
    try {
      await admin.connect();
      await admin.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [dbName],
      );
      await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    } finally {
      await admin.end();
    }
  }, 30_000);

  it('creates a usable tenant end-to-end', async () => {
    const scriptPath = join(__dirname, 'provision-tenant.ts');
    const tsNode = join(process.cwd(), 'node_modules', '.bin', 'ts-node');

    const { stdout } = await execFileP(
      tsNode,
      [
        '-r',
        'tsconfig-paths/register',
        scriptPath,
        `--slug=${slug}`,
        `--name=Integration Test ${slug}`,
        `--admin-email=admin-${slug}@example.com`,
        `--admin-password=correct-horse-battery-staple`,
      ],
      { cwd: process.cwd(), env: process.env },
    );
    expect(stdout).toContain(slug);

    const tenantConn = new Client({
      host: process.env.TENANT_DB_HOST ?? 'localhost',
      port: parseInt(process.env.TENANT_DB_PORT ?? '5432', 10),
      user: process.env.TENANT_DB_USER ?? 'weatherhub',
      password: process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
      database: dbName,
    });
    await tenantConn.connect();
    try {
      const rows = await tenantConn.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
      );
      const tables = new Set(rows.rows.map((r) => r.tablename));
      for (const name of ['users', 'stations', 'readings', 'api_tokens', 'alerts']) {
        expect(tables.has(name)).toBe(true);
      }

      const users = await tenantConn.query<{ email: string; passwordHash: string }>(
        `SELECT email, "passwordHash" FROM users WHERE email = $1`,
        [`admin-${slug}@example.com`],
      );
      expect(users.rows.length).toBe(1);
      expect(users.rows[0].passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt
    } finally {
      await tenantConn.end();
    }
  }, 60_000);
});

function adminClient(): Client {
  return new Client({
    host: process.env.TENANT_DB_HOST ?? 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT ?? '5432', 10),
    user: process.env.TENANT_DB_USER ?? 'weatherhub',
    password: process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
    database: 'postgres',
  });
}
