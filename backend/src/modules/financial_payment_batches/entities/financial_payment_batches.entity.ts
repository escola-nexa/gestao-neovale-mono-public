import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_payment_batches')
export class FinancialPaymentBatches {
  @Column({ name: 'account_id', type: 'varchar', nullable: true })
  accountId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'method_type', type: 'varchar' })
  methodType: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'processed_at', type: 'varchar', nullable: true })
  processedAt: string;

  @Column({ name: 'scheduled_for', type: 'varchar', nullable: true })
  scheduledFor: string;

  @Column({ name: 'sent_at', type: 'varchar', nullable: true })
  sentAt: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
