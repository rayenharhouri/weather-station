import 'reflect-metadata';
import 'dotenv/config';
import { MasterDataSource } from '../master-data-source';
import { createTenantDataSource } from '../tenant-data-source.factory';
import { Tenant } from '../../tenancy/entities/tenant.entity';

async function run(): Promise<void> {
  const slugFlag = process.argv
    .slice(2)
    .find((a) => a.startsWith('--slug='))
    ?.split('=')[1];

  await MasterDataSource.initialize();
  const tenantRepo = MasterDataSource.getRepository(Tenant);

  const tenants = slugFlag
    ? await tenantRepo.find({ where: { slug: slugFlag, active: true } })
    : await tenantRepo.find({ where: { active: true }, order: { slug: 'ASC' } });

  if (tenants.length === 0) {
    console.log(
      slugFlag
        ? `No active tenant '${slugFlag}'.`
        : 'No active tenants — nothing to migrate. (Provision one with `npm run tenant:provision`.)',
    );
    await MasterDataSource.destroy();
    return;
  }

  for (const tenant of tenants) {
    console.log(`▸ migrating ${tenant.slug} (${tenant.dbName})…`);
    const ds = createTenantDataSource({
      host: process.env.TENANT_DB_HOST ?? 'localhost',
      port: parseInt(process.env.TENANT_DB_PORT ?? '5432', 10),
      username: process.env.TENANT_DB_USER ?? 'weatherhub',
      password: process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
      database: tenant.dbName,
    });
    await ds.initialize();
    try {
      const ran = await ds.runMigrations();
      console.log(
        ran.length
          ? `  applied ${ran.length} migration${ran.length === 1 ? '' : 's'}: ${ran.map((m) => m.name).join(', ')}`
          : `  already up to date`,
      );
    } finally {
      await ds.destroy();
    }
  }

  await MasterDataSource.destroy();
  console.log(`\n✓ Done.`);
}

run().catch((err) => {
  console.error('\n✗ tenant:migrate failed:', err);
  process.exit(1);
});
