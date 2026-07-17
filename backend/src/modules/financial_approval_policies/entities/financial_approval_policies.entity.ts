import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_approval_policies')
export class FinancialApprovalPolicies {
  @Column({ name: 'account_id', type: 'varchar', nullable: true })
  accountId: string;

  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'category_id', type: 'varchar', nullable: true })
  categoryId: string;

  @Column({ name: 'cost_center_id', type: 'varchar', nullable: true })
  costCenterId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'dual_approver_threshold', type: 'numeric', nullable: true })
  dualApproverThreshold: number;

  @Column({ name: 'enforce_segregation', type: 'boolean' })
  enforceSegregation: boolean;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'max_amount', type: 'numeric', nullable: true })
  maxAmount: number;

  @Column({ name: 'min_amount', type: 'numeric' })
  minAmount: number;

  @Column({ name: 'mode', type: 'varchar' })
  mode: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'operation_type', type: 'varchar' })
  operationType: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'priority', type: 'numeric' })
  priority: number;

  @Column({ name: 'project_id', type: 'varchar', nullable: true })
  projectId: string;

  @Column({ name: 'require_dual_approver', type: 'boolean' })
  requireDualApprover: boolean;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
