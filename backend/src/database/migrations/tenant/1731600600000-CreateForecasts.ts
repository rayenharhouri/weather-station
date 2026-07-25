import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateForecasts1731600600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'forecasts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'stationId', type: 'uuid' },
          { name: 'horizon', type: 'varchar', length: '8' },
          { name: 'generatedAt', type: 'timestamptz' },
          { name: 'validFrom', type: 'timestamptz' },
          { name: 'validTo', type: 'timestamptz' },
          { name: 'items', type: 'jsonb' },
          { name: 'confidence', type: 'double precision' },
          { name: 'explanation', type: 'text' },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    // Unique on (stationId, horizon) so we upsert one cached forecast per
    // pair. The service deletes-then-inserts on recompute.
    await queryRunner.createIndex(
      'forecasts',
      new TableIndex({
        name: 'IDX_forecasts_station_horizon',
        columnNames: ['stationId', 'horizon'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('forecasts', true);
  }
}
