import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'readings' })
@Index('IDX_readings_station_time', ['stationId', 'recordedAt'])
export class WeatherReading {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  id!: string;

  @PrimaryColumn({ type: 'timestamptz' })
  recordedAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  receivedAt!: Date;

  @Column({ type: 'uuid' })
  stationId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  deviceId!: string | null;

  @Column({ type: 'double precision', nullable: true })
  temperatureC!: number | null;

  @Column({ type: 'double precision', nullable: true })
  humidityPct!: number | null;

  @Column({ type: 'double precision', nullable: true })
  pressureHpa!: number | null;

  @Column({ type: 'double precision', nullable: true })
  rainfallMm!: number | null;

  @Column({ type: 'double precision', nullable: true })
  lightLux!: number | null;

  @Column({ type: 'double precision', nullable: true })
  airQualityValue!: number | null;

  @Column({ type: 'double precision', nullable: true })
  batteryVoltage!: number | null;

  @Column({ type: 'integer', nullable: true })
  signalRssi!: number | null;
}
