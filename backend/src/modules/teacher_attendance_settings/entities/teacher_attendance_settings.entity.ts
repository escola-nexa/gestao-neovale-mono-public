import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_attendance_settings')
export class TeacherAttendanceSettings {
  @Column({ name: 'allow_professor_request_adjustment', type: 'boolean' })
  allowProfessorRequestAdjustment: boolean;

  @Column({ name: 'allow_professor_view_own_sheet', type: 'boolean' })
  allowProfessorViewOwnSheet: boolean;

  @Column({ name: 'allowed_early_minutes', type: 'numeric' })
  allowedEarlyMinutes: number;

  @Column({ name: 'allowed_late_minutes', type: 'numeric' })
  allowedLateMinutes: number;

  @Column({ name: 'auto_compute_on_student_call', type: 'boolean' })
  autoComputeOnStudentCall: boolean;

  @Column({ name: 'auto_generate_enabled', type: 'boolean' })
  autoGenerateEnabled: boolean;

  @Column({ name: 'closure_day_limit', type: 'numeric' })
  closureDayLimit: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'max_call_after_class_minutes', type: 'numeric' })
  maxCallAfterClassMinutes: number;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'require_adjustment_reason', type: 'boolean' })
  requireAdjustmentReason: boolean;

  @Column({ name: 'require_professor_acknowledgement', type: 'boolean' })
  requireProfessorAcknowledgement: boolean;

  @Column({ name: 'require_rh_final_closure', type: 'boolean' })
  requireRhFinalClosure: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
