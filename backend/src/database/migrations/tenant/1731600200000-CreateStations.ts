import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateStations1731600200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'stations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'location', type: 'varchar', length: '200' },
          { name: 'latitude', type: 'double precision', isNullable: true },
          { name: 'longitude', type: 'double precision', isNullable: true },
          { name: 'status', type: 'varchar', length: '16', default: `'offline'` },
          { name: 'lastSyncedAt', type: 'timestamptz', isNullable: true },
          { name: 'enabledSensors', type: 'text', isArray: true, default: `'{}'` },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stations', true);
  }
}
