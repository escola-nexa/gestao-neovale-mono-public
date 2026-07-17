import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_payment_terms')
export class FinancialPaymentTerms {
  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'code', type: 'varchar', nullable: true })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'first_due_days', type: 'numeric' })
  firstDueDays: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'installment_count', type: 'numeric' })
  installmentCount: number;

  @Column({ name: 'interval_days', type: 'numeric' })
  intervalDays: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'percentage_distribution', type: 'numeric' })
  percentageDistribution: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
