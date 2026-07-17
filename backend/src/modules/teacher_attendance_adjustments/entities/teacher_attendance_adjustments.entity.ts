import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_attendance_adjustments')
export class TeacherAttendanceAdjustments {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'entry_id', type: 'varchar' })
  entryId: string;

  @Column({ name: 'evidence_url', type: 'varchar', nullable: true })
  evidenceUrl: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'monthly_sheet_id', type: 'varchar' })
  monthlySheetId: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'previous_status', type: 'varchar', nullable: true })
  previousStatus: string;

  @Column({ name: 'reason', type: 'varchar' })
  reason: string;

  @Column({ name: 'request_type', type: 'varchar' })
  requestType: string;

  @Column({ name: 'requested_by', type: 'varchar' })
  requestedBy: string;

  @Column({ name: 'requested_by_role', type: 'varchar' })
  requestedByRole: string;

  @Column({ name: 'requested_status', type: 'varchar' })
  requestedStatus: string;

  @Column({ name: 'review_notes', type: 'varchar', nullable: true })
  reviewNotes: string;

  @Column({ name: 'reviewed_at', type: 'varchar', nullable: true })
  reviewedAt: string;

  @Column({ name: 'reviewed_by', type: 'varchar', nullable: true })
  reviewedBy: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
