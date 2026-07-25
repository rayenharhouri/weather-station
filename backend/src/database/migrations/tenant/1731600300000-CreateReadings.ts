import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReadings1731600300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite PK (id, recordedAt) is required by Timescale — the partition
    // key must appear in any UNIQUE constraint or PRIMARY KEY.
    await queryRunner.query(`
      CREATE TABLE "readings" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "recordedAt" TIMESTAMPTZ NOT NULL,
        "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "stationId" UUID NOT NULL,
        "deviceId" VARCHAR(64),
        "temperatureC" DOUBLE PRECISION,
        "humidityPct" DOUBLE PRECISION,
        "pressureHpa" DOUBLE PRECISION,
        "rainfallMm" DOUBLE PRECISION,
        "lightLux" DOUBLE PRECISION,
        "airQualityValue" DOUBLE PRECISION,
        "batteryVoltage" DOUBLE PRECISION,
        "signalRssi" INTEGER,
        PRIMARY KEY ("id", "recordedAt")
      )
    `);

    await queryRunner.query(
      `SELECT create_hypertable('readings', 'recordedAt', if_not_exists => true)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_readings_station_time" ON "readings" ("stationId", "recordedAt" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "readings"`);
  }
}
