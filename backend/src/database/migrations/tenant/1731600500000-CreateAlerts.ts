import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAlerts1731600500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'alerts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'stationId', type: 'uuid' },
          { name: 'metric', type: 'varchar', length: '32' },
          { name: 'threshold', type: 'double precision' },
          { name: 'actualValue', type: 'double precision' },
          { name: 'severity', type: 'varchar', length: '16' },
          { name: 'status', type: 'varchar', length: '16', default: `'open'` },
          { name: 'message', type: 'text' },
          { name: 'triggeredAt', type: 'timestamptz' },
          { name: 'acknowledgedAt', type: 'timestamptz', isNullable: true },
          { name: 'acknowledgedBy', type: 'uuid', isNullable: true },
          { name: 'resolvedAt', type: 'timestamptz', isNullable: true },
          { name: 'resolvedBy', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'alerts',
      new TableIndex({
        name: 'IDX_alerts_station_triggered',
        columnNames: ['stationId', 'triggeredAt'],
      }),
    );

    await queryRunner.createIndex(
      'alerts',
      new TableIndex({
        name: 'IDX_alerts_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('alerts', true);
  }
}
