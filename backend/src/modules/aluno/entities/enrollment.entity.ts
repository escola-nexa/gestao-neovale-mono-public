import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Aluno } from './aluno.entity';

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @Column({ name: 'class_group_id', type: 'uuid' })
  classGroupId: string;

  @Column({ name: 'ano_letivo' })
  anoLetivo: string;

  @Column({ name: 'data_matricula' })
  dataMatricula: string;

  @Column({ name: 'data_encerramento', nullable: true })
  dataEncerramento: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  observacoes: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: 'student_id' })
  student: Aluno;
}
