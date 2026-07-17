import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_party_bank_history')
export class FinancialPartyBankHistory {
  @Column({ name: 'bank_account_id', type: 'varchar', nullable: true })
  bankAccountId: string;

  @Column({ name: 'changed_by', type: 'varchar', nullable: true })
  changedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'new_data', type: 'jsonb', nullable: true })
  newData: any;

  @Column({ name: 'old_data', type: 'jsonb', nullable: true })
  oldData: any;

  @Column({ name: 'operation', type: 'varchar' })
  operation: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'party_id', type: 'varchar' })
  partyId: string;

}
