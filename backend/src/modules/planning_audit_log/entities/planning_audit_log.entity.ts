import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('planning_audit_log')
export class PlanningAuditLog {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details: any;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'pre_planning_id', type: 'varchar', nullable: true })
  prePlanningId: string;

  @Column({ name: 'teacher_planning_id', type: 'varchar', nullable: true })
  teacherPlanningId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
