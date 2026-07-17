import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_payment_batch_items')
export class FinancialPaymentBatchItems {
  @Column({ name: 'amount', type: 'numeric' })
  amount: number;

  @Column({ name: 'batch_id', type: 'varchar' })
  batchId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'entry_id', type: 'varchar' })
  entryId: string;

  @Column({ name: 'error_message', type: 'varchar', nullable: true })
  errorMessage: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'installment_id', type: 'varchar' })
  installmentId: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'party_id', type: 'varchar', nullable: true })
  partyId: string;

  @Column({ name: 'payment_id', type: 'varchar', nullable: true })
  paymentId: string;

  @Column({ name: 'pix_key', type: 'varchar', nullable: true })
  pixKey: string;

  @Column({ name: 'pix_key_override', type: 'boolean' })
  pixKeyOverride: boolean;

  @Column({ name: 'pix_key_type', type: 'varchar', nullable: true })
  pixKeyType: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
