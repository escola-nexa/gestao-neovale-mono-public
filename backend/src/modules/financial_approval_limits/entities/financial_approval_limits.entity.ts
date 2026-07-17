import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_approval_limits')
export class FinancialApprovalLimits {
  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'currency', type: 'varchar' })
  currency: string;

  @Column({ name: 'delegate_until', type: 'varchar', nullable: true })
  delegateUntil: string;

  @Column({ name: 'delegate_user_id', type: 'varchar', nullable: true })
  delegateUserId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'max_amount', type: 'numeric' })
  maxAmount: number;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'permission_id', type: 'varchar' })
  permissionId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
