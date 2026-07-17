import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Courses } from '../../courses/entities/courses.entity';

@Entity('course_schools')
export class CourseSchools {
  @Column({ name: 'course_id', type: 'varchar' })
  courseId: string;

  @ManyToOne(() => Courses)
  @JoinColumn({ name: 'course_id' })
  course: Courses;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

}
