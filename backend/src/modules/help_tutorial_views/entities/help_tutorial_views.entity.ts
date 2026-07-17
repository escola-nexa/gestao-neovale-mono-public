import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('help_tutorial_views')
export class HelpTutorialViews {
  @Column({ name: 'completed', type: 'boolean' })
  completed: boolean;

  @Column({ name: 'first_viewed_at', type: 'varchar' })
  firstViewedAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'last_viewed_at', type: 'varchar' })
  lastViewedAt: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'progress_seconds', type: 'numeric' })
  progressSeconds: number;

  @Column({ name: 'tutorial_id', type: 'varchar' })
  tutorialId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
