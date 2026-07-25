import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDatasets1731601100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'datasets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'ownerId', type: 'uuid', isNullable: true },
          { name: 'title', type: 'varchar', length: '200' },
          { name: 'description', type: 'text' },
          { name: 'visibility', type: 'varchar', length: '16' },
          { name: 'metric', type: 'varchar', length: '32' },
          { name: 'stationName', type: 'varchar', length: '200' },
          { name: 'stationId', type: 'uuid', isNullable: true },
          { name: 'windowStart', type: 'timestamptz' },
          { name: 'windowEnd', type: 'timestamptz' },
          { name: 'recordCount', type: 'integer' },
          { name: 'sizeBytes', type: 'bigint' },
          { name: 'formats', type: 'text', isArray: true, default: `'{}'` },
          { name: 'citation', type: 'varchar', length: '200', isNullable: true },
          { name: 'playgroundHref', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'datasets',
      new TableIndex({
        name: 'IDX_datasets_owner',
        columnNames: ['ownerId'],
      }),
    );
    await queryRunner.createIndex(
      'datasets',
      new TableIndex({
        name: 'IDX_datasets_visibility',
        columnNames: ['visibility'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('datasets', true);
  }
}
