import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_substitution_occurrences')
export class TeacherSubstitutionOccurrences {
  @Column({ name: 'amount', type: 'numeric', nullable: true })
  amount: number;

  @Column({ name: 'annual_class_occurrence_id', type: 'varchar', nullable: true })
  annualClassOccurrenceId: string;

  @Column({ name: 'attendance_record_id', type: 'varchar', nullable: true })
  attendanceRecordId: string;

  @Column({ name: 'class_group_id', type: 'varchar', nullable: true })
  classGroupId: string;

  @Column({ name: 'class_hours', type: 'numeric' })
  classHours: number;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'evidence_notes', type: 'varchar', nullable: true })
  evidenceNotes: string;

  @Column({ name: 'evidence_type', type: 'varchar', nullable: true })
  evidenceType: string;

  @Column({ name: 'execution_status', type: 'varchar' })
  executionStatus: string;

  @Column({ name: 'hour_class_value', type: 'numeric' })
  hourClassValue: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'scheduled_date', type: 'varchar' })
  scheduledDate: string;

  @Column({ name: 'scheduled_end_at', type: 'varchar', nullable: true })
  scheduledEndAt: string;

  @Column({ name: 'scheduled_start_at', type: 'varchar', nullable: true })
  scheduledStartAt: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'subject_id', type: 'varchar', nullable: true })
  subjectId: string;

  @Column({ name: 'substitute_professor_id', type: 'varchar', nullable: true })
  substituteProfessorId: string;

  @Column({ name: 'substituted_professor_id', type: 'varchar', nullable: true })
  substitutedProfessorId: string;

  @Column({ name: 'substitution_request_id', type: 'varchar' })
  substitutionRequestId: string;

  @Column({ name: 'teacher_attendance_entry_id', type: 'varchar', nullable: true })
  teacherAttendanceEntryId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
