import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_attendance_audit_logs')
export class TeacherAttendanceAuditLogs {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'actor_role', type: 'varchar', nullable: true })
  actorRole: string;

  @Column({ name: 'actor_user_id', type: 'varchar', nullable: true })
  actorUserId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'entry_id', type: 'varchar', nullable: true })
  entryId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'monthly_sheet_id', type: 'varchar', nullable: true })
  monthlySheetId: string;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: any;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: any;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'reason', type: 'varchar', nullable: true })
  reason: string;

}
