import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('webhooks')
export class Webhooks {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'event_types', type: 'jsonb' })
  eventTypes: any;

  @Column({ name: 'failure_count', type: 'numeric' })
  failureCount: number;

  @Column({ name: 'headers', type: 'jsonb' })
  headers: any;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;

  @Column({ name: 'last_failure_at', type: 'varchar', nullable: true })
  lastFailureAt: string;

  @Column({ name: 'last_triggered_at', type: 'varchar', nullable: true })
  lastTriggeredAt: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'secret', type: 'varchar' })
  secret: string;

  @Column({ name: 'target_url', type: 'varchar' })
  targetUrl: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
