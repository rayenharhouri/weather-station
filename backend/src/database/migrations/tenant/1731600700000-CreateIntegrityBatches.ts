import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateIntegrityBatches1731600700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'integrity_batches',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'stationId', type: 'uuid' },
          { name: 'timeWindowStart', type: 'timestamptz' },
          { name: 'timeWindowEnd', type: 'timestamptz' },
          { name: 'recordCount', type: 'integer' },
          { name: 'merkleRoot', type: 'varchar', length: '64' },
          { name: 'dataHash', type: 'varchar', length: '64' },
          { name: 'hederaTopicId', type: 'varchar', length: '64' },
          { name: 'hederaSequenceNumber', type: 'integer' },
          { name: 'hederaTransactionId', type: 'varchar', length: '128' },
          { name: 'consensusTimestamp', type: 'timestamptz' },
          { name: 'mirrorNodeVerified', type: 'boolean', default: 'false' },
          { name: 'verifiedAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'integrity_batches',
      new TableIndex({
        name: 'IDX_integrity_station_window',
        columnNames: ['stationId', 'timeWindowEnd'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('integrity_batches', true);
  }
}
