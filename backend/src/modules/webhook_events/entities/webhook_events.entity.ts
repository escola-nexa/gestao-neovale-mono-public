import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('webhook_events')
export class WebhookEvents {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'event_type', type: 'varchar' })
  eventType: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: any;

  @Column({ name: 'processed_at', type: 'varchar', nullable: true })
  processedAt: string;

  @Column({ name: 'source_id', type: 'varchar', nullable: true })
  sourceId: string;

  @Column({ name: 'source_table', type: 'varchar', nullable: true })
  sourceTable: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

}
