import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Professors } from '../../professors/entities/professors.entity';
import { Courses } from '../../courses/entities/courses.entity';
import { Subjects } from '../../subjects/entities/subjects.entity';

@Entity('professor_school_courses')
export class ProfessorSchoolCourses {
  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @ManyToOne(() => Courses)
  @JoinColumn({ name: 'course_id' })
  course: Courses;

  @Column({ name: 'subject_id', type: 'varchar', nullable: true })
  subjectId: string;

  @ManyToOne(() => Subjects)
  @JoinColumn({ name: 'subject_id' })
  subject: Subjects;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_coordinator', type: 'boolean' })
  isCoordinator: boolean;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @ManyToOne(() => Professors)
  @JoinColumn({ name: 'professor_id' })
  professor: Professors;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'unbind_reason', type: 'varchar', nullable: true })
  unbindReason: string;

  @Column({ name: 'unbound_at', type: 'varchar', nullable: true })
  unboundAt: string;

  @Column({ name: 'unbound_by', type: 'varchar', nullable: true })
  unboundBy: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'workload_afternoon_hours', type: 'numeric' })
  workloadAfternoonHours: number;

  @Column({ name: 'workload_filled_at', type: 'varchar', nullable: true })
  workloadFilledAt: string;

  @Column({ name: 'workload_morning_hours', type: 'numeric' })
  workloadMorningHours: number;

  @Column({ name: 'workload_night_hours', type: 'numeric' })
  workloadNightHours: number;

}
