import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_payment_methods')
export class FinancialPaymentMethods {
  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'code', type: 'varchar', nullable: true })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'default_account_id', type: 'varchar', nullable: true })
  defaultAccountId: string;

  @Column({ name: 'direction', type: 'varchar' })
  direction: string;

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

  @Column({ name: 'requires_bank_account', type: 'boolean' })
  requiresBankAccount: boolean;

  @Column({ name: 'requires_proof', type: 'boolean' })
  requiresProof: boolean;

  @Column({ name: 'requires_reference', type: 'boolean' })
  requiresReference: boolean;

  @Column({ name: 'settlement_days', type: 'numeric' })
  settlementDays: number;

  @Column({ name: 'supports_batch', type: 'boolean' })
  supportsBatch: boolean;

  @Column({ name: 'supports_installments', type: 'boolean' })
  supportsInstallments: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
