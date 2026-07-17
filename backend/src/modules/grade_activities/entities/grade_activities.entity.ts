import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('grade_activities')
export class GradeActivities {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'display_order', type: 'numeric' })
  displayOrder: number;

  @Column({ name: 'grade_config_id', type: 'varchar' })
  gradeConfigId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'max_score', type: 'numeric' })
  maxScore: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

}
