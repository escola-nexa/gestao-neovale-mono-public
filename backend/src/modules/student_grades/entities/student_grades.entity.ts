import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('student_grades')
export class StudentGrades {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'grade_activity_id', type: 'varchar' })
  gradeActivityId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'score', type: 'numeric', nullable: true })
  score: number;

  @Column({ name: 'student_id', type: 'varchar' })
  studentId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
