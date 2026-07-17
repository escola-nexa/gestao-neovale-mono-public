import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_payments')
export class FinancialPayments {
  @Column({ name: 'account_id', type: 'varchar', nullable: true })
  accountId: string;

  @Column({ name: 'amount', type: 'numeric' })
  amount: number;

  @Column({ name: 'batch_item_id', type: 'varchar', nullable: true })
  batchItemId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'discount_amount', type: 'numeric' })
  discountAmount: number;

  @Column({ name: 'entry_id', type: 'varchar' })
  entryId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'installment_id', type: 'varchar' })
  installmentId: string;

  @Column({ name: 'interest_amount', type: 'numeric' })
  interestAmount: number;

  @Column({ name: 'kind', type: 'varchar' })
  kind: string;

  @Column({ name: 'late_fee_amount', type: 'numeric' })
  lateFeeAmount: number;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payment_date', type: 'varchar' })
  paymentDate: string;

  @Column({ name: 'payment_method_id', type: 'varchar', nullable: true })
  paymentMethodId: string;

  @Column({ name: 'reference', type: 'varchar', nullable: true })
  reference: string;

  @Column({ name: 'reversal_of_id', type: 'varchar', nullable: true })
  reversalOfId: string;

  @Column({ name: 'reversal_reason', type: 'varchar', nullable: true })
  reversalReason: string;

}
