import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('substitution_requests')
export class SubstitutionRequests {
  @Column({ name: 'absence_date', type: 'varchar' })
  absenceDate: string;

  @Column({ name: 'absent_professor_id', type: 'varchar' })
  absentProfessorId: string;

  @Column({ name: 'approved_at', type: 'varchar', nullable: true })
  approvedAt: string;

  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  approvedBy: string;

  @Column({ name: 'cancel_reason', type: 'varchar', nullable: true })
  cancelReason: string;

  @Column({ name: 'canceled_at', type: 'varchar', nullable: true })
  canceledAt: string;

  @Column({ name: 'canceled_by', type: 'varchar', nullable: true })
  canceledBy: string;

  @Column({ name: 'class_group_id', type: 'varchar', nullable: true })
  classGroupId: string;

  @Column({ name: 'code', type: 'varchar', nullable: true })
  code: string;

  @Column({ name: 'confirmed_at', type: 'varchar', nullable: true })
  confirmedAt: string;

  @Column({ name: 'confirmed_by', type: 'varchar', nullable: true })
  confirmedBy: string;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'doc_state', type: 'varchar' })
  docState: string;

  @Column({ name: 'hourly_rate', type: 'numeric' })
  hourlyRate: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payment_state', type: 'varchar' })
  paymentState: string;

  @Column({ name: 'phase', type: 'numeric' })
  phase: number;

  @Column({ name: 'reason', type: 'varchar', nullable: true })
  reason: string;

  @Column({ name: 'requested_by', type: 'varchar' })
  requestedBy: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'subject_id', type: 'varchar', nullable: true })
  subjectId: string;

  @Column({ name: 'substitute_professor_id', type: 'varchar', nullable: true })
  substituteProfessorId: string;

  @Column({ name: 'ticket_id', type: 'varchar', nullable: true })
  ticketId: string;

  @Column({ name: 'total_amount', type: 'numeric', nullable: true })
  totalAmount: number;

  @Column({ name: 'total_class_hours', type: 'numeric' })
  totalClassHours: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
