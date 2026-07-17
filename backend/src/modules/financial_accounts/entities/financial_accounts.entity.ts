import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_accounts')
export class FinancialAccounts {
  @Column({ name: 'account_digit', type: 'varchar', nullable: true })
  accountDigit: string;

  @Column({ name: 'account_number', type: 'varchar', nullable: true })
  accountNumber: string;

  @Column({ name: 'account_subtype', type: 'varchar', nullable: true })
  accountSubtype: string;

  @Column({ name: 'account_type', type: 'varchar' })
  accountType: string;

  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'agency', type: 'varchar', nullable: true })
  agency: string;

  @Column({ name: 'allows_negative_balance', type: 'boolean' })
  allowsNegativeBalance: boolean;

  @Column({ name: 'bank_code', type: 'varchar', nullable: true })
  bankCode: string;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string;

  @Column({ name: 'branch', type: 'varchar', nullable: true })
  branch: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'currency', type: 'varchar' })
  currency: string;

  @Column({ name: 'current_balance', type: 'numeric' })
  currentBalance: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'initial_balance', type: 'numeric' })
  initialBalance: number;

  @Column({ name: 'initial_balance_date', type: 'varchar', nullable: true })
  initialBalanceDate: string;

  @Column({ name: 'is_default', type: 'boolean' })
  isDefault: boolean;

  @Column({ name: 'is_reconcilable', type: 'boolean' })
  isReconcilable: boolean;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'pix_key', type: 'varchar', nullable: true })
  pixKey: string;

  @Column({ name: 'pix_key_type', type: 'varchar', nullable: true })
  pixKeyType: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
