import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_substitution_audit_logs')
export class TeacherSubstitutionAuditLogs {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'actor_role', type: 'varchar', nullable: true })
  actorRole: string;

  @Column({ name: 'actor_user_id', type: 'varchar', nullable: true })
  actorUserId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: any;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: any;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'reason', type: 'varchar', nullable: true })
  reason: string;

  @Column({ name: 'substitution_request_id', type: 'varchar', nullable: true })
  substitutionRequestId: string;

}
