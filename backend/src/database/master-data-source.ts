import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Tenant } from '../tenancy/entities/tenant.entity';

export const masterDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.MASTER_DB_HOST ?? 'localhost',
  port: parseInt(process.env.MASTER_DB_PORT ?? '5432', 10),
  username: process.env.MASTER_DB_USER ?? 'weatherhub',
  password: process.env.MASTER_DB_PASSWORD ?? 'weatherhub',
  database: process.env.MASTER_DB_NAME ?? 'weatherhub_master',
  entities: [Tenant],
  migrations: [__dirname + '/migrations/master/*{.ts,.js}'],
  migrationsTableName: 'master_migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
};

export const MasterDataSource = new DataSource(masterDataSourceOptions);
