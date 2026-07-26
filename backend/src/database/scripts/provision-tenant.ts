import 'reflect-metadata';
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import { MasterDataSource } from '../master-data-source';
import { createTenantDataSource } from '../tenant-data-source.factory';
import { Tenant } from '../../tenancy/entities/tenant.entity';
import { User, UserRole } from '../../auth/entities/user.entity';

interface Args {
  slug: string;
  name: string;
  location?: string;
  emailDomain?: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
  adminRole?: UserRole;
}

function parseArgs(argv: string[]): Args {
  const out: Record<string, string> = {};
  for (const tok of argv.slice(2)) {
    const m = tok.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }

  const required = ['slug', 'name', 'admin-email', 'admin-password'];
  const missing = required.filter((k) => !out[k]);
  if (missing.length) {
    console.error(`Missing required arguments: ${missing.join(', ')}`);
    printUsage();
    process.exit(1);
  }

  const slug = out['slug'].trim().toLowerCase();
  if (!/^[a-z0-9-]{2,32}$/.test(slug)) {
    console.error(`Invalid slug '${slug}': must be 2-32 chars, lowercase letters / digits / hyphens.`);
    process.exit(1);
  }

  return {
    slug,
    name: out['name'],
    location: out['location'],
    emailDomain: out['email-domain']?.toLowerCase(),
    adminEmail: out['admin-email'].toLowerCase(),
    adminPassword: out['admin-password'],
    adminName: out['admin-name'] ?? 'Administrator',
    adminRole: (out['admin-role'] as UserRole) ?? 'admin',
  };
}

function printUsage(): void {
  console.error(`
Usage:
  npm run tenant:provision -- \\
    --slug=enit \\
    --name="ENIT Campus" \\
    --location="Tunis" \\
    --email-domain="enit.utm.tn" \\
    --admin-email="chiheb@enit.utm.tn" \\
    --admin-password="changeme" \\
    --admin-name="Chiheb"

Required: --slug --name --admin-email --admin-password
Optional: --location --email-domain --admin-name --admin-role (admin|researcher|viewer)
`);
}

async function ensureDatabaseExists(dbName: string): Promise<'created' | 'exists'> {
  const admin = new Client({
    host: process.env.TENANT_DB_HOST ?? 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT ?? '5432', 10),
    user: process.env.TENANT_DB_USER ?? 'weatherhub',
    password: process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
    database: 'postgres',
  });
  await admin.connect();
  try {
    const existing = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return 'exists';
    }
    await admin.query(`CREATE DATABASE "${dbName}"`);
    return 'created';
  } finally {
    await admin.end();
  }
}

async function ensureTimescaleExtension(dbName: string): Promise<void> {
  const client = new Client({
    host: process.env.TENANT_DB_HOST ?? 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT ?? '5432', 10),
    user: process.env.TENANT_DB_USER ?? 'weatherhub',
    password: process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
    database: dbName,
  });
  await client.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "timescaledb"`);
  } finally {
    await client.end();
  }
}

async function provision(): Promise<void> {
  const args = parseArgs(process.argv);
  const prefix = process.env.TENANT_DB_PREFIX ?? 'tenant_';
  const dbName = `${prefix}${args.slug.replace(/-/g, '_')}`;

  if (!/^[a-z0-9_]+$/.test(dbName)) {
    throw new Error(`Refusing to use unsafe database name: ${dbName}`);
  }

  await MasterDataSource.initialize();
  const tenantRepo = MasterDataSource.getRepository(Tenant);

  const existing = await tenantRepo.findOne({ where: { slug: args.slug } });
  if (existing) {
    console.error(`Tenant '${args.slug}' already exists in master.tenants.`);
    await MasterDataSource.destroy();
    process.exit(1);
  }

  console.log(`▸ ensuring database ${dbName} exists…`);
  const dbStatus = await ensureDatabaseExists(dbName);
  console.log(`  ${dbStatus === 'created' ? 'created' : 'already existed'}`);

  console.log(`▸ ensuring extensions (uuid-ossp, timescaledb)…`);
  await ensureTimescaleExtension(dbName);

  console.log(`▸ running tenant migrations…`);
  const tenantDs = createTenantDataSource({
    host: process.env.TENANT_DB_HOST ?? 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT ?? '5432', 10),
    username: process.env.TENANT_DB_USER ?? 'weatherhub',
    password: process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
    database: dbName,
  });
  await tenantDs.initialize();
  await tenantDs.runMigrations();

  console.log(`▸ seeding admin user ${args.adminEmail}…`);
  const userRepo = tenantDs.getRepository(User);
  const existingUser = await userRepo.findOne({ where: { email: args.adminEmail } });
  if (existingUser) {
    console.log(`  user already exists, skipping seed`);
  } else {
    const passwordHash = await bcrypt.hash(args.adminPassword, 10);
    const user = userRepo.create({
      email: args.adminEmail,
      name: args.adminName ?? 'Administrator',
      role: args.adminRole ?? 'admin',
      passwordHash,
    });
    await userRepo.save(user);
  }
  await tenantDs.destroy();

  console.log(`▸ registering tenant in master.tenants…`);
  const tenant = tenantRepo.create({
    slug: args.slug,
    name: args.name,
    location: args.location ?? null,
    emailDomain: args.emailDomain ?? null,
    dbName,
    active: true,
  });
  await tenantRepo.save(tenant);
  await MasterDataSource.destroy();

  console.log(`\n✓ Tenant '${args.slug}' provisioned.\n`);
  console.log(`  Database: ${dbName}`);
  console.log(`  Admin:    ${args.adminEmail}`);
  console.log(`  Login:    curl -H 'X-Tenant: ${args.slug}' -H 'Content-Type: application/json' \\`);
  console.log(`              -d '{"email":"${args.adminEmail}","password":"…"}' \\`);
  console.log(`              http://localhost:${process.env.PORT ?? 3001}/auth/login`);
}

provision().catch((err) => {
  console.error('\n✗ Provisioning failed:', err);
  process.exit(1);
});
