import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type StationStatus = 'online' | 'offline' | 'maintenance';

export type SensorType =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'rainfall'
  | 'light'
  | 'airQuality'
  | 'battery'
  | 'signal';

@Entity({ name: 'stations' })
export class Station {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 200 })
  location!: string;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ type: 'varchar', length: 16, default: 'offline' })
  status!: StationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncedAt!: Date | null;

  @Column({ type: 'text', array: true, default: '{}' })
  enabledSensors!: SensorType[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
