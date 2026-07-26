import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIntegritySimulatedFlag1731601400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'integrity_batches',
      new TableColumn({
        name: 'simulated',
        type: 'boolean',
        default: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('integrity_batches', 'simulated');
  }
}
