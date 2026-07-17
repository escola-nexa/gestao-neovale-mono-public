import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('orientations')
export class Orientations {
  @Column({ name: 'cancellation_reason', type: 'varchar', nullable: true })
  cancellationReason: string;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'evidence_urls', type: 'jsonb', nullable: true })
  evidenceUrls: any;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'occurrence_id', type: 'varchar', nullable: true })
  occurrenceId: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'orientation_type', type: 'varchar' })
  orientationType: string;

  @Column({ name: 'planning_slot_id', type: 'varchar', nullable: true })
  planningSlotId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'scheduled_date', type: 'varchar', nullable: true })
  scheduledDate: string;

  @Column({ name: 'scheduled_end_time', type: 'varchar', nullable: true })
  scheduledEndTime: string;

  @Column({ name: 'scheduled_start_time', type: 'varchar', nullable: true })
  scheduledStartTime: string;

  @Column({ name: 'scheduling_notes', type: 'varchar', nullable: true })
  schedulingNotes: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'signature_photo_url', type: 'varchar', nullable: true })
  signaturePhotoUrl: string;

  @Column({ name: 'signed_at', type: 'varchar', nullable: true })
  signedAt: string;

  @Column({ name: 'signed_by', type: 'varchar', nullable: true })
  signedBy: string;

  @Column({ name: 'status', type: 'varchar', nullable: true })
  status: string;

  @Column({ name: 'subject_id', type: 'varchar', nullable: true })
  subjectId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'video_call_link', type: 'varchar', nullable: true })
  videoCallLink: string;

}
