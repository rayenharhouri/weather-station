import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAccountPreferences1731600800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'account_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid' },
          {
            name: 'notifications',
            type: 'jsonb',
            default: `'{"weeklyDigest":true,"rateLimitWarnings":true,"breakingChanges":true,"anchorCompletion":false,"grantUpdates":true}'::jsonb`,
          },
          { name: 'citationFormat', type: 'varchar', length: '16', default: `'apa'` },
          { name: 'autoCite', type: 'boolean', default: true },
          { name: 'activeTokenId', type: 'uuid', isNullable: true },
          { name: 'orcid', type: 'varchar', length: '64', isNullable: true },
          { name: 'affiliation', type: 'varchar', length: '200', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'account_preferences',
      new TableIndex({
        name: 'IDX_account_preferences_userId',
        columnNames: ['userId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('account_preferences', true);
  }
}
