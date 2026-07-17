import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_entries')
export class FinancialEntries {
  @Column({ name: 'account_id', type: 'varchar', nullable: true })
  accountId: string;

  @Column({ name: 'approved_at', type: 'varchar', nullable: true })
  approvedAt: string;

  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  approvedBy: string;

  @Column({ name: 'cancellation_reason', type: 'varchar', nullable: true })
  cancellationReason: string;

  @Column({ name: 'cancelled_at', type: 'varchar', nullable: true })
  cancelledAt: string;

  @Column({ name: 'cancelled_by', type: 'varchar', nullable: true })
  cancelledBy: string;

  @Column({ name: 'category_id', type: 'varchar', nullable: true })
  categoryId: string;

  @Column({ name: 'competence_date', type: 'varchar' })
  competenceDate: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'daily_interest_percent', type: 'numeric', nullable: true })
  dailyInterestPercent: number;

  @Column({ name: 'description', type: 'varchar' })
  description: string;

  @Column({ name: 'document_number', type: 'varchar', nullable: true })
  documentNumber: string;

  @Column({ name: 'due_date', type: 'varchar' })
  dueDate: string;

  @Column({ name: 'early_discount_days', type: 'numeric', nullable: true })
  earlyDiscountDays: number;

  @Column({ name: 'early_discount_percent', type: 'numeric', nullable: true })
  earlyDiscountPercent: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'installments_count', type: 'numeric' })
  installmentsCount: number;

  @Column({ name: 'issue_date', type: 'varchar' })
  issueDate: string;

  @Column({ name: 'kind', type: 'varchar' })
  kind: string;

  @Column({ name: 'late_fee_percent', type: 'numeric', nullable: true })
  lateFeePercent: number;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'party_id', type: 'varchar', nullable: true })
  partyId: string;

  @Column({ name: 'payment_method_id', type: 'varchar', nullable: true })
  paymentMethodId: string;

  @Column({ name: 'recurrence', type: 'jsonb', nullable: true })
  recurrence: any;

  @Column({ name: 'renegotiated_at', type: 'varchar', nullable: true })
  renegotiatedAt: string;

  @Column({ name: 'renegotiated_by', type: 'varchar', nullable: true })
  renegotiatedBy: string;

  @Column({ name: 'renegotiated_from_id', type: 'varchar', nullable: true })
  renegotiatedFromId: string;

  @Column({ name: 'renegotiation_reason', type: 'varchar', nullable: true })
  renegotiationReason: string;

  @Column({ name: 'reversal_reason', type: 'varchar', nullable: true })
  reversalReason: string;

  @Column({ name: 'reversed_at', type: 'varchar', nullable: true })
  reversedAt: string;

  @Column({ name: 'reversed_by', type: 'varchar', nullable: true })
  reversedBy: string;

  @Column({ name: 'source_id', type: 'varchar', nullable: true })
  sourceId: string;

  @Column({ name: 'source_kind', type: 'varchar', nullable: true })
  sourceKind: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'submitted_at', type: 'varchar', nullable: true })
  submittedAt: string;

  @Column({ name: 'submitted_by', type: 'varchar', nullable: true })
  submittedBy: string;

  @Column({ name: 'total_amount', type: 'numeric' })
  totalAmount: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
