import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'request_logs' })
@Index('IDX_request_logs_timestamp', ['timestamp'])
@Index('IDX_request_logs_token_time', ['tokenId', 'timestamp'])
@Index('IDX_request_logs_path_time', ['path', 'timestamp'])
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tokenId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 8 })
  method!: string;

  @Column({ type: 'varchar', length: 200 })
  path!: string;

  @Column({ type: 'integer' })
  statusCode!: number;

  @Column({ type: 'integer' })
  latencyMs!: number;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;
}
