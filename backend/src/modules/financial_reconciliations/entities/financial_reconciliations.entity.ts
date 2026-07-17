import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_reconciliations')
export class FinancialReconciliations {
  @Column({ name: 'amount', type: 'numeric' })
  amount: number;

  @Column({ name: 'bank_transaction_id', type: 'varchar' })
  bankTransactionId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'installment_id', type: 'varchar', nullable: true })
  installmentId: string;

  @Column({ name: 'match_method', type: 'varchar' })
  matchMethod: string;

  @Column({ name: 'match_score', type: 'numeric', nullable: true })
  matchScore: number;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payment_id', type: 'varchar', nullable: true })
  paymentId: string;

  @Column({ name: 'reconciled_at', type: 'varchar' })
  reconciledAt: string;

  @Column({ name: 'reconciled_by', type: 'varchar', nullable: true })
  reconciledBy: string;

  @Column({ name: 'undo_reason', type: 'varchar', nullable: true })
  undoReason: string;

  @Column({ name: 'undone_at', type: 'varchar', nullable: true })
  undoneAt: string;

  @Column({ name: 'undone_by', type: 'varchar', nullable: true })
  undoneBy: string;

}
