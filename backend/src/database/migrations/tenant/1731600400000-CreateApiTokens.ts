import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateApiTokens1731600400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'api_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid' },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'hashedToken', type: 'varchar', length: '64' },
          { name: 'suffix', type: 'varchar', length: '4' },
          {
            name: 'scope',
            type: 'jsonb',
            default: `'{"stations":[],"metrics":[],"readOnly":true}'::jsonb`,
          },
          { name: 'status', type: 'varchar', length: '16', default: `'active'` },
          { name: 'lastUsedAt', type: 'timestamptz', isNullable: true },
          { name: 'expiresAt', type: 'timestamptz', isNullable: true },
          { name: 'revokedAt', type: 'timestamptz', isNullable: true },
          { name: 'requestsTotal', type: 'integer', default: 0 },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'api_tokens',
      new TableIndex({
        name: 'IDX_api_tokens_hashedToken',
        columnNames: ['hashedToken'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'api_tokens',
      new TableIndex({
        name: 'IDX_api_tokens_userId',
        columnNames: ['userId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('api_tokens', true);
  }
}
