import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_approval_steps')
export class FinancialApprovalSteps {
  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'approver_permission', type: 'varchar', nullable: true })
  approverPermission: string;

  @Column({ name: 'approver_role', type: 'varchar', nullable: true })
  approverRole: string;

  @Column({ name: 'approver_type', type: 'varchar' })
  approverType: string;

  @Column({ name: 'approver_user_id', type: 'varchar', nullable: true })
  approverUserId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_required', type: 'boolean' })
  isRequired: boolean;

  @Column({ name: 'min_amount', type: 'numeric' })
  minAmount: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'policy_id', type: 'varchar' })
  policyId: string;

  @Column({ name: 'step_order', type: 'numeric' })
  stepOrder: number;

  @Column({ name: 'substitute_until', type: 'varchar', nullable: true })
  substituteUntil: string;

  @Column({ name: 'substitute_user_id', type: 'varchar', nullable: true })
  substituteUserId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
