import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('webhook_deliveries')
export class WebhookDeliveries {
  @Column({ name: 'attempt', type: 'numeric' })
  attempt: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'delivered_at', type: 'varchar', nullable: true })
  deliveredAt: string;

  @Column({ name: 'duration_ms', type: 'numeric', nullable: true })
  durationMs: number;

  @Column({ name: 'error', type: 'varchar', nullable: true })
  error: string;

  @Column({ name: 'event_id', type: 'varchar' })
  eventId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'next_retry_at', type: 'varchar', nullable: true })
  nextRetryAt: string;

  @Column({ name: 'request_body', type: 'jsonb', nullable: true })
  requestBody: any;

  @Column({ name: 'response_body', type: 'varchar', nullable: true })
  responseBody: string;

  @Column({ name: 'response_status', type: 'numeric', nullable: true })
  responseStatus: number;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'webhook_id', type: 'varchar' })
  webhookId: string;

}
