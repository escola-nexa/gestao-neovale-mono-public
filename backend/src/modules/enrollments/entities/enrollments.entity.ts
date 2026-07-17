import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('enrollments')
export class Enrollments {
  @Column({ name: 'ano_letivo', type: 'varchar' })
  anoLetivo: string;

  @Column({ name: 'class_group_id', type: 'varchar' })
  classGroupId: string;

  @Column({ name: 'course_id', type: 'varchar' })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'data_encerramento', type: 'varchar', nullable: true })
  dataEncerramento: string;

  @Column({ name: 'data_matricula', type: 'varchar' })
  dataMatricula: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'observacoes', type: 'varchar', nullable: true })
  observacoes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'student_id', type: 'varchar' })
  studentId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
