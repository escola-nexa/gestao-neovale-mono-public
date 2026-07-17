import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_charge_rules')
export class FinancialChargeRules {
  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'calculation_basis', type: 'varchar' })
  calculationBasis: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'direction', type: 'varchar' })
  direction: string;

  @Column({ name: 'discount_type', type: 'varchar' })
  discountType: string;

  @Column({ name: 'discount_until_days', type: 'numeric' })
  discountUntilDays: number;

  @Column({ name: 'discount_value', type: 'numeric' })
  discountValue: number;

  @Column({ name: 'fine_type', type: 'varchar' })
  fineType: string;

  @Column({ name: 'fine_value', type: 'numeric' })
  fineValue: number;

  @Column({ name: 'grace_period_days', type: 'numeric' })
  gracePeriodDays: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'interest_type', type: 'varchar' })
  interestType: string;

  @Column({ name: 'interest_value', type: 'numeric' })
  interestValue: number;

  @Column({ name: 'is_default', type: 'boolean' })
  isDefault: boolean;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
