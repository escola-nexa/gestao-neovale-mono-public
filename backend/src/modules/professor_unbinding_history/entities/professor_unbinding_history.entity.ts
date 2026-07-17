import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('professor_unbinding_history')
export class ProfessorUnbindingHistory {
  @Column({ name: 'binding_id', type: 'varchar', nullable: true })
  bindingId: string;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'reason', type: 'varchar' })
  reason: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'unbound_at', type: 'varchar' })
  unboundAt: string;

  @Column({ name: 'unbound_by', type: 'varchar', nullable: true })
  unboundBy: string;

  @Column({ name: 'workload_afternoon_hours', type: 'numeric', nullable: true })
  workloadAfternoonHours: number;

  @Column({ name: 'workload_morning_hours', type: 'numeric', nullable: true })
  workloadMorningHours: number;

  @Column({ name: 'workload_night_hours', type: 'numeric', nullable: true })
  workloadNightHours: number;

}
