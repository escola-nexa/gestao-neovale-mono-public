import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_bank_transactions')
export class FinancialBankTransactions {
  @Column({ name: 'account_id', type: 'varchar' })
  accountId: string;

  @Column({ name: 'amount', type: 'numeric' })
  amount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'dedupe_hash', type: 'varchar' })
  dedupeHash: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'direction', type: 'varchar' })
  direction: string;

  @Column({ name: 'document_number', type: 'varchar', nullable: true })
  documentNumber: string;

  @Column({ name: 'fitid', type: 'varchar', nullable: true })
  fitid: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'import_batch_id', type: 'varchar', nullable: true })
  importBatchId: string;

  @Column({ name: 'memo', type: 'varchar', nullable: true })
  memo: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payer_payee_document', type: 'varchar', nullable: true })
  payerPayeeDocument: string;

  @Column({ name: 'payer_payee_name', type: 'varchar', nullable: true })
  payerPayeeName: string;

  @Column({ name: 'posted_at', type: 'varchar', nullable: true })
  postedAt: string;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: any;

  @Column({ name: 'reconciled_amount', type: 'numeric' })
  reconciledAmount: number;

  @Column({ name: 'reference', type: 'varchar', nullable: true })
  reference: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'transaction_date', type: 'varchar' })
  transactionDate: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
