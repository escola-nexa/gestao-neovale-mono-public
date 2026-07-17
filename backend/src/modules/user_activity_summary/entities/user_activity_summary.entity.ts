import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_activity_summary')
export class UserActivitySummary {
  @Column({ name: 'access_today', type: 'boolean', nullable: true })
  accessToday: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'first_access_at', type: 'varchar', nullable: true })
  firstAccessAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'last_30_days_count', type: 'numeric', nullable: true })
  last_30DaysCount: number;

  @Column({ name: 'last_7_days_count', type: 'numeric', nullable: true })
  last_7DaysCount: number;

  @Column({ name: 'last_access_at', type: 'varchar', nullable: true })
  lastAccessAt: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'total_access_count', type: 'numeric', nullable: true })
  totalAccessCount: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'user_email', type: 'varchar', nullable: true })
  userEmail: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'user_name', type: 'varchar', nullable: true })
  userName: string;

  @Column({ name: 'user_role', type: 'varchar', nullable: true })
  userRole: string;

}
