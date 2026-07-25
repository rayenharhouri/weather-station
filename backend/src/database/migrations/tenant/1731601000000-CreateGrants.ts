import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGrants1731601000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'grants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid' },
          { name: 'targetTenantSlug', type: 'varchar', length: '64' },
          { name: 'scope', type: 'text' },
          { name: 'status', type: 'varchar', length: '16', default: `'pending'` },
          { name: 'grantedAt', type: 'timestamptz', isNullable: true },
          { name: 'expiresAt', type: 'timestamptz', isNullable: true },
          { name: 'revokedAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'grants',
      new TableIndex({
        name: 'IDX_grants_user_status',
        columnNames: ['userId', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('grants', true);
  }
}
