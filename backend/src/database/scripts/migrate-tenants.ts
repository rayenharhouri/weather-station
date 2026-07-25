import 'reflect-metadata';
import 'dotenv/config';
import { MasterDataSource } from '../master-data-source';
import { createTenantDataSource } from '../tenant-data-source.factory';
import { Tenant } from '../../tenancy/entities/tenant.entity';

/**
 * Apply pending tenant migrations to every active tenant database.
 *
 * Usage:
 *   npm run tenant:migrate            # migrate all active tenants
 *   npm run tenant:migrate -- --slug=enit   # only one tenant
 */
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
    // eslint-disable-next-line no-console
    console.log(
      slugFlag
        ? `No active tenant '${slugFlag}'.`
        : 'No active tenants — nothing to migrate. (Provision one with `npm run tenant:provision`.)',
    );
    await MasterDataSource.destroy();
    // Exit 0 so the Docker `migrate` one-shot doesn't block first boots
    // where the master DB has just been created with no tenants yet.
    return;
  }

  for (const tenant of tenants) {
    // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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
  // eslint-disable-next-line no-console
  console.log(`\n✓ Done.`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\n✗ tenant:migrate failed:', err);
  process.exit(1);
});
