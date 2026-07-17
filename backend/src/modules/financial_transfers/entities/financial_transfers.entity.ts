import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_transfers')
export class FinancialTransfers {
  @Column({ name: 'amount', type: 'numeric' })
  amount: number;

  @Column({ name: 'cancel_reason', type: 'varchar', nullable: true })
  cancelReason: string;

  @Column({ name: 'canceled_at', type: 'varchar', nullable: true })
  canceledAt: string;

  @Column({ name: 'canceled_by', type: 'varchar', nullable: true })
  canceledBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'destination_account_id', type: 'varchar' })
  destinationAccountId: string;

  @Column({ name: 'destination_payment_id', type: 'varchar', nullable: true })
  destinationPaymentId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'reference', type: 'varchar', nullable: true })
  reference: string;

  @Column({ name: 'source_account_id', type: 'varchar' })
  sourceAccountId: string;

  @Column({ name: 'source_payment_id', type: 'varchar', nullable: true })
  sourcePaymentId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'transfer_date', type: 'varchar' })
  transferDate: string;

}
