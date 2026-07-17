import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_attendance_entries')
export class TeacherAttendanceEntries {
  @Column({ name: 'actual_call_started_at', type: 'varchar', nullable: true })
  actualCallStartedAt: string;

  @Column({ name: 'actual_call_submitted_at', type: 'varchar', nullable: true })
  actualCallSubmittedAt: string;

  @Column({ name: 'adjusted_at', type: 'varchar', nullable: true })
  adjustedAt: string;

  @Column({ name: 'adjusted_by', type: 'varchar', nullable: true })
  adjustedBy: string;

  @Column({ name: 'adjustment_reason', type: 'varchar', nullable: true })
  adjustmentReason: string;

  @Column({ name: 'annual_class_occurrence_id', type: 'varchar', nullable: true })
  annualClassOccurrenceId: string;

  @Column({ name: 'attendance_record_id', type: 'varchar', nullable: true })
  attendanceRecordId: string;

  @Column({ name: 'class_group_id', type: 'varchar', nullable: true })
  classGroupId: string;

  @Column({ name: 'computed_status', type: 'varchar' })
  computedStatus: string;

  @Column({ name: 'confirmed_workload_minutes', type: 'numeric' })
  confirmedWorkloadMinutes: number;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'divergence_reason', type: 'varchar', nullable: true })
  divergenceReason: string;

  @Column({ name: 'early_minutes', type: 'numeric' })
  earlyMinutes: number;

  @Column({ name: 'final_status', type: 'varchar' })
  finalStatus: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_auto_computed', type: 'boolean' })
  isAutoComputed: boolean;

  @Column({ name: 'is_manual_adjusted', type: 'boolean' })
  isManualAdjusted: boolean;

  @Column({ name: 'late_minutes', type: 'numeric' })
  lateMinutes: number;

  @Column({ name: 'manual_status', type: 'varchar', nullable: true })
  manualStatus: string;

  @Column({ name: 'metadata', type: 'jsonb' })
  metadata: any;

  @Column({ name: 'monthly_sheet_id', type: 'varchar' })
  monthlySheetId: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'scheduled_date', type: 'varchar' })
  scheduledDate: string;

  @Column({ name: 'scheduled_end_at', type: 'varchar' })
  scheduledEndAt: string;

  @Column({ name: 'scheduled_start_at', type: 'varchar' })
  scheduledStartAt: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'slot_type', type: 'varchar' })
  slotType: string;

  @Column({ name: 'subject_id', type: 'varchar', nullable: true })
  subjectId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'weekly_teaching_model_id', type: 'varchar', nullable: true })
  weeklyTeachingModelId: string;

  @Column({ name: 'workload_minutes', type: 'numeric' })
  workloadMinutes: number;

}
