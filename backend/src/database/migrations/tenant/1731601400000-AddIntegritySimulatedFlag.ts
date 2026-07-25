import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Adds `simulated` to `integrity_batches` so the UI can tell a genuine
 * Hedera HCS submit apart from the local deterministic stub instead of
 * conflating both under `mirrorNodeVerified`.
 *
 * Default `true` so every pre-existing row (all of which came from the
 * stub, since the live client didn't exist yet) is correctly labelled
 * without a backfill pass.
 */
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
