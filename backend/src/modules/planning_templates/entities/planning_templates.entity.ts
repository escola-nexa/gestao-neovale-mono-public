import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('planning_templates')
export class PlanningTemplates {
  @Column({ name: 'bimester_number', type: 'numeric' })
  bimesterNumber: number;

  @Column({ name: 'competencies', type: 'varchar' })
  competencies: string;

  @Column({ name: 'contents', type: 'varchar' })
  contents: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'evaluation', type: 'varchar' })
  evaluation: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'methodology', type: 'varchar' })
  methodology: string;

  @Column({ name: 'next_steps', type: 'varchar' })
  nextSteps: string;

  @Column({ name: 'objective', type: 'varchar' })
  objective: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'product', type: 'varchar' })
  product: string;

  @Column({ name: 'resources', type: 'varchar' })
  resources: string;

  @Column({ name: 'subject_id', type: 'varchar' })
  subjectId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'week_number', type: 'numeric' })
  weekNumber: number;

}
