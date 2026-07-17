import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pre_plannings')
export class PrePlannings {
  @Column({ name: 'bimester_number', type: 'numeric', nullable: true })
  bimesterNumber: number;

  @Column({ name: 'calculated_total_classes', type: 'numeric', nullable: true })
  calculatedTotalClasses: number;

  @Column({ name: 'calculated_total_hours', type: 'numeric', nullable: true })
  calculatedTotalHours: number;

  @Column({ name: 'class_date', type: 'varchar', nullable: true })
  classDate: string;

  @Column({ name: 'class_days_count', type: 'numeric', nullable: true })
  classDaysCount: number;

  @Column({ name: 'class_days_detail', type: 'jsonb', nullable: true })
  classDaysDetail: any;

  @Column({ name: 'class_group_id', type: 'varchar', nullable: true })
  classGroupId: string;

  @Column({ name: 'competencies', type: 'varchar' })
  competencies: string;

  @Column({ name: 'contents', type: 'varchar' })
  contents: string;

  @Column({ name: 'course_id', type: 'varchar' })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'end_time', type: 'varchar', nullable: true })
  endTime: string;

  @Column({ name: 'evaluation', type: 'varchar' })
  evaluation: string;

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

  @Column({ name: 'planning_type', type: 'varchar' })
  planningType: string;

  @Column({ name: 'product', type: 'varchar' })
  product: string;

  @Column({ name: 'professor_id', type: 'varchar', nullable: true })
  professorId: string;

  @Column({ name: 'reference_month', type: 'numeric', nullable: true })
  referenceMonth: number;

  @Column({ name: 'reference_year', type: 'numeric' })
  referenceYear: number;

  @Column({ name: 'resources', type: 'varchar' })
  resources: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'start_time', type: 'varchar', nullable: true })
  startTime: string;

  @Column({ name: 'status', type: 'varchar', nullable: true })
  status: string;

  @Column({ name: 'subject_id', type: 'varchar' })
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
