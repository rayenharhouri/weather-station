import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTenants1731600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: 'tenants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '64',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'location',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'emailDomain',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'dbName',
            type: 'varchar',
            length: '128',
          },
          {
            name: 'hederaAccountId',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'hederaTopicId',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tenants_emailDomain" ON "tenants" ("emailDomain") WHERE "emailDomain" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tenants', true);
  }
}
