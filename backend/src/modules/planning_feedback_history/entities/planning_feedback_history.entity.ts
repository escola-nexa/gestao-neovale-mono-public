import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('planning_feedback_history')
export class PlanningFeedbackHistory {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'coordinator_id', type: 'varchar' })
  coordinatorId: string;

  @Column({ name: 'coordinator_name', type: 'varchar' })
  coordinatorName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'feedback', type: 'varchar' })
  feedback: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'teacher_planning_id', type: 'varchar' })
  teacherPlanningId: string;

}
