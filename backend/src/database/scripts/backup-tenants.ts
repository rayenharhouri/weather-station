import 'reflect-metadata';
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MasterDataSource } from '../master-data-source';
import { Tenant } from '../../tenancy/entities/tenant.entity';

interface Args {
  tenant?: string;
  output: string;
}

interface ManifestEntry {
  label: string;
  database: string;
  file: string;
  bytes: number;
  sha256: string;
}

function parseArgs(argv: string[]): Args {
  const out: Record<string, string> = {};
  for (const tok of argv.slice(2)) {
    const m = tok.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return {
    tenant: out['tenant']?.trim().toLowerCase(),
    output: out['output']?.trim() ?? process.env.BACKUP_ROOT ?? '/var/backups/weatherhub',
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const stamp = new Date().toISOString().slice(0, 10);
  const dir = join(args.output, stamp);
  await mkdir(dir, { recursive: true });

  await MasterDataSource.initialize();
  const tenants = await MasterDataSource.getRepository(Tenant).find({
    where: { active: true },
  });
  await MasterDataSource.destroy();

  const manifest: ManifestEntry[] = [];

  const masterDb = process.env.MASTER_DB_NAME ?? 'weatherhub_master';
  manifest.push(await dumpOne(dir, 'master', masterDb));

  const targets = args.tenant
    ? tenants.filter((t) => t.slug === args.tenant)
    : tenants;
  if (args.tenant && targets.length === 0) {
    console.error(`No active tenant '${args.tenant}'.`);
    process.exit(2);
  }
  for (const t of targets) {
    manifest.push(await dumpOne(dir, `tenant-${t.slug}`, t.dbName));
  }

  await writeFile(
    join(dir, 'manifest.json'),
    JSON.stringify({ stamp, generatedAt: new Date().toISOString(), entries: manifest }, null, 2),
  );

  console.log(`\n✓ Backed up ${manifest.length} database(s) to ${dir}`);
  for (const e of manifest) {
    console.log(`  ${e.label.padEnd(24)} ${humanBytes(e.bytes).padStart(8)}  sha256=${e.sha256.slice(0, 12)}…`);
  }
}

async function dumpOne(dir: string, label: string, database: string): Promise<ManifestEntry> {
  const file = join(dir, `${label}.sql.gz`);
  console.log(`▸ dumping ${database} → ${file}`);
  await runPgDump(database, file);
  const stats = await stat(file);
  const sha256 = await hashFile(file);
  return { label, database, file, bytes: stats.size, sha256 };
}

function runPgDump(database: string, outFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PGHOST: process.env.MASTER_DB_HOST ?? process.env.TENANT_DB_HOST ?? 'localhost',
      PGPORT: process.env.MASTER_DB_PORT ?? process.env.TENANT_DB_PORT ?? '5432',
      PGUSER: process.env.MASTER_DB_USER ?? process.env.TENANT_DB_USER ?? 'weatherhub',
      PGPASSWORD: process.env.MASTER_DB_PASSWORD ?? process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
    };
    const dump = spawn('pg_dump', ['--no-owner', '--no-privileges', database], { env });
    const gz = spawn('gzip', ['-c'], { env });
    const out = require('node:fs').createWriteStream(outFile);

    dump.stdout.pipe(gz.stdin);
    gz.stdout.pipe(out);

    let stderr = '';
    dump.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    gz.stderr.on('data', (chunk) => (stderr += chunk.toString()));

    const fail = (label: string, code: number | null) =>
      reject(new Error(`${label} exited with code ${code}: ${stderr.trim()}`));

    dump.on('exit', (code) => {
      if (code !== 0) fail('pg_dump', code);
    });
    gz.on('exit', (code) => {
      if (code !== 0) return fail('gzip', code);
      out.end(() => resolve());
    });
  });
}

function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    const s = createReadStream(path);
    s.on('data', (c) => h.update(c));
    s.on('error', reject);
    s.on('end', () => resolve(h.digest('hex')));
  });
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

main().catch((err) => {
  console.error('\n✗ backup failed:', err);
  process.exit(1);
});
