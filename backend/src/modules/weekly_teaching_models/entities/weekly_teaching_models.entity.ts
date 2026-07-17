import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('weekly_teaching_models')
export class WeeklyTeachingModels {
  @Column({ name: 'class_group_id', type: 'varchar', nullable: true })
  classGroupId: string;

  @Column({ name: 'class_mode', type: 'varchar' })
  classMode: string;

  @Column({ name: 'course_id', type: 'varchar' })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'end_time', type: 'varchar' })
  endTime: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'observation', type: 'varchar', nullable: true })
  observation: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar', nullable: true })
  professorId: string;

  @Column({ name: 'schedule_type', type: 'varchar' })
  scheduleType: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'school_time_slot_id', type: 'varchar', nullable: true })
  schoolTimeSlotId: string;

  @Column({ name: 'start_time', type: 'varchar' })
  startTime: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'subject_id', type: 'varchar', nullable: true })
  subjectId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'weekday', type: 'varchar' })
  weekday: string;

}
