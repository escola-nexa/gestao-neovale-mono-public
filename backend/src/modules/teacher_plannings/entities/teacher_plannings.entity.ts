import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_plannings')
export class TeacherPlannings {
  @Column({ name: 'bimester_number', type: 'numeric', nullable: true })
  bimesterNumber: number;

  @Column({ name: 'class_date', type: 'varchar', nullable: true })
  classDate: string;

  @Column({ name: 'class_group_id', type: 'varchar', nullable: true })
  classGroupId: string;

  @Column({ name: 'competencies', type: 'varchar' })
  competencies: string;

  @Column({ name: 'contents', type: 'varchar' })
  contents: string;

  @Column({ name: 'coordinator_feedback', type: 'varchar', nullable: true })
  coordinatorFeedback: string;

  @Column({ name: 'coordinator_signed', type: 'boolean' })
  coordinatorSigned: boolean;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'end_time', type: 'varchar', nullable: true })
  endTime: string;

  @Column({ name: 'evaluation', type: 'varchar' })
  evaluation: string;

  @Column({ name: 'finalization_justification', type: 'varchar', nullable: true })
  finalizationJustification: string;

  @Column({ name: 'finalized_at', type: 'varchar', nullable: true })
  finalizedAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'methodology', type: 'varchar' })
  methodology: string;

  @Column({ name: 'next_steps', type: 'varchar' })
  nextSteps: string;

  @Column({ name: 'objective', type: 'varchar' })
  objective: string;

  @Column({ name: 'occurrence_id', type: 'varchar', nullable: true })
  occurrenceId: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'pre_planning_id', type: 'varchar', nullable: true })
  prePlanningId: string;

  @Column({ name: 'product', type: 'varchar' })
  product: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'professor_signed', type: 'boolean' })
  professorSigned: boolean;

  @Column({ name: 'rejection_reason', type: 'varchar', nullable: true })
  rejectionReason: string;

  @Column({ name: 'resources', type: 'varchar' })
  resources: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'start_time', type: 'varchar', nullable: true })
  startTime: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'subject_id', type: 'varchar', nullable: true })
  subjectId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'week_end_date', type: 'varchar', nullable: true })
  weekEndDate: string;

  @Column({ name: 'week_number', type: 'numeric', nullable: true })
  weekNumber: number;

  @Column({ name: 'week_start_date', type: 'varchar', nullable: true })
  weekStartDate: string;

}
