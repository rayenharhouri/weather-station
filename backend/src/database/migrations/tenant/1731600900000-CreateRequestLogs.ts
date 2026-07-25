import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRequestLogs1731600900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'request_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'tokenId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'method', type: 'varchar', length: '8' },
          { name: 'path', type: 'varchar', length: '200' },
          { name: 'statusCode', type: 'integer' },
          { name: 'latencyMs', type: 'integer' },
          { name: 'timestamp', type: 'timestamptz' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'request_logs',
      new TableIndex({
        name: 'IDX_request_logs_timestamp',
        columnNames: ['timestamp'],
      }),
    );
    await queryRunner.createIndex(
      'request_logs',
      new TableIndex({
        name: 'IDX_request_logs_token_time',
        columnNames: ['tokenId', 'timestamp'],
      }),
    );
    await queryRunner.createIndex(
      'request_logs',
      new TableIndex({
        name: 'IDX_request_logs_path_time',
        columnNames: ['path', 'timestamp'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('request_logs', true);
  }
}
