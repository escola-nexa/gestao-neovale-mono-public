import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_user_permissions')
export class FinancialUserPermissions {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'granted_at', type: 'varchar' })
  grantedAt: string;

  @Column({ name: 'granted_by', type: 'varchar', nullable: true })
  grantedBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'permission_id', type: 'varchar' })
  permissionId: string;

  @Column({ name: 'revoke_reason', type: 'varchar', nullable: true })
  revokeReason: string;

  @Column({ name: 'revoked_at', type: 'varchar', nullable: true })
  revokedAt: string;

  @Column({ name: 'revoked_by', type: 'varchar', nullable: true })
  revokedBy: string;

  @Column({ name: 'source_template', type: 'varchar', nullable: true })
  sourceTemplate: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
