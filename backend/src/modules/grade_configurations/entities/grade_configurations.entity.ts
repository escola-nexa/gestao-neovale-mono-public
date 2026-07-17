import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('grade_configurations')
export class GradeConfigurations {
  @Column({ name: 'average_type', type: 'varchar' })
  averageType: string;

  @Column({ name: 'bimester_number', type: 'numeric' })
  bimesterNumber: number;

  @Column({ name: 'class_group_id', type: 'varchar' })
  classGroupId: string;

  @Column({ name: 'course_id', type: 'varchar' })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'subject_id', type: 'varchar' })
  subjectId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
