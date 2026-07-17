import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_installments')
export class FinancialInstallments {
  @Column({ name: 'account_id', type: 'varchar', nullable: true })
  accountId: string;

  @Column({ name: 'amount', type: 'numeric' })
  amount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'discount_amount', type: 'numeric' })
  discountAmount: number;

  @Column({ name: 'due_date', type: 'varchar' })
  dueDate: string;

  @Column({ name: 'entry_id', type: 'varchar' })
  entryId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'installment_number', type: 'numeric' })
  installmentNumber: number;

  @Column({ name: 'interest_amount', type: 'numeric' })
  interestAmount: number;

  @Column({ name: 'late_fee_amount', type: 'numeric' })
  lateFeeAmount: number;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'paid_amount', type: 'numeric' })
  paidAmount: number;

  @Column({ name: 'paid_at', type: 'varchar', nullable: true })
  paidAt: string;

  @Column({ name: 'payment_method_id', type: 'varchar', nullable: true })
  paymentMethodId: string;

  @Column({ name: 'scheduled_for', type: 'varchar', nullable: true })
  scheduledFor: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
