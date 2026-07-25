import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateExports1731601200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'exports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid' },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'metric', type: 'varchar', length: '32' },
          { name: 'stationId', type: 'uuid', isNullable: true },
          { name: 'stationName', type: 'varchar', length: '200' },
          { name: 'windowStart', type: 'timestamptz' },
          { name: 'windowEnd', type: 'timestamptz' },
          { name: 'format', type: 'varchar', length: '16' },
          { name: 'status', type: 'varchar', length: '16', default: `'queued'` },
          { name: 'requestedAt', type: 'timestamptz' },
          { name: 'startedAt', type: 'timestamptz', isNullable: true },
          { name: 'finishedAt', type: 'timestamptz', isNullable: true },
          { name: 'expiresAt', type: 'timestamptz', isNullable: true },
          { name: 'recordCount', type: 'integer', isNullable: true },
          { name: 'sizeBytes', type: 'bigint', isNullable: true },
          { name: 'progressPct', type: 'real', default: 0 },
          { name: 'errorMessage', type: 'text', isNullable: true },
          { name: 'filePath', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'exports',
      new TableIndex({
        name: 'IDX_exports_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'exports',
      new TableIndex({
        name: 'IDX_exports_user_requested',
        columnNames: ['userId', 'requestedAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('exports', true);
  }
}
