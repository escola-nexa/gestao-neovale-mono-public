import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_permission_audit_logs')
export class FinancialPermissionAuditLogs {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'actor_user_id', type: 'varchar', nullable: true })
  actorUserId: string;

  @Column({ name: 'amount', type: 'numeric', nullable: true })
  amount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'metadata', type: 'jsonb' })
  metadata: any;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'permission_key', type: 'varchar', nullable: true })
  permissionKey: string;

  @Column({ name: 'reason', type: 'varchar', nullable: true })
  reason: string;

  @Column({ name: 'scope_type', type: 'varchar', nullable: true })
  scopeType: string;

  @Column({ name: 'scope_value', type: 'varchar', nullable: true })
  scopeValue: string;

  @Column({ name: 'target_user_id', type: 'varchar', nullable: true })
  targetUserId: string;

  @Column({ name: 'template_code', type: 'varchar', nullable: true })
  templateCode: string;

}
