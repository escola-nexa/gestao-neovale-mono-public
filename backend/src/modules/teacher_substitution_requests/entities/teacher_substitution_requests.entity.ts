import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_substitution_requests')
export class TeacherSubstitutionRequests {
  @Column({ name: 'absence_attachments', type: 'jsonb' })
  absenceAttachments: any;

  @Column({ name: 'absence_date', type: 'varchar', nullable: true })
  absenceDate: string;

  @Column({ name: 'absence_dates', type: 'jsonb' })
  absenceDates: any;

  @Column({ name: 'absence_end_at', type: 'varchar', nullable: true })
  absenceEndAt: string;

  @Column({ name: 'absence_reason', type: 'varchar' })
  absenceReason: string;

  @Column({ name: 'absence_start_at', type: 'varchar', nullable: true })
  absenceStartAt: string;

  @Column({ name: 'adjunct_director_name', type: 'varchar', nullable: true })
  adjunctDirectorName: string;

  @Column({ name: 'attended_at', type: 'varchar', nullable: true })
  attendedAt: string;

  @Column({ name: 'attended_by', type: 'varchar', nullable: true })
  attendedBy: string;

  @Column({ name: 'bank_data', type: 'jsonb' })
  bankData: any;

  @Column({ name: 'batch_id', type: 'varchar', nullable: true })
  batchId: string;

  @Column({ name: 'cancel_reason', type: 'varchar', nullable: true })
  cancelReason: string;

  @Column({ name: 'cancelled_at', type: 'varchar', nullable: true })
  cancelledAt: string;

  @Column({ name: 'cancelled_by', type: 'varchar', nullable: true })
  cancelledBy: string;

  @Column({ name: 'chat_channel_id', type: 'varchar', nullable: true })
  chatChannelId: string;

  @Column({ name: 'class_group_id', type: 'varchar', nullable: true })
  classGroupId: string;

  @Column({ name: 'class_group_name_snapshot', type: 'varchar', nullable: true })
  classGroupNameSnapshot: string;

  @Column({ name: 'coordinator_name', type: 'varchar', nullable: true })
  coordinatorName: string;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @Column({ name: 'course_name_snapshot', type: 'varchar', nullable: true })
  courseNameSnapshot: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'director_name', type: 'varchar', nullable: true })
  directorName: string;

  @Column({ name: 'documentation_status', type: 'varchar' })
  documentationStatus: string;

  @Column({ name: 'finalized_at', type: 'varchar', nullable: true })
  finalizedAt: string;

  @Column({ name: 'hour_class_value', type: 'numeric' })
  hourClassValue: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'internal_link', type: 'varchar', nullable: true })
  internalLink: string;

  @Column({ name: 'municipality', type: 'varchar', nullable: true })
  municipality: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_status', type: 'varchar' })
  paymentStatus: string;

  @Column({ name: 'performed_by_name', type: 'varchar', nullable: true })
  performedByName: string;

  @Column({ name: 'reopen_reason', type: 'varchar', nullable: true })
  reopenReason: string;

  @Column({ name: 'reopened_at', type: 'varchar', nullable: true })
  reopenedAt: string;

  @Column({ name: 'reopened_by', type: 'varchar', nullable: true })
  reopenedBy: string;

  @Column({ name: 'requested_by', type: 'varchar' })
  requestedBy: string;

  @Column({ name: 'requested_by_role', type: 'varchar', nullable: true })
  requestedByRole: string;

  @Column({ name: 'return_attachment_url', type: 'varchar', nullable: true })
  returnAttachmentUrl: string;

  @Column({ name: 'return_notes', type: 'varchar', nullable: true })
  returnNotes: string;

  @Column({ name: 'returned_at', type: 'varchar', nullable: true })
  returnedAt: string;

  @Column({ name: 'returned_by', type: 'varchar', nullable: true })
  returnedBy: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'school_name_snapshot', type: 'varchar', nullable: true })
  schoolNameSnapshot: string;

  @Column({ name: 'school_notification_channel', type: 'varchar', nullable: true })
  schoolNotificationChannel: string;

  @Column({ name: 'school_notification_message', type: 'varchar', nullable: true })
  schoolNotificationMessage: string;

  @Column({ name: 'school_notification_proof_url', type: 'varchar', nullable: true })
  schoolNotificationProofUrl: string;

  @Column({ name: 'school_notification_recipient', type: 'varchar', nullable: true })
  schoolNotificationRecipient: string;

  @Column({ name: 'school_notified_at', type: 'varchar', nullable: true })
  schoolNotifiedAt: string;

  @Column({ name: 'school_notified_by', type: 'varchar', nullable: true })
  schoolNotifiedBy: string;

  @Column({ name: 'source_type', type: 'varchar' })
  sourceType: string;

  @Column({ name: 'state', type: 'varchar', nullable: true })
  state: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'subject_id', type: 'varchar', nullable: true })
  subjectId: string;

  @Column({ name: 'subject_name_snapshot', type: 'varchar', nullable: true })
  subjectNameSnapshot: string;

  @Column({ name: 'substitute_confirmed_at', type: 'varchar', nullable: true })
  substituteConfirmedAt: string;

  @Column({ name: 'substitute_confirmed_by', type: 'varchar', nullable: true })
  substituteConfirmedBy: string;

  @Column({ name: 'substitute_email', type: 'varchar', nullable: true })
  substituteEmail: string;

  @Column({ name: 'substitute_pix', type: 'varchar', nullable: true })
  substitutePix: string;

  @Column({ name: 'substitute_professor_cpf', type: 'varchar', nullable: true })
  substituteProfessorCpf: string;

  @Column({ name: 'substitute_professor_id', type: 'varchar', nullable: true })
  substituteProfessorId: string;

  @Column({ name: 'substitute_professor_name', type: 'varchar', nullable: true })
  substituteProfessorName: string;

  @Column({ name: 'substitute_professor_phone', type: 'varchar', nullable: true })
  substituteProfessorPhone: string;

  @Column({ name: 'substitute_professor_rg', type: 'varchar', nullable: true })
  substituteProfessorRg: string;

  @Column({ name: 'substitute_talent_pool_candidate_id', type: 'varchar', nullable: true })
  substituteTalentPoolCandidateId: string;

  @Column({ name: 'substituted_professor_cpf', type: 'varchar', nullable: true })
  substitutedProfessorCpf: string;

  @Column({ name: 'substituted_professor_id', type: 'varchar', nullable: true })
  substitutedProfessorId: string;

  @Column({ name: 'substituted_professor_name', type: 'varchar' })
  substitutedProfessorName: string;

  @Column({ name: 'substituted_professor_registration', type: 'varchar', nullable: true })
  substitutedProfessorRegistration: string;

  @Column({ name: 'substituted_professor_rg', type: 'varchar', nullable: true })
  substitutedProfessorRg: string;

  @Column({ name: 'substitution_code', type: 'varchar' })
  substitutionCode: string;

  @Column({ name: 'ticket_id', type: 'varchar', nullable: true })
  ticketId: string;

  @Column({ name: 'total_amount', type: 'numeric', nullable: true })
  totalAmount: number;

  @Column({ name: 'total_class_hours', type: 'numeric' })
  totalClassHours: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'workflow_phase', type: 'varchar' })
  workflowPhase: string;

}
