import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

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
