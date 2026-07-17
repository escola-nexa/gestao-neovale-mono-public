import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('onesignal_send_log')
export class OnesignalSendLog {
  @Column({ name: 'channel', type: 'varchar' })
  channel: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'error_message', type: 'varchar', nullable: true })
  errorMessage: string;

  @Column({ name: 'external_ids', type: 'jsonb', nullable: true })
  externalIds: any;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message', type: 'varchar', nullable: true })
  message: string;

  @Column({ name: 'onesignal_id', type: 'varchar', nullable: true })
  onesignalId: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload: any;

  @Column({ name: 'recipients_count', type: 'numeric', nullable: true })
  recipientsCount: number;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'subject', type: 'varchar', nullable: true })
  subject: string;

  @Column({ name: 'target_emails', type: 'jsonb', nullable: true })
  targetEmails: any;

  @Column({ name: 'target_user_ids', type: 'jsonb', nullable: true })
  targetUserIds: any;

  @Column({ name: 'template', type: 'varchar', nullable: true })
  template: string;

  @Column({ name: 'triggered_by', type: 'varchar', nullable: true })
  triggeredBy: string;

}
