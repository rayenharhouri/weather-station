import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Adds two jsonb columns to `account_preferences` so the operations
 * `/settings` page has somewhere to land:
 *
 *   - `thresholds`        — operator-tunable alert thresholds
 *   - `opsNotifications`  — alert email + daily/weekly report toggles
 *
 * Defaults are baked in so rows existing before this migration get a
 * sensible starting point without a backfill pass.
 */
export class AddOperationsPrefs1731601300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('account_preferences', [
      new TableColumn({
        name: 'thresholds',
        type: 'jsonb',
        default: `'{"tempCriticalC":35,"humidityWarnPct":80,"pressureLowHpa":990,"rainfallHourlyMm":10}'::jsonb`,
      }),
      new TableColumn({
        name: 'opsNotifications',
        type: 'jsonb',
        default: `'{"alertsEmail":true,"dailyReport":false,"weeklyReport":true}'::jsonb`,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('account_preferences', [
      'thresholds',
      'opsNotifications',
    ]);
  }
}
