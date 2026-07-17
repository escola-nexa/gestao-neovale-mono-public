import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_party_bank_accounts')
export class FinancialPartyBankAccounts {
  @Column({ name: 'account_digit', type: 'varchar', nullable: true })
  accountDigit: string;

  @Column({ name: 'account_number', type: 'varchar', nullable: true })
  accountNumber: string;

  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'agency', type: 'varchar', nullable: true })
  agency: string;

  @Column({ name: 'bank_code', type: 'varchar', nullable: true })
  bankCode: string;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_primary', type: 'boolean' })
  isPrimary: boolean;

  @Column({ name: 'label', type: 'varchar', nullable: true })
  label: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'party_id', type: 'varchar' })
  partyId: string;

  @Column({ name: 'pix_key', type: 'varchar', nullable: true })
  pixKey: string;

  @Column({ name: 'pix_key_type', type: 'varchar', nullable: true })
  pixKeyType: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
