import { DataSource } from 'typeorm';
import { TENANT_ENTITIES, TENANT_MIGRATIONS_GLOB } from './tenant-entities';

export interface TenantConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * Build a TypeORM DataSource for a single tenant database. All tenant DBs
 * share the same set of entities and migrations (registered in tenant-entities.ts).
 */
export const createTenantDataSource = (conn: TenantConnectionConfig): DataSource => {
  return new DataSource({
    type: 'postgres',
    host: conn.host,
    port: conn.port,
    username: conn.username,
    password: conn.password,
    database: conn.database,
    entities: TENANT_ENTITIES,
    migrations: [TENANT_MIGRATIONS_GLOB],
    migrationsTableName: 'tenant_migrations',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};
