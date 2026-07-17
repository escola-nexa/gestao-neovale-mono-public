import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_attendance_monthly_sheets')
export class TeacherAttendanceMonthlySheets {
  @Column({ name: 'absence_workload_minutes', type: 'numeric' })
  absenceWorkloadMinutes: number;

  @Column({ name: 'closed_at', type: 'varchar', nullable: true })
  closedAt: string;

  @Column({ name: 'closed_by', type: 'varchar', nullable: true })
  closedBy: string;

  @Column({ name: 'closure_notes', type: 'varchar', nullable: true })
  closureNotes: string;

  @Column({ name: 'confirmed_class_minutes', type: 'numeric' })
  confirmedClassMinutes: number;

  @Column({ name: 'confirmed_planning_minutes', type: 'numeric' })
  confirmedPlanningMinutes: number;

  @Column({ name: 'confirmed_workload_minutes', type: 'numeric' })
  confirmedWorkloadMinutes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expected_class_minutes', type: 'numeric' })
  expectedClassMinutes: number;

  @Column({ name: 'expected_planning_minutes', type: 'numeric' })
  expectedPlanningMinutes: number;

  @Column({ name: 'expected_workload_minutes', type: 'numeric' })
  expectedWorkloadMinutes: number;

  @Column({ name: 'generated_at', type: 'varchar' })
  generatedAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'last_recalculated_at', type: 'varchar', nullable: true })
  lastRecalculatedAt: string;

  @Column({ name: 'late_minutes_total', type: 'numeric' })
  lateMinutesTotal: number;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_acknowledged_at', type: 'varchar', nullable: true })
  professorAcknowledgedAt: string;

  @Column({ name: 'professor_acknowledged_by', type: 'varchar', nullable: true })
  professorAcknowledgedBy: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'reference_month', type: 'numeric' })
  referenceMonth: number;

  @Column({ name: 'reference_year', type: 'numeric' })
  referenceYear: number;

  @Column({ name: 'reopened_at', type: 'varchar', nullable: true })
  reopenedAt: string;

  @Column({ name: 'reopened_by', type: 'varchar', nullable: true })
  reopenedBy: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'submitted_for_review_at', type: 'varchar', nullable: true })
  submittedForReviewAt: string;

  @Column({ name: 'total_absent_entries', type: 'numeric' })
  totalAbsentEntries: number;

  @Column({ name: 'total_class_entries', type: 'numeric' })
  totalClassEntries: number;

  @Column({ name: 'total_divergent_entries', type: 'numeric' })
  totalDivergentEntries: number;

  @Column({ name: 'total_expected_entries', type: 'numeric' })
  totalExpectedEntries: number;

  @Column({ name: 'total_late_entries', type: 'numeric' })
  totalLateEntries: number;

  @Column({ name: 'total_pending_entries', type: 'numeric' })
  totalPendingEntries: number;

  @Column({ name: 'total_planning_entries', type: 'numeric' })
  totalPlanningEntries: number;

  @Column({ name: 'total_present_entries', type: 'numeric' })
  totalPresentEntries: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
