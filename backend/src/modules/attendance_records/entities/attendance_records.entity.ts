import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('attendance_records')
export class AttendanceRecords {
  @Column({ name: 'call_created_by', type: 'varchar', nullable: true })
  callCreatedBy: string;

  @Column({ name: 'call_started_at', type: 'varchar', nullable: true })
  callStartedAt: string;

  @Column({ name: 'call_submitted_at', type: 'varchar', nullable: true })
  callSubmittedAt: string;

  @Column({ name: 'class_group_id', type: 'varchar' })
  classGroupId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'occurrence_date', type: 'varchar' })
  occurrenceDate: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'start_time', type: 'varchar', nullable: true })
  startTime: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'student_id', type: 'varchar' })
  studentId: string;

  @Column({ name: 'subject_id', type: 'varchar' })
  subjectId: string;

  @Column({ name: 'teacher_attendance_entry_id', type: 'varchar', nullable: true })
  teacherAttendanceEntryId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
